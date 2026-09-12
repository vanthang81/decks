// ── Thông báo THAY ĐỔI công việc (CFO 12/09) ──
// Khi 1 công việc đổi TRẠNG THÁI / NỘI DUNG → ghi 1 "task event". Định kỳ (theo tuỳ chọn giờ/ngày của
// TỪNG người) gom các thay đổi kể từ lần gửi trước rồi gửi cho NGƯỜI GIAO (created_by) + CHỦ TRÌ OKR gốc
// (objective owner) — loại người vừa thay đổi. Kênh: app / email / cả hai / tắt (per-user).
// Mặc định: cả hai kênh, 8:00 sáng Thứ 2–Thứ 7. Dispatch qua route /api/task-changes/dispatch (x-warm-key),
// cron n8n gọi mỗi 30' (giờ VN 5–22). Master switch 'task_change_enabled' (mặc định TẮT như các digest khác).
import { query } from './db';
import { sendMail, mailBaseUrl } from './mail';
import { brandedEmail, emailEsc, emailSection } from './mail-layout';
import { getSetting, setSetting } from './settings';
import { isSuperAdmin, userGroupKey } from './access';
import { INIT_STATUS_LABEL, type InitStatus, type Priority, type Initiative } from './initiatives';

export const TASK_CHANGE_ENABLED_KEY = 'task_change_enabled';
export async function getTaskChangeEnabled(): Promise<boolean> {
  return (await getSetting<boolean>(TASK_CHANGE_ENABLED_KEY, false)) === true;
}
export async function setTaskChangeEnabled(on: boolean): Promise<void> {
  await setSetting(TASK_CHANGE_ENABLED_KEY, !!on);
}

// ── Tuỳ chọn per-user ──
export type TaskChangeChannel = 'both' | 'app' | 'email' | 'off';
export type TaskChangePrefs = { channel: TaskChangeChannel; times: string[]; days: number[] };
export const DEFAULT_TASK_CHANGE_PREFS: TaskChangePrefs = {
  channel: 'both',
  times: ['08:00'],
  days: [1, 2, 3, 4, 5, 6], // T2–T7 (0=CN..6=T7, giờ VN)
};
export const TASK_CHANGE_TIME_CHOICES = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
];
export const TASK_CHANGE_DAY_LABEL: Record<number, string> = {
  1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7', 0: 'CN',
};

const TIME_RE = /^([01]\d|2[0-3]):(00|30)$/;
/** Chuẩn hoá prefs từ DB (null/thiếu → mặc định); chống dữ liệu bẩn. */
export function normalizePrefs(raw: unknown): TaskChangePrefs {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const channel = (['both', 'app', 'email', 'off'] as const).includes(p.channel as TaskChangeChannel)
    ? (p.channel as TaskChangeChannel) : DEFAULT_TASK_CHANGE_PREFS.channel;
  let times = Array.isArray(p.times)
    ? Array.from(new Set((p.times as unknown[]).filter((t): t is string => typeof t === 'string' && TIME_RE.test(t)))).sort()
    : DEFAULT_TASK_CHANGE_PREFS.times;
  if (times.length === 0) times = DEFAULT_TASK_CHANGE_PREFS.times;
  let days = Array.isArray(p.days)
    ? Array.from(new Set((p.days as unknown[]).filter((d): d is number => typeof d === 'number' && d >= 0 && d <= 6))).sort()
    : DEFAULT_TASK_CHANGE_PREFS.days;
  if (days.length === 0) days = DEFAULT_TASK_CHANGE_PREFS.days;
  return { channel, times, days };
}

export async function getTaskChangePrefs(email: string): Promise<TaskChangePrefs> {
  const r = await query<{ task_change_prefs: unknown }>(
    'SELECT task_change_prefs FROM okr_users WHERE email=$1', [email],
  );
  return normalizePrefs(r[0]?.task_change_prefs ?? null);
}
export async function setTaskChangePrefs(email: string, prefs: TaskChangePrefs): Promise<void> {
  await query('UPDATE okr_users SET task_change_prefs=$2 WHERE email=$1', [email, JSON.stringify(normalizePrefs(prefs))]);
}

// ── Ghi 1 thay đổi ──
const PRIO_LABEL: Record<Priority, string> = { low: 'Thấp', medium: 'Trung bình', high: 'Cao' };
const dmy = (iso: string | null): string => (iso ? iso.split('-').reverse().join('/') : '—');

