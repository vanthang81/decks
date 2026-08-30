import { query } from './db';
import { sendMail } from './mail';
import { notifEnabled } from './notifications';

// NHẮC CÔNG VIỆC QUA EMAIL + CHUÔNG (CFO 30/08): (2) sắp đến hạn 1 ngày · (3) quá hạn ·
// (4) tổng hợp quá hạn hàng tuần. ((1) "được giao mới" đã có sẵn qua notifyTaskAssigned/notify.)
// Chạy theo lịch (cron n8n gọi route /api/reminders/tasks). Mặc định BẬT cho mọi user; mỗi user
// tự tắt trong Cài đặt cá nhân (notif_prefs: task_due_soon / task_overdue / task_overdue_weekly).
// Idempotent: không gửi lại cùng một nhắc cho cùng công việc trong cửa sổ thời gian.

const APP_URL = () => process.env.AUTH_URL || 'https://okr.consultx.vn';
const SYS = 'he-thong@okr'; // actor hệ thống (không phải người thật)
const OPEN = `status NOT IN ('done','canceled')`;

type TaskRow = {
  id: string; title: string; due_on: string | null; owner_email: string | null;
  objective_id: string | null; project_id: string | null; meeting_id: string | null;
  notify_email: boolean; notif_prefs: Record<string, unknown> | null;
};

function taskLink(t: { id: string }): string {
  return `/tasks?task=${t.id}`;
}

/** Chèn 1 thông báo nhắc (chuông) + email best-effort, TÔN TRỌNG tuỳ chọn & idempotent. */
async function pushReminder(t: TaskRow, type: string, subject: string, bodyHtml: string, sinceHours: number): Promise<boolean> {
  const email = (t.owner_email ?? '').trim();
  if (!email) return false;
  if (!notifEnabled(t.notif_prefs, type)) return false;
  // Đã gửi nhắc loại này cho công việc này trong cửa sổ? → bỏ qua (không spam).
  const dup = await query(
    `SELECT 1 FROM okr_notifications
      WHERE recipient_email=$1 AND type=$2 AND entity_id=$3 AND created_at > now() - ($4 || ' hours')::interval
      LIMIT 1`,
    [email, type, t.id, String(sinceHours)],
  );
  if (dup.length) return false;
  const preview = t.title.length > 140 ? t.title.slice(0, 140) + '…' : t.title;
  await query(
    `INSERT INTO okr_notifications (recipient_email, type, entity_type, entity_id, actor_email, actor_name, preview, link)
     VALUES ($1,$2,'task',$3,$4,'Hệ thống OKR',$5,$6)`,
    [email, type, t.id, SYS, preview, taskLink(t)],
  );
  if (t.notify_email) {
    await sendMail({ to: email, subject, html: bodyHtml });
  }
  return true;
}

async function openTasksDue(where: string): Promise<TaskRow[]> {
  return query<TaskRow>(
    `SELECT i.id, i.title, i.due_on::text AS due_on, i.owner_email, i.objective_id, i.project_id, i.meeting_id,
            u.notify_email, u.notif_prefs
       FROM okr_initiatives i
       JOIN okr_users u ON u.email = i.owner_email AND u.is_active = true
      WHERE i.owner_email IS NOT NULL AND i.due_on IS NOT NULL AND i.${OPEN} AND (${where})`,
  );
}

/** (2) Sắp đến hạn: due_on = NGÀY MAI (giờ VN). */
export async function remindTasksDueSoon(): Promise<number> {
  const rows = await openTasksDue(`i.due_on = ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + 1)`);
  let n = 0;
  for (const t of rows) {
    const subject = `[OKR BTMH] Công việc đến hạn ngày mai: ${t.title}`;
    const html =
      `<p>Công việc <b>${escapeHtml(t.title)}</b> của bạn <b>đến hạn vào NGÀY MAI</b>${t.due_on ? ` (${fmt(t.due_on)})` : ''}.</p>` +
      `<p><a href="${APP_URL()}${taskLink(t)}">Mở công việc để cập nhật →</a></p>`;
    if (await pushReminder(t, 'task_due_soon', subject, html, 20)) n++;
  }
  return n;
}

/** (3) Quá hạn: due_on < HÔM NAY (giờ VN) & còn mở — nhắc MỘT LẦN cho mỗi lần quá hạn (idempotent 20 ngày). */
export async function remindTasksOverdue(): Promise<number> {
  const rows = await openTasksDue(`i.due_on < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`);
  let n = 0;
  for (const t of rows) {
    const subject = `[OKR BTMH] Công việc QUÁ HẠN: ${t.title}`;
    const html =
      `<p>Công việc <b>${escapeHtml(t.title)}</b> của bạn <b style="color:#dc2626">đã QUÁ HẠN</b>${t.due_on ? ` (hạn ${fmt(t.due_on)})` : ''}.</p>` +
      `<p>Vui lòng cập nhật tiến độ hoặc dời hạn.</p>` +
      `<p><a href="${APP_URL()}${taskLink(t)}">Mở công việc →</a></p>`;
    if (await pushReminder(t, 'task_overdue', subject, html, 20 * 24)) n++;
  }
  return n;
}

/** (4) Tổng hợp quá hạn HÀNG TUẦN: mỗi người 1 email liệt kê toàn bộ việc quá hạn còn mở. */
export async function weeklyOverdueDigest(): Promise<number> {
  const rows = await openTasksDue(`i.due_on < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`);
  // Gom theo người nhận.
  const byOwner = new Map<string, TaskRow[]>();
  for (const t of rows) {
    if (!notifEnabled(t.notif_prefs, 'task_overdue_weekly') || !t.notify_email) continue;
    const k = (t.owner_email ?? '').trim();
    if (!k) continue;
    (byOwner.get(k) ?? byOwner.set(k, []).get(k)!).push(t);
  }
  let sent = 0;
  for (const [email, tasks] of byOwner) {
    tasks.sort((a, b) => (a.due_on ?? '').localeCompare(b.due_on ?? ''));
    const items = tasks.map((t) =>
      `<li><a href="${APP_URL()}${taskLink(t)}">${escapeHtml(t.title)}</a>${t.due_on ? ` — hạn <b style="color:#dc2626">${fmt(t.due_on)}</b>` : ''}</li>`,
    ).join('');
    const html =
      `<p>Chào bạn, bạn đang có <b>${tasks.length}</b> công việc <b style="color:#dc2626">quá hạn</b> chưa hoàn thành:</p>` +
      `<ul>${items}</ul>` +
      `<p>Vui lòng cập nhật tiến độ, hoàn thành hoặc dời hạn để bảng điều hành phản ánh đúng.</p>` +
      `<p><a href="${APP_URL()}/tasks?overdue=1&mine=1">Mở danh sách việc quá hạn của tôi →</a></p>`;
    const ok = await sendMail({ to: email, subject: `[OKR BTMH] Tổng hợp ${tasks.length} công việc quá hạn của bạn`, html });
    if (ok) sent++;
  }
  return sent;
}

function fmt(dateIso: string): string {
  try { return new Date(dateIso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }); } catch { return dateIso; }
}
function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}
