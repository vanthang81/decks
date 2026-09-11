// Gửi BIÊN BẢN HỌP qua email cho các thành viên cuộc họp (CFO 11/09).
import { getMeeting, listParticipants, listActionItems, MEETING_TYPE_LABEL } from './meetings';
import { sendMail, mailBaseUrl } from './mail';
import { sanitizeRichHtml, linkifyHtml } from './sanitizeHtml';
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

  const actionRows = actions.map((a) =>
    `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(a.title)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;white-space:nowrap">${esc(a.owner_name || '—')}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;white-space:nowrap">${a.due_on ? fmtD(a.due_on) : '—'}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;white-space:nowrap">${TASK_STATUS_VI[a.status] || a.status}</td>
    </tr>`,
  ).join('');

  const noteBlock = note.trim()
    ? `<div style="background:#f8fafc;border-left:3px solid #3595D5;padding:10px 14px;margin:0 0 18px;border-radius:0 6px 6px 0;color:#334155;font-size:14px;white-space:pre-wrap">${esc(note.trim())}</div>`
    : '';

  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;padding:24px 0">
  <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#161A21;box-shadow:0 1px 4px rgba(0,0,0,.08)">
    <div style="background:#7C0312;padding:18px 26px;color:#fff">
      <div style="font-size:12px;letter-spacing:.5px;opacity:.85;text-transform:uppercase">Biên bản cuộc họp${m.code ? ` · ${esc(m.code)}` : ''}</div>
      <div style="font-size:20px;font-weight:700;margin-top:2px">${esc(m.title)}</div>
    </div>
    <div style="padding:22px 26px">
      ${noteBlock}
      <table style="border-collapse:collapse;font-size:14px;margin-bottom:18px">${meta}</table>

      ${minutesHtml ? `<div style="font-weight:700;font-size:15px;margin:0 0 6px;color:#7C0312">Nội dung biên bản</div>
        <div style="font-size:14px;line-height:1.6;color:#161A21">${minutesHtml}</div>` : ''}

      ${decisionsHtml ? `<div style="font-weight:700;font-size:15px;margin:18px 0 6px;color:#7C0312">Quyết định chính</div>
        <div style="font-size:14px;line-height:1.6;color:#161A21">${decisionsHtml}</div>` : ''}

      ${actions.length ? `<div style="font-weight:700;font-size:15px;margin:18px 0 6px;color:#7C0312">Hành động (${actions.length})</div>
        <table style="border-collapse:collapse;width:100%;font-size:13.5px">
          <thead><tr style="text-align:left;color:#64748b">
            <th style="padding:6px 10px;border-bottom:2px solid #e2e8f0">Công việc</th>
            <th style="padding:6px 10px;border-bottom:2px solid #e2e8f0">Phụ trách</th>
            <th style="padding:6px 10px;border-bottom:2px solid #e2e8f0">Hạn</th>
            <th style="padding:6px 10px;border-bottom:2px solid #e2e8f0">Trạng thái</th>
          </tr></thead><tbody>${actionRows}</tbody></table>` : ''}

      <div style="margin-top:24px">
        <a href="${url}" style="background:#3595D5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Mở cuộc họp trên hệ thống</a>
      </div>
      <div style="margin-top:20px;padding-top:14px;border-top:1px solid #eee;color:#94a3b8;font-size:12px">
        Email tự động từ Hệ thống Quản trị Hiệu suất BTMH${senderName ? ` · gửi bởi ${esc(senderName)}` : ''}. Vui lòng không trả lời email này.
      </div>
    </div>
  </div></body></html>`;
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
  let sent = 0;
  const done: string[] = [];
  const failed: string[] = [];
  for (const email of recips) {
    const ok = await sendMail({ to: email, subject, html }).catch(() => false);
    if (ok) { sent++; done.push(email); } else failed.push(email);
  }
  await logAudit({ actor, action: 'meeting.send_minutes', entity: 'meeting', entityId: meetingId, detail: { sent, total: recips.length, failed: failed.length } }).catch(() => {});
  return { ok: true, sent, total: recips.length, recipients: done, failed };
}