/** So sánh việc CŨ với các trường MỚI (chỉ các trường action gửi lên) → mô tả ngắn + loại. null = không đổi gì đáng kể. */
export function summarizeInitChanges(
  old: Pick<Initiative, 'status' | 'progress' | 'title' | 'description' | 'due_on' | 'priority' | 'owner_email' | 'owner_name' | 'expected_output'>,
  next: Partial<Pick<Initiative, 'status' | 'progress' | 'title' | 'description' | 'due_on' | 'priority' | 'owner_email' | 'expected_output'>> & { owner_name_new?: string | null },
): { kind: 'status' | 'content'; summary: string } | null {
  const parts: string[] = [];
  let statusChanged = false;
  if (next.status !== undefined && next.status !== old.status) {
    parts.push(`Trạng thái: ${INIT_STATUS_LABEL[old.status]} → ${INIT_STATUS_LABEL[next.status as InitStatus]}`);
    statusChanged = true;
  }
  if (next.progress !== undefined && Math.round(next.progress) !== Math.round(old.progress)) {
    parts.push(`Tiến độ: ${Math.round(old.progress)}% → ${Math.round(next.progress)}%`);
  }
  if (next.priority !== undefined && next.priority !== old.priority) {
    parts.push(`Ưu tiên: ${PRIO_LABEL[old.priority]} → ${PRIO_LABEL[next.priority as Priority]}`);
  }
  if (next.due_on !== undefined && (next.due_on ?? null) !== (old.due_on ?? null)) {
    parts.push(`Hạn: ${dmy(old.due_on)} → ${dmy(next.due_on ?? null)}`);
  }
  if (next.owner_email !== undefined && (next.owner_email ?? '').toLowerCase() !== (old.owner_email ?? '').toLowerCase()) {
    parts.push(`Giao lại: ${old.owner_name || old.owner_email || '—'} → ${next.owner_name_new || next.owner_email || '—'}`);
  }
  if (next.title !== undefined && (next.title ?? '') !== (old.title ?? '')) parts.push('Đổi tên việc');
  const contentChanged =
    (next.description !== undefined && (next.description ?? '') !== (old.description ?? '')) ||
    (next.expected_output !== undefined && (next.expected_output ?? '') !== (old.expected_output ?? ''));
  if (contentChanged) parts.push('Cập nhật nội dung/kết quả');
  if (parts.length === 0) return null;
  return { kind: statusChanged ? 'status' : 'content', summary: parts.join(' · ') };
}

