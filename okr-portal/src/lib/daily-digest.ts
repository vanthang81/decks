// ── Email "Tóm tắt công việc buổi sáng" (CFO 12/09) ──
// Gửi 8:00 sáng Thứ 2–Thứ 7 cho mỗi user: KPI + việc quá hạn / đến hạn ≤3 ngày / đang làm +
// việc mình GIAO cho người khác đang chờ. BỎ QUA user không còn việc tồn đọng (tránh spam).
// Định dạng dùng chung khung thương hiệu brandedEmail. Chạy qua route /api/digest/daily (x-warm-key).
import { query } from './db';
import { sendMail, mailBaseUrl } from './mail';
import { brandedEmail, emailEsc, emailSection } from './mail-layout';
import { notifEnabled } from './notifications';
import { getSetting, setSetting } from './settings';

const DUE_SOON_DAYS = 3;
export const DAILY_DIGEST_ENABLED_KEY = 'daily_digest_enabled';

export async function getDailyDigestEnabled(): Promise<boolean> {
  return (await getSetting<boolean>(DAILY_DIGEST_ENABLED_KEY, false)) === true;
}
export async function setDailyDigestEnabled(on: boolean): Promise<void> {
  await setSetting(DAILY_DIGEST_ENABLED_KEY, !!on);
}

type TaskRow = {
  id: string;
  title: string;
  due_on: string | null;
  status: string;
  owner_email: string;
  owner_name: string | null;
  objective_id: string | null;
  objective_title: string | null;
  project_id: string | null;
  project_name: string | null;
  meeting_id: string | null;
  meeting_title: string | null;
};

type Item = { id: string; title: string; due_on: string | null; status: string; ctx: string; assignee?: string | null };
type Counts = { total: number; doing: number; todo: number; blocked: number; done: number; overdue: number };
export type UserDigest = {
  email: string; name: string;
  counts: Counts;
  overdue: Item[]; dueSoon: Item[]; doing: Item[]; delegated: Item[];
};

const ACTIVE = `status NOT IN ('done','canceled')`;

function ctxOf(r: TaskRow): string {
  if (r.objective_id) return `OKR · ${r.objective_title ?? 'OKR'}`;
  if (r.project_id) return `Dự án · ${r.project_name ?? 'Dự án'}`;
  if (r.meeting_id) return `Cuộc họp · ${r.meeting_title ?? 'Cuộc họp'}`;
  return 'việc cá nhân';
}

const TASK_SELECT = `
  SELECT i.id, i.title, i.due_on::text, i.status, lower(i.owner_email) AS owner_email,
         ou.display_name AS owner_name,
         i.objective_id, obj.title AS objective_title,
         i.project_id, pr.name AS project_name,
         i.meeting_id, mt.title AS meeting_title
    FROM okr_initiatives i
    LEFT JOIN okr_users ou ON ou.email = i.owner_email
    LEFT JOIN okr_objectives obj ON obj.id = i.objective_id
    LEFT JOIN okr_projects pr ON pr.id = i.project_id
    LEFT JOIN okr_meetings mt ON mt.id = i.meeting_id`;

