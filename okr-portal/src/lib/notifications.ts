import { query, queryOne } from './db';
import { sendMail } from './mail';

export type Notification = {
  id: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  comment_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  actor_avatar: string | null;
  preview: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

// ── Loại thông báo + tuỳ chọn chi tiết (per-user, lưu okr_users.notif_prefs) ──
export type NotifType =
  | 'mention' | 'reply' | 'comment_mine' | 'assignment'
  | 'task_due_soon' | 'task_overdue' | 'task_overdue_weekly';
export const NOTIF_TYPE_META: { key: NotifType; label: string; desc: string }[] = [
  { key: 'mention', label: 'Được nhắc tên (@)', desc: 'Khi ai đó @nhắc bạn trong một bình luận.' },
  { key: 'reply', label: 'Trả lời bình luận của bạn', desc: 'Khi ai đó trả lời bình luận bạn đã viết.' },
  { key: 'comment_mine', label: 'Bình luận trên mục bạn phụ trách', desc: 'Khi có bình luận mới trên OKR/công việc bạn chủ trì hoặc được giao.' },
  { key: 'assignment', label: 'Được giao việc mới', desc: 'Khi bạn được giao một công việc mới.' },
  { key: 'task_due_soon', label: 'Công việc sắp đến hạn (trước 1 ngày)', desc: 'Nhắc trước 1 ngày cho công việc của bạn sắp đến hạn.' },
  { key: 'task_overdue', label: 'Công việc quá hạn', desc: 'Báo khi công việc của bạn quá hạn mà chưa hoàn thành.' },
  { key: 'task_overdue_weekly', label: 'Tổng hợp việc quá hạn hàng tuần', desc: 'Email tổng hợp các công việc quá hạn của bạn mỗi tuần.' },
];
const NOTIF_VERB: Record<NotifType, string> = {
  mention: 'đã nhắc bạn',
  reply: 'đã trả lời bình luận của bạn',
  comment_mine: 'đã bình luận ở mục bạn phụ trách',
  assignment: 'đã giao việc cho bạn',
  task_due_soon: 'nhắc: công việc sắp đến hạn',
  task_overdue: 'nhắc: công việc quá hạn',
  task_overdue_weekly: 'tổng hợp việc quá hạn tuần',
};

/** Mặc định MỌI loại BẬT; chỉ tắt khi prefs[type] === false. */
export function notifEnabled(prefs: Record<string, unknown> | null | undefined, type: string): boolean {
  return !prefs || prefs[type] !== false;
}

/** Thông báo ĐƠN GIẢN (không gắn bình luận) — cho các sự kiện hệ thống (vd yêu cầu xem cuộc họp). */
export async function notifySimple(input: {
  recipients: string[]; type: string; actorEmail: string; actorName: string | null;
  preview: string; link: string;
  // Ngữ cảnh để XỬ LÝ NGAY tại chuông (duyệt/từ chối/bình luận không cần mở trang):
  // entityType = 'meeting_access' | 'user_invite' | 'objective' | 'key_result' | 'initiative' …
  // entityId   = id của yêu cầu/lời mời/thực thể tương ứng.
  entityType?: string | null; entityId?: string | null;
}): Promise<void> {
  const actorLc = input.actorEmail.toLowerCase();
  const uniq = Array.from(new Set(input.recipients.map((r) => r.trim()).filter(Boolean)))
    .filter((r) => r.toLowerCase() !== actorLc);
  if (uniq.length === 0) return;
  const active = await query<{ email: string }>(
    `SELECT email FROM okr_users WHERE lower(email) = ANY($1) AND is_active=true`,
    [uniq.map((e) => e.toLowerCase())],
  );
  for (const u of active) {
    await query(
      `INSERT INTO okr_notifications (recipient_email, type, entity_type, entity_id, actor_email, actor_name, preview, link)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [u.email, input.type, input.entityType ?? null, input.entityId ?? null,
       input.actorEmail, input.actorName, input.preview, input.link],
    );
  }
}

/** Lấy 1 thông báo của CHÍNH người nhận (để xử lý inline ở chuông — chỉ đọc được của mình). */
export async function getNotification(id: string, recipient: string): Promise<Notification | null> {
  return queryOne<Notification>(
    `SELECT n.id, n.type, n.entity_type, n.entity_id, n.comment_id, n.actor_email, n.actor_name,
            au.avatar_url AS actor_avatar, n.preview, n.link, n.is_read, n.created_at::text
       FROM okr_notifications n
       LEFT JOIN okr_users au ON au.email = n.actor_email
      WHERE n.id=$1 AND n.recipient_email=$2`,
    [id, recipient],
  );
}

/** Sau khi một yêu cầu/lời mời được xử lý → đánh dấu ĐÃ ĐỌC mọi thông báo cùng loại+thực thể của
 * MỌI người nhận (vd 2 người cùng được báo 1 yêu cầu, 1 người duyệt thì người kia hết chờ). */
export async function markSiblingNotifsRead(type: string, entityId: string): Promise<void> {
  await query('UPDATE okr_notifications SET is_read=true WHERE type=$1 AND entity_id=$2', [type, entityId]);
}

export async function unreadCount(email: string): Promise<number> {
  const r = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM okr_notifications WHERE recipient_email=$1 AND is_read=false`,
    [email],
  );
  return r?.n ?? 0;
}

export async function listNotifications(email: string, limit = 50): Promise<Notification[]> {
  return query<Notification>(
    `SELECT n.id, n.type, n.entity_type, n.entity_id, n.comment_id, n.actor_email, n.actor_name,
            au.avatar_url AS actor_avatar, n.preview, n.link, n.is_read, n.created_at::text
       FROM okr_notifications n
       LEFT JOIN okr_users au ON au.email = n.actor_email
      WHERE n.recipient_email=$1
      ORDER BY n.created_at DESC LIMIT $2`,
    [email, limit],
  );
}

export async function markRead(email: string, id: string): Promise<void> {
  await query('UPDATE okr_notifications SET is_read=true WHERE id=$1 AND recipient_email=$2', [id, email]);
}

export async function markAllRead(email: string): Promise<void> {
  await query('UPDATE okr_notifications SET is_read=true WHERE recipient_email=$1 AND is_read=false', [email]);
}

export type NotifSettings = { notifyEmail: boolean; prefs: Record<string, boolean> };

export async function getNotifSettings(email: string): Promise<NotifSettings> {
  const r = await queryOne<{ notify_email: boolean; notif_prefs: Record<string, unknown> | null }>(
    'SELECT notify_email, notif_prefs FROM okr_users WHERE email=$1',
    [email],
  );
  const prefs: Record<string, boolean> = {};
  for (const t of NOTIF_TYPE_META) prefs[t.key] = notifEnabled(r?.notif_prefs, t.key);
  return { notifyEmail: r?.notify_email ?? true, prefs };
}

export async function saveNotifSettings(email: string, notifyEmail: boolean, prefs: Record<string, boolean>): Promise<void> {
  // Chỉ lưu các loại bị TẮT (=false) để notif_prefs gọn; loại thiếu = bật.
  const off: Record<string, boolean> = {};
  for (const t of NOTIF_TYPE_META) if (prefs[t.key] === false) off[t.key] = false;
  await query('UPDATE okr_users SET notify_email=$2, notif_prefs=$3 WHERE email=$1', [
    email, notifyEmail, JSON.stringify(off),
  ]);
}

/**
 * Tạo thông báo cho 1 nhóm người nhận (đã loại người thao tác), lưu DB + gửi email
 * (best-effort, chỉ gửi cho ai bật notify_email). Notification "smart": gộp theo người,
 * không tự nhắc chính mình, phân loại mention/reply.
 */
export async function notify(input: {
  recipients: string[];
  type: NotifType;
  actorEmail: string;
  actorName: string | null;
  entityType: string;
  entityId: string;
  commentId: string | null;
  preview: string;
  link: string;
  entityLabel: string;
}): Promise<void> {
  const actorLc = input.actorEmail.toLowerCase();
  const uniq = Array.from(new Set(input.recipients.map((r) => r.trim()).filter(Boolean)))
    .filter((r) => r.toLowerCase() !== actorLc);
  if (uniq.length === 0) return;

  // Lưu notification (chỉ cho user còn active + BẬT loại thông báo này).
  const active = await query<{ email: string; notify_email: boolean; notif_prefs: Record<string, unknown> | null }>(
    `SELECT email, notify_email, notif_prefs FROM okr_users WHERE lower(email) = ANY($1) AND is_active=true`,
    [uniq.map((e) => e.toLowerCase())],
  );
  const wanted = active.filter((u) => notifEnabled(u.notif_prefs, input.type));
  if (wanted.length === 0) return;

  for (const u of wanted) {
    await query(
      `INSERT INTO okr_notifications
         (recipient_email, type, entity_type, entity_id, comment_id, actor_email, actor_name, preview, link)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [u.email, input.type, input.entityType, input.entityId, input.commentId,
       input.actorEmail, input.actorName, input.preview, input.link],
    );
  }

  // Email best-effort cho ai bật notify_email (qua webhook Deck Mail).
  const appUrl = process.env.AUTH_URL || 'https://okr.consultx.vn';
  const verb = NOTIF_VERB[input.type];
  for (const u of wanted) {
    if (!u.notify_email) continue;
    const subject = `[OKR BTMH] ${input.actorName || input.actorEmail} ${verb}`;
    const html =
      `<p><b>${input.actorName || input.actorEmail}</b> ${verb} tại <b>${input.entityLabel}</b>:</p>` +
      `<blockquote style="border-left:3px solid #7C0312;padding-left:10px;color:#333">${input.preview}</blockquote>` +
      `<p><a href="${appUrl}${input.link}">Mở để xem &amp; phản hồi →</a></p>`;
    await sendMail({ to: u.email, subject, html }); // best-effort, tự nuốt lỗi
  }
}

/**
 * Thông báo "ĐƯỢC GIAO VIỆC" cho người phụ trách khi một công việc được TẠO hoặc GIAO cho họ
 * bởi NGƯỜI KHÁC (không tự nhắc mình). Best-effort — lỗi KHÔNG làm hỏng thao tác tạo/sửa việc.
 * Ngữ cảnh (link + nhãn) suy theo nơi việc thuộc về: OKR → /objectives · Dự án → /projects ·
 * Cuộc họp → /meetings · việc cá nhân → /my. Tôn trọng tuỳ chọn nhận thông báo/email của người nhận.
 */
export async function notifyTaskAssigned(
  task: {
    id: string;
    title: string;
    owner_email: string | null;
    due_on?: string | null;
    objective_id: string | null;
    project_id: string | null;
    meeting_id?: string | null;
  },
  actorEmail: string,
): Promise<void> {
  const owner = (task.owner_email ?? '').trim();
  if (!owner || owner.toLowerCase() === actorEmail.toLowerCase()) return; // không có người nhận / tự giao cho mình
  try {
    // label = NGỮ CẢNH việc thuộc về (OKR/Dự án/Cuộc họp/việc cá nhân) để hiện trong thông báo;
    // link luôn mở THẲNG popup chi tiết việc (/tasks?task=…) — đúng chỗ để cập nhật ngay.
    let label = 'việc cá nhân';
    if (task.objective_id) {
      const o = await queryOne<{ title: string; code: string | null }>(
        'SELECT title, code FROM okr_objectives WHERE id=$1',
        [task.objective_id],
      );
      label = o ? `OKR ${o.code ? o.code + ' · ' : ''}${o.title}` : 'OKR';
    } else if (task.project_id) {
      const p = await queryOne<{ name: string; code: string | null }>(
        'SELECT name, code FROM okr_projects WHERE id=$1',
        [task.project_id],
      );
      label = p ? `Dự án ${p.code ? p.code + ' · ' : ''}${p.name}` : 'Dự án';
    } else if (task.meeting_id) {
      const m = await queryOne<{ title: string }>('SELECT title FROM okr_meetings WHERE id=$1', [task.meeting_id]);
      label = m ? `Cuộc họp: ${m.title}` : 'Cuộc họp';
    }
    const actor = await queryOne<{ display_name: string | null }>(
      'SELECT display_name FROM okr_users WHERE email=$1',
      [actorEmail],
    );
    const due = task.due_on ? ` · hạn ${task.due_on.split('-').reverse().join('/')}` : '';
    await notify({
      recipients: [owner],
      type: 'assignment',
      actorEmail,
      actorName: actor?.display_name ?? null,
      entityType: 'initiative',
      entityId: task.id,
      commentId: null,
      preview: `${task.title}${due}`,
      link: `/tasks?task=${task.id}`,
      entityLabel: label,
    });
  } catch (e) {
    console.error('[notify] assignment failed', e);
  }
}
