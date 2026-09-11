// Gửi BIÊN BẢN HỌP qua email cho các thành viên cuộc họp (CFO 11/09).
import { getMeeting, listParticipants, listActionItems, MEETING_TYPE_LABEL } from './meetings';
import { sendMail, mailBaseUrl } from './mail';
import { sanitizeRichHtml, linkifyHtml } from './sanitizeHtml';
import { brandedEmail, emailSection } from './mail-layout';
import { logAudit } from './audit';

function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}
function fmtDT(iso: string | null): string {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'full', timeStyle: 'short' }); } catch { return iso; }
}
function fmtD(iso: string | null): string {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }); } catch { return iso; }
}
// Cho email dễ đọc: đổi token checkbox [x]/[ ] thành ký hiệu.
function cbSymbols(html: string): string {
  return html.replace(/\[\s*[xX]\s*\]/g, '☑').replace(/\[\s*\]/g, '☐');
}

const TASK_STATUS_VI: Record<string, string> = { todo: 'Chưa làm', in_progress: 'Đang làm', blocked: 'Vướng', done: 'Xong', canceled: 'Huỷ' };

type MailMeeting = Awaited<ReturnType<typeof getMeeting>>;

function buildHtml(m: NonNullable<MailMeeting>, actions: Awaited<ReturnType<typeof listActionItems>>, note: string, senderName: string): string {
  const base = mailBaseUrl();
  const url = `${base}/meetings/${m.id}`;
  const metaRows: [string, string][] = [];
  metaRows.push(['Loại cuộc họp', MEETING_TYPE_LABEL[m.type] || m.type]);
  if (m.meeting_at) metaRows.push(['Thời gian', fmtDT(m.meeting_at)]);
  if (m.location) metaRows.push(['Địa điểm', esc(m.location)]);
  if (m.owner_name || m.owner_email) metaRows.push(['Chủ trì', esc(m.owner_name || m.owner_email || '')]);

  const meta = metaRows.map(([k, v]) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#64748b;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:4px 0;color:#161A21">${v}</td></tr>`,
  ).join('');

  // Bỏ thẻ nội bộ #Tn (đánh dấu việc) cho email sạch; đổi token checkbox → ký hiệu.
  const minutesHtml = m.minutes ? cbSymbols(linkifyHtml(sanitizeRichHtml(m.minutes))).replace(/#T\d+\b/g, '') : '';
  const decisionsHtml = m.decisions ? linkifyHtml(sanitizeRichHtml(m.decisions)) : '';

  const th = 'padding:7px 10px;border-bottom:2px solid #e2e8f0';
  const td = 'padding:7px 10px;border-bottom:1px solid #eee';
  const actionRows = actions.map((a) =>
    `<tr>
      <td style="${td};white-space:nowrap;font-family:monospace;color:#475569">${esc(a.code || '—')}</td>
      <td style="${td}">${esc(a.title)}</td>
      <td style="${td};white-space:nowrap">${esc(a.owner_name || '—')}</td>
      <td style="${td};white-space:nowrap">${a.due_on ? fmtD(a.due_on) : '—'}</td>
      <td style="${td};white-space:nowrap">${TASK_STATUS_VI[a.status] || a.status}</td>
    </tr>`,
  ).join('');

  const noteBlock = note.trim()
    ? `<div style="background:#f8fafc;border-left:3px solid #3595D5;padding:10px 14px;margin:0 0 18px;border-radius:0 6px 6px 0;color:#334155;font-size:14px;white-space:pre-wrap">${esc(note.trim())}</div>`
    : '';

  const body =
    noteBlock +
    `<table role="presentation" style="border-collapse:collapse;font-size:14px;margin-bottom:4px">${meta}</table>` +
    (minutesHtml ? `${emailSection('Nội dung biên bản')}<div style="font-size:14px;line-height:1.6;color:#161A21">${minutesHtml}</div>` : '') +
    (decisionsHtml ? `${emailSection('Quyết định chính')}<div style="font-size:14px;line-height:1.6;color:#161A21">${decisionsHtml}</div>` : '') +
    (actions.length ? `${emailSection(`Hành động (${actions.length})`)}
      <table role="presentation" style="border-collapse:collapse;width:100%;font-size:13.5px">
        <thead><tr style="text-align:left;color:#64748b">
          <th style="${th}">Mã</th><th style="${th}">Công việc</th><th style="${th}">Phụ trách</th><th style="${th}">Hạn</th><th style="${th}">Trạng thái</th>
        </tr></thead><tbody>${actionRows}</tbody></table>` : '');

  return brandedEmail({
    kicker: `Biên bản cuộc họp${m.code ? ` · ${esc(m.code)}` : ''}`,
    title: esc(m.title),
    titleUrl: url,
    bodyHtml: body,
    button: { label: 'Mở cuộc họp trên hệ thống →', url },
    footerNote: senderName ? `gửi bởi ${esc(senderName)}` : undefined,
    preheader: `Biên bản họp: ${m.title}`,
  });
}

export type SendMinutesResult = { ok: boolean; error?: string; sent?: number; total?: number; recipients?: string[]; failed?: string[] };

export async function sendMinutesEmail(meetingId: string, actor: string, note: string, senderName: string): Promise<SendMinutesResult> {
  const m = await getMeeting(meetingId);
  if (!m) return { ok: false, error: 'Không tìm thấy cuộc họp.' };
  if (!m.minutes && !m.decisions) return { ok: false, error: 'Chưa có biên bản để gửi.' };
  const [participants, actions] = await Promise.all([listParticipants(meetingId), listActionItems(meetingId)]);

  // Người nhận = chủ trì + toàn bộ thành viên (mọi vai trò), dedup, chỉ giữ email hợp lệ.
  const set = new Set<string>();
  const add = (email: string | null) => { const e = (email || '').trim().toLowerCase(); if (e && e.includes('@')) set.add(e); };
  add(m.owner_email);
  for (const p of participants) add(p.email);
  const recips = [...set];
  if (!recips.length) return { ok: false, error: 'Cuộc họp chưa có người nhận (thành viên) nào có email hợp lệ.' };

  const html = buildHtml(m, actions, note, senderName);
  const subject = `📋 Biên bản họp: ${m.title}`;
  // Gửi SONG SONG (pool SMTP) — nhanh hơn nhiều so với tuần tự.
  const results = await Promise.all(
    recips.map(async (email) => ({ email, ok: await sendMail({ to: email, subject, html }).catch(() => false) })),
  );
  const done = results.filter((r) => r.ok).map((r) => r.email);
  const failed = results.filter((r) => !r.ok).map((r) => r.email);
  const sent = done.length;
  await logAudit({ actor, action: 'meeting.send_minutes', entity: 'meeting', entityId: meetingId, detail: { sent, total: recips.length, failed: failed.length } }).catch(() => {});
  return { ok: true, sent, total: recips.length, recipients: done, failed };
}