/** Dựng dữ liệu tóm tắt cho MỌI user active (gom nhiều truy vấn, group trong JS — tránh N+1). */
export async function buildAllDigests(): Promise<UserDigest[]> {
  // 1) User active + tuỳ chọn nhận
  const users = await query<{ email: string; display_name: string | null; notify_email: boolean; notif_prefs: Record<string, unknown> | null }>(
    `SELECT email, display_name, notify_email, notif_prefs FROM okr_users WHERE is_active=true`,
  );
  const byEmail = new Map<string, UserDigest>();
  for (const u of users) {
    byEmail.set(u.email.toLowerCase(), {
      email: u.email, name: u.display_name || u.email,
      counts: { total: 0, doing: 0, todo: 0, blocked: 0, done: 0, overdue: 0 },
      overdue: [], dueSoon: [], doing: [], delegated: [],
    });
  }

  // 2) Đếm theo owner (mirror taskCountsForOwner)
  const counts = await query<Counts & { owner: string }>(
    `SELECT lower(owner_email) AS owner,
            count(*)::int AS total,
            count(*) FILTER (WHERE status='in_progress')::int AS doing,
            count(*) FILTER (WHERE status='todo')::int AS todo,
            count(*) FILTER (WHERE status='blocked')::int AS blocked,
            count(*) FILTER (WHERE status='done')::int AS done,
            count(*) FILTER (WHERE due_on < current_date AND status NOT IN ('done','canceled'))::int AS overdue
       FROM okr_initiatives WHERE owner_email IS NOT NULL GROUP BY lower(owner_email)`,
  );
  for (const c of counts) {
    const d = byEmail.get(c.owner);
    if (d) d.counts = { total: c.total, doing: c.doing, todo: c.todo, blocked: c.blocked, done: c.done, overdue: c.overdue };
  }

  // 3) Việc CỦA MÌNH còn hoạt động (overdue / due-soon / doing) — sắp theo hạn
  const mine = await query<TaskRow>(
    `${TASK_SELECT}
      WHERE i.owner_email IS NOT NULL AND i.${ACTIVE}
        AND (i.due_on < current_date + ${DUE_SOON_DAYS} OR i.status='in_progress')
      ORDER BY i.due_on NULLS LAST, i.created_at`,
  );
  for (const r of mine) {
    const d = byEmail.get(r.owner_email);
    if (!d) continue;
    const item: Item = { id: r.id, title: r.title, due_on: r.due_on, status: r.status, ctx: ctxOf(r) };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = r.due_on ? new Date(r.due_on + 'T00:00:00') : null;
    if (due && due < today) {
      if (d.overdue.length < 12) d.overdue.push(item);
    } else if (due && (due.getTime() - today.getTime()) / 86400000 <= DUE_SOON_DAYS) {
      if (d.dueSoon.length < 12) d.dueSoon.push(item);
    } else if (r.status === 'in_progress') {
      if (d.doing.length < 12) d.doing.push(item);
    }
  }

  // 4) Việc mình GIAO cho người khác đang chờ (created_by = user, owner khác, còn hoạt động)
  const deleg = await query<TaskRow & { created_by: string }>(
    `${TASK_SELECT.replace('SELECT ', 'SELECT lower(i.created_by) AS created_by, ')}
      WHERE i.created_by IS NOT NULL AND i.owner_email IS NOT NULL
        AND lower(i.created_by) <> lower(i.owner_email) AND i.${ACTIVE}
      ORDER BY i.due_on NULLS LAST, i.created_at`,
  );
  for (const r of deleg) {
    const d = byEmail.get((r as TaskRow & { created_by: string }).created_by);
    if (!d) continue;
    if (d.delegated.length >= 12) continue;
    d.delegated.push({ id: r.id, title: r.title, due_on: r.due_on, status: r.status, ctx: `Giao cho: ${r.owner_name ?? r.owner_email}`, assignee: r.owner_name });
  }

  // Chỉ giữ user CÓ việc tồn đọng + bật nhận email + chưa tắt loại daily_digest
  const out: UserDigest[] = [];
  for (const u of users) {
    const d = byEmail.get(u.email.toLowerCase());
    if (!d) continue;
    const hasWork = d.counts.overdue + d.counts.doing + d.counts.todo + d.counts.blocked > 0 || d.delegated.length > 0;
    if (!hasWork) continue;
    if (!u.notify_email) continue;
    if (!notifEnabled(u.notif_prefs, 'daily_digest')) continue;
    out.push(d);
  }
  return out;
}

// ── Render HTML 1 email ──
const VN_DOW = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
function todayLabel(): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${VN_DOW[now.getDay()]}, ${dd}/${mm}/${now.getFullYear()}`;
}
function dmy(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}`;
}
function dueTag(iso: string | null): { text: string; color: string } {
  if (!iso) return { text: '—', color: '#7A6F6A' };
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  today.setHours(0, 0, 0, 0);
  const due = new Date(iso + 'T00:00:00');
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { text: `Quá ${-days} ngày`, color: '#B42318' };
  if (days === 0) return { text: 'Hôm nay', color: '#B45309' };
  return { text: `Còn ${days} ngày`, color: '#B45309' };
}
const STATUS_VN: Record<string, string> = { todo: 'Chưa làm', in_progress: 'Đang làm', blocked: 'Vướng', done: 'Xong', canceled: 'Huỷ' };

