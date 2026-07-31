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
  preview: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export async function unreadCount(email: string): Promise<number> {
  const r = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM okr_notifications WHERE recipient_email=$1 AND is_read=false`,
    [email],
  );
  return r?.n ?? 0;
}

export async function listNotifications(email: string, limit = 50): Promise<Notification[]> {
  return query<Notification>(
    `SELECT id, type, entity_type, entity_id, comment_id, actor_email, actor_name,
            preview, link, is_read, created_at::text
       FROM okr_notifications
      WHERE recipient_email=$1
      ORDER BY created_at DESC LIMIT $2`,
    [email, limit],
  );
}

export async function markRead(email: string, id: string): Promise<void> {
  await query('UPDATE okr_notifications SET is_read=true WHERE id=$1 AND recipient_email=$2', [id, email]);
}

export async function markAllRead(email: string): Promise<void> {
  await query('UPDATE okr_notifications SET is_read=true WHERE recipient_email=$1 AND is_read=false', [email]);
}

/**
 * Tạo thông báo cho 1 nhóm người nhận (đã loại người thao tác), lưu DB + gửi email
 * (best-effort, chỉ gửi cho ai bật notify_email). Notification "smart": gộp theo người,
 * không tự nhắc chính mình, phân loại mention/reply.
 */
export async function notify(input: {
  recipients: string[];
  type: 'mention' | 'reply';
  actorEmail: string;
  actorName: string | null;
  entityType: string;
  entityId: string;
  commentId: string;
  preview: string;
  link: string;
  entityLabel: string;
}): Promise<void> {
  const actorLc = input.actorEmail.toLowerCase();
  const uniq = Array.from(new Set(input.recipients.map((r) => r.trim()).filter(Boolean)))
    .filter((r) => r.toLowerCase() !== actorLc);
  if (uniq.length === 0) return;

  // Lưu notification (chỉ cho user còn active).
  const active = await query<{ email: string; notify_email: boolean }>(
    `SELECT email, notify_email FROM okr_users WHERE lower(email) = ANY($1) AND is_active=true`,
    [uniq.map((e) => e.toLowerCase())],
  );
  if (active.length === 0) return;

  for (const u of active) {
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
  const verb = input.type === 'reply' ? 'đã trả lời bình luận của bạn' : 'đã nhắc bạn';
  for (const u of active) {
    if (!u.notify_email) continue;
    const subject = `[OKR BTMH] ${input.actorName || input.actorEmail} ${verb}`;
    const html =
      `<p><b>${input.actorName || input.actorEmail}</b> ${verb} tại <b>${input.entityLabel}</b>:</p>` +
      `<blockquote style="border-left:3px solid #7C0312;padding-left:10px;color:#333">${input.preview}</blockquote>` +
      `<p><a href="${appUrl}${input.link}">Mở để xem &amp; phản hồi →</a></p>`;
    await sendMail({ to: u.email, subject, html }); // best-effort, tự nuốt lỗi
  }
}