/** Ghi 1 task event (best-effort — KHÔNG làm hỏng thao tác sửa việc nếu lỗi). */
export async function recordTaskChange(
  actorEmail: string,
  old: Parameters<typeof summarizeInitChanges>[0] & { id: string },
  next: Parameters<typeof summarizeInitChanges>[1],
): Promise<void> {
  try {
    const chg = summarizeInitChanges(old, next);
    if (!chg) return;
    const actor = await query<{ email: string; display_name: string | null; role: string | null; perm_group: string | null }>(
      'SELECT email, display_name, role, perm_group FROM okr_users WHERE email=$1', [actorEmail],
    );
    const u = actor[0];
    // ── LOẠI TRỪ THÔNG BÁO theo vai trò người thao tác (CFO 12/09) ──
    //  • Super Admin: MỌI thay đổi (xoá/sửa/huỷ) → KHÔNG báo cho ai.
    //  • Quản trị hệ thống / Quản trị OKR: khi HUỶ việc (status→'canceled') → KHÔNG báo cho ai.
    //    (Xoá việc vốn không sinh sự kiện nên đã tự động không báo.)
    if (u) {
      const uu = { email: u.email, role: (u.role ?? 'staff'), perm_group: u.perm_group } as Parameters<typeof userGroupKey>[0];
      if (isSuperAdmin(uu)) return;
      const grp = userGroupKey(uu);
      const isCancel = next.status === 'canceled';
      if (isCancel && (grp === 'system_admin' || grp === 'okr_admin')) return;
    }
    await query(
      `INSERT INTO okr_task_events (task_id, task_title, actor_email, actor_name, kind, summary)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [old.id, next.title ?? old.title, actorEmail, u?.display_name ?? null, chg.kind, chg.summary],
    );
  } catch (e) {
    console.error('[task-change] record failed', e);
  }
}

// ── Dispatch (gom & gửi theo lịch) ──
type EventRow = {
  id: string; task_id: string; task_title: string; actor_email: string | null; actor_name: string | null;
  kind: string; summary: string; created_at: string;
  created_by: string | null; objective_owner: string | null; objective_title: string | null;
};
type Recip = { email: string; name: string; channel: TaskChangeChannel; lastSent: string | null };

/** VN "now" (UTC+7 dưới dạng Date để lấy HH:MM/weekday). */
function vnNow(base = Date.now()): Date { return new Date(base + 7 * 3600_000); }
function hhmm(d: Date): string {
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/** Slot đến hạn gần nhất HÔM NAY mà user chưa được gửi (last_sent < mốc slot). null = chưa tới giờ. */
function dueSlot(prefs: TaskChangePrefs, now: Date, lastSent: Date | null): boolean {
  const dow = now.getUTCDay();
  if (!prefs.days.includes(dow)) return false;
  const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  // Mốc VN 00:00 hôm nay (theo lịch VN) = now trừ phần giờ/phút/giây trong ngày.
  const dayStartMs = now.getTime() - (nowMin * 60_000 + now.getUTCSeconds() * 1000 + now.getUTCMilliseconds());
  for (const t of prefs.times) {
    const [h, m] = t.split(':').map(Number);
    const slotMin = h * 60 + m;
    if (nowMin < slotMin) continue;                 // chưa tới giờ slot này
    const slotMs = dayStartMs + slotMin * 60_000;   // thời điểm slot (mốc UTC thật)
    if (!lastSent || lastSent.getTime() < slotMs) return true; // slot đã tới & chưa gửi cho slot này
  }
  return false;
}

/**
 * Gửi digest thay đổi công việc.
 *  - Mặc định: chỉ gửi cho user ĐẾN GIỜ slot (theo prefs) + master switch bật.
 *  - force + onlyEmail: gửi thử NGAY cho 1 người (bỏ qua lịch + master switch) — nút "Gửi thử cho tôi".
 */
export async function dispatchTaskChangeDigests(
  opts?: { force?: boolean; onlyEmail?: string },
): Promise<{ sent: number; recipients: string[]; skipped?: string }> {
  if (!opts?.force && !(await getTaskChangeEnabled())) {
    return { sent: 0, recipients: [], skipped: 'Công tắc "Thông báo thay đổi công việc" đang TẮT.' };
  }
  // Dọn event cũ >30 ngày (chống phình) — best-effort.
  try { await query(`DELETE FROM okr_task_events WHERE created_at < now() - interval '30 days'`); } catch {}

  const now = vnNow();

  // 1) Người nhận đủ điều kiện gửi lúc này.
  const users = await query<{ email: string; display_name: string | null; is_active: boolean; notify_email: boolean; task_change_prefs: unknown; task_change_last_sent: string | null }>(
    `SELECT email, display_name, is_active, notify_email, task_change_prefs, task_change_last_sent::text
       FROM okr_users WHERE is_active=true`,
  );
  const due: Recip[] = [];
  for (const u of users) {
    const prefs = normalizePrefs(u.task_change_prefs);
    if (prefs.channel === 'off') continue;
    if (opts?.onlyEmail) {
      if (u.email.toLowerCase() === opts.onlyEmail.toLowerCase()) {
        due.push({ email: u.email, name: u.display_name || u.email, channel: prefs.channel, lastSent: null }); // test: gom 3 ngày gần nhất
      }
      continue;
    }
    const last = u.task_change_last_sent ? new Date(u.task_change_last_sent) : null;
    if (dueSlot(prefs, now, last)) {
      due.push({ email: u.email, name: u.display_name || u.email, channel: prefs.channel, lastSent: u.task_change_last_sent });
    }
  }
  if (due.length === 0) return { sent: 0, recipients: [], skipped: opts?.onlyEmail ? 'Không tìm thấy người dùng.' : 'Chưa tới giờ gửi của ai.' };

  // 2) Lấy event gần đây kèm người giao + chủ trì OKR (1 truy vấn) — cửa sổ tối đa 3 ngày.
  const events = await query<EventRow>(
    `SELECT e.id, e.task_id, e.task_title, e.actor_email, e.actor_name, e.kind, e.summary, e.created_at::text,
            i.created_by, o.owner_email AS objective_owner, o.title AS objective_title
       FROM okr_task_events e
       JOIN okr_initiatives i ON i.id = e.task_id
       LEFT JOIN okr_objectives o ON o.id = i.objective_id
      WHERE e.created_at > now() - interval '3 days'
      ORDER BY e.created_at ASC`,
  );

  const base = mailBaseUrl();
  const recipients: string[] = [];
  let sent = 0;
  for (const r of due) {
    const rlc = r.email.toLowerCase();
    const sinceMs = opts?.onlyEmail ? Date.now() - 3 * 86400_000 : (r.lastSent ? new Date(r.lastSent).getTime() : Date.now() - 3 * 86400_000);
    // Event mà người này là NGƯỜI GIAO hoặc CHỦ TRÌ OKR, KHÔNG do chính họ gây ra, kể từ lần gửi trước.
    const mine = events.filter((e) =>
      new Date(e.created_at).getTime() > sinceMs &&
      (e.actor_email ?? '').toLowerCase() !== rlc &&
      (((e.created_by ?? '').toLowerCase() === rlc) || ((e.objective_owner ?? '').toLowerCase() === rlc)),
    );
    // Luôn ĐÁNH DẤU đã tới slot (tránh lặp) — kể cả khi không có thay đổi nào để gửi.
    if (!opts?.onlyEmail) {
      await query('UPDATE okr_users SET task_change_last_sent = now() WHERE email=$1', [r.email]);
    }
    if (mine.length === 0) continue;

    // App notification (kênh app/both).
    if (r.channel === 'app' || r.channel === 'both') {
      const nTasks = new Set(mine.map((e) => e.task_id)).size;
      await query(
        `INSERT INTO okr_notifications (recipient_email, type, entity_type, actor_email, actor_name, preview, link)
         VALUES ($1,'task_change','initiative',$2,$3,$4,$5)`,
        [r.email, mine[0].actor_email, mine[0].actor_name,
         `${mine.length} thay đổi ở ${nTasks} công việc bạn theo dõi`, '/tasks'],
      );
    }
    // Email (kênh email/both) — chỉ khi user còn bật nhận email tổng.
    if ((r.channel === 'email' || r.channel === 'both')) {
      const html = renderChangeEmail(r.name, mine, base);
      void sendMail({ to: r.email, subject: '[OKR BTMH] Cập nhật thay đổi công việc', html });
    }
    recipients.push(r.email);
    sent++;
  }
  return { sent, recipients };
}

// ── Render email tổng hợp (gom theo công việc) ──
function renderChangeEmail(name: string, events: EventRow[], base: string): string {
  // Gom theo task_id, giữ thứ tự thời gian.
  const byTask = new Map<string, { title: string; ctx: string | null; lines: { who: string; summary: string; at: string }[] }>();
  for (const e of events) {
    const g = byTask.get(e.task_id) ?? { title: e.task_title, ctx: e.objective_title, lines: [] };
    g.lines.push({ who: e.actor_name || e.actor_email || 'Ai đó', summary: e.summary, at: e.created_at });
    byTask.set(e.task_id, g);
  }
  const nTasks = byTask.size;
  const parts: string[] = [];
  parts.push(`<p style="margin:0 0 6px;font-size:15px">Chào <b>${emailEsc(name)}</b>,</p>`);
  parts.push(`<p style="margin:0 0 6px;font-size:14px;color:#334155">Có <b>${events.length}</b> thay đổi ở <b>${nTasks}</b> công việc bạn <b>giao</b> hoặc <b>chủ trì OKR</b> kể từ lần gửi trước:</p>`);
  for (const [taskId, g] of byTask) {
    parts.push(emailSection(emailEsc(g.title) + (g.ctx ? ` <span style="font-weight:400;color:#7A6F6A">· ${emailEsc(g.ctx)}</span>` : '')));
    const rows = g.lines.map((l) =>
      `<tr><td style="padding:6px 0;border-bottom:1px solid #F1EDE7;font-size:13.5px;color:#334155">` +
      `<b style="color:#161A21">${emailEsc(l.who)}</b> · ${emailEsc(l.summary)}` +
      `</td></tr>`).join('');
    parts.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`);
    parts.push(`<div style="margin:4px 0 2px"><a href="${base}/tasks?task=${taskId}" style="color:#7C0312;text-decoration:none;font-size:13px;font-weight:600">Mở công việc →</a></div>`);
  }
  return brandedEmail({
    kicker: 'Thay đổi công việc',
    title: 'Cập nhật thay đổi công việc',
    titleUrl: `${base}/tasks`,
    bodyHtml: parts.join('\n'),
    button: { label: 'Mở danh sách công việc →', url: `${base}/tasks` },
    footerNote: 'Bạn nhận email này vì là người giao việc hoặc chủ trì OKR. Đổi kênh/giờ nhận ở Cài đặt cá nhân',
    preheader: `${events.length} thay đổi ở ${nTasks} công việc`,
  });
}