function kpiTable(c: Counts): string {
  const cell = (n: number, l: string, color: string) =>
    `<td style="background:#fff;border:1px solid #EDE7E0;border-radius:10px;padding:12px 6px;text-align:center;width:20%"><div style="font-size:23px;font-weight:800;color:${color};line-height:1">${n}</div><div style="font-size:11px;color:#7A6F6A;margin-top:3px">${l}</div></td>`;
  const sp = `<td style="width:6px"></td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px"><tr>${cell(c.total, 'Tổng việc', '#241C1A')}${sp}${cell(c.doing, 'Đang làm', '#2563eb')}${sp}${cell(c.todo, 'Chưa làm', '#7A6F6A')}${sp}${cell(c.overdue, 'Quá hạn', c.overdue > 0 ? '#B42318' : '#15803d')}${sp}${cell(c.done, 'Hoàn thành', '#15803d')}</tr></table>`;
}
function taskTable(items: Item[], base: string, tagKind: 'due' | 'status'): string {
  const rows = items.map((it) => {
    const tag = tagKind === 'due' ? dueTag(it.due_on) : { text: STATUS_VN[it.status] ?? it.status, color: it.status === 'blocked' ? '#B42318' : it.status === 'in_progress' ? '#B45309' : '#7A6F6A' };
    const meta = tagKind === 'due'
      ? `${emailEsc(it.ctx)} · hạn ${dmy(it.due_on)}`
      : `${emailEsc(it.ctx)}${it.due_on ? ' · hạn ' + dmy(it.due_on) : ''}`;
    return `<tr>
      <td style="padding:9px 0;border-bottom:1px solid #F1EDE7;vertical-align:top">
        <a href="${base}/tasks?task=${it.id}" style="color:#161A21;text-decoration:none;font-weight:600;font-size:14px">${emailEsc(it.title)}</a>
        <div style="font-size:12px;color:#7A6F6A;margin-top:2px">${meta}</div>
      </td>
      <td style="padding:9px 0;border-bottom:1px solid #F1EDE7;text-align:right;vertical-align:top;white-space:nowrap">
        <span style="font-size:12px;font-weight:700;color:${tag.color}">${tag.text}</span>
      </td></tr>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}
function doingList(items: Item[]): string {
  return `<div style="font-size:13.5px;color:#334155;line-height:1.9">${items.map((it) =>
    ` • ${emailEsc(it.title)} — <span style="color:#7A6F6A">${emailEsc(it.ctx)}</span>`).join('<br>')}</div>`;
}

export function renderDigestHtml(d: UserDigest, base: string): string {
  const c = d.counts;
  const parts: string[] = [];
  parts.push(`<p style="margin:0 0 4px;font-size:15px">Chào buổi sáng <b>${emailEsc(d.name)}</b>,</p>`);
  const lead = c.overdue > 0
    ? `Bạn đang có <b style="color:#B42318">${c.overdue} việc quá hạn</b>${d.dueSoon.length ? ` và <b>${d.dueSoon.length} việc</b> đến hạn trong ${DUE_SOON_DAYS} ngày tới` : ''}.`
    : d.dueSoon.length ? `Bạn có <b>${d.dueSoon.length} việc</b> đến hạn trong ${DUE_SOON_DAYS} ngày tới.`
      : `Bạn không có việc quá hạn — tiếp tục các việc đang làm nhé.`;
  parts.push(`<p style="margin:0 0 6px;font-size:14px;color:#334155">Tóm tắt công việc của bạn — <b>${todayLabel()}</b>. ${lead}</p>`);
  parts.push(kpiTable(c));
  if (d.overdue.length) { parts.push(emailSection(`🔴 Quá hạn — cần xử lý ngay (${d.overdue.length})`)); parts.push(taskTable(d.overdue, base, 'due')); }
  if (d.dueSoon.length) { parts.push(emailSection(`📅 Đến hạn hôm nay & trong ${DUE_SOON_DAYS} ngày tới (${d.dueSoon.length})`)); parts.push(taskTable(d.dueSoon, base, 'due')); }
  if (d.doing.length) { parts.push(emailSection(`⏳ Đang làm (${d.doing.length})`)); parts.push(doingList(d.doing)); }
  if (d.delegated.length) { parts.push(emailSection(`👥 Việc bạn giao cho người khác đang chờ (${d.delegated.length})`)); parts.push(taskTable(d.delegated, base, 'status')); }

  return brandedEmail({
    kicker: 'Tóm tắt công việc buổi sáng',
    title: 'Công việc hôm nay của bạn',
    titleUrl: `${base}/tasks?mine=1`,
    bodyHtml: parts.join('\n'),
    button: { label: 'Mở danh sách công việc của tôi →', url: `${base}/tasks?mine=1` },
    footerNote: 'gửi 8:00 sáng Thứ 2–Thứ 7. Bạn có thể tắt email này ở mục Cài đặt',
    preheader: c.overdue > 0 ? `${c.overdue} việc quá hạn cần xử lý` : `Tóm tắt công việc hôm nay`,
  });
}

/** Gửi digest cho mọi user đủ điều kiện. force=true bỏ qua công tắc tổng (nút Gửi thử). */
export async function sendDailyDigests(opts?: { force?: boolean; onlyEmail?: string }): Promise<{ sent: number; recipients: string[]; skipped?: string }> {
  if (!opts?.force && !(await getDailyDigestEnabled())) {
    return { sent: 0, recipients: [], skipped: 'Công tắc "Tóm tắt công việc hằng ngày" đang TẮT.' };
  }
  const base = mailBaseUrl();
  let digests = await buildAllDigests();
  if (opts?.onlyEmail) {
    const lc = opts.onlyEmail.toLowerCase();
    digests = digests.filter((d) => d.email.toLowerCase() === lc);
    // Nút "Gửi thử cho tôi": nếu người test không có việc tồn đọng vẫn gửi 1 bản (rỗng) để xem.
    if (digests.length === 0) {
      digests = [{ email: opts.onlyEmail, name: opts.onlyEmail, counts: { total: 0, doing: 0, todo: 0, blocked: 0, done: 0, overdue: 0 }, overdue: [], dueSoon: [], doing: [], delegated: [] }];
    }
  }
  const jobs = digests.map((d) =>
    sendMail({ to: d.email, subject: '[OKR BTMH] Tóm tắt công việc hôm nay của bạn', html: renderDigestHtml(d, base) }),
  );
  await Promise.allSettled(jobs);
  return { sent: digests.length, recipients: digests.map((d) => d.email) };
}
