import { query } from './db';
import { getSetting } from './settings';
import { getCurrentPeriod } from './periods';
import { sendMail, mailBaseUrl } from './mail';
import { roleAtLeast, type Role } from './rbac';

// #4 Nhắc check-in — cấu hình được ở /admin/settings, gửi qua "Deck Mail".
export type ReminderConfig = {
  enabled: boolean;
  weekday: number; // 0=CN .. 6=T7 (giờ VN)
  stale_days: number; // KR không check-in quá số ngày này → nhắc
  audience: 'all_owners' | 'leads_up'; // mọi người chủ trì | từ trưởng phòng trở lên
};
export const REMINDER_KEY = 'checkin_reminder';
export const DEFAULT_REMINDER: ReminderConfig = {
  enabled: false,
  weekday: 1,
  stale_days: 7,
  audience: 'all_owners',
};
export const WEEKDAY_LABEL = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export async function getReminderConfig(): Promise<ReminderConfig> {
  const c = await getSetting<Partial<ReminderConfig>>(REMINDER_KEY, {});
  return { ...DEFAULT_REMINDER, ...c };
}

type StaleRow = {
  owner_email: string;
  owner_name: string | null;
  role: Role;
  obj_title: string;
  kr_title: string;
  last_checkin: string | null;
};

type OwnerGroup = { name: string | null; items: { obj: string; kr: string }[] };

export async function computeStaleByOwner(
  periodId: string,
  staleDays: number,
  audience: string,
): Promise<Map<string, OwnerGroup>> {
  const rows = await query<StaleRow>(
    `SELECT o.owner_email, u.display_name AS owner_name, u.role,
            o.title AS obj_title, k.title AS kr_title,
            (SELECT max(created_at) FROM okr_checkins c WHERE c.key_result_id=k.id)::text AS last_checkin
       FROM okr_objectives o
       JOIN okr_key_results k ON k.objective_id=o.id
       JOIN okr_users u ON u.email=o.owner_email AND u.is_active
      WHERE o.period_id=$1 AND o.status='active' AND o.owner_email IS NOT NULL`,
    [periodId],
  );
  const cutoff = Date.now() - staleDays * 86400_000;
  const map = new Map<string, OwnerGroup>();
  for (const r of rows) {
    const last = r.last_checkin ? new Date(r.last_checkin).getTime() : 0;
    if (last >= cutoff) continue; // đã check-in gần đây
    if (audience === 'leads_up' && !roleAtLeast(r.role, 'dept_lead')) continue;
    const g = map.get(r.owner_email) ?? { name: r.owner_name, items: [] };
    g.items.push({ obj: r.obj_title, kr: r.kr_title });
    map.set(r.owner_email, g);
  }
  return map;
}

function esc(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string,
  );
}

export async function runCheckinReminders(opts: {
  force?: boolean;
}): Promise<{ sent: number; skipped?: string; recipients: string[] }> {
  const cfg = await getReminderConfig();
  if (!cfg.enabled && !opts.force) return { sent: 0, skipped: 'disabled', recipients: [] };

  const nowVn = new Date(Date.now() + 7 * 3600_000);
  const weekdayVn = nowVn.getUTCDay();
  if (!opts.force && weekdayVn !== cfg.weekday) {
    return { sent: 0, skipped: `weekday ${weekdayVn}!=${cfg.weekday}`, recipients: [] };
  }
  const period = await getCurrentPeriod();
  if (!period) return { sent: 0, skipped: 'no-period', recipients: [] };

  const map = await computeStaleByOwner(period.id, cfg.stale_days, cfg.audience);
  const appUrl = mailBaseUrl();
  let sent = 0;
  const recipients: string[] = [];
  for (const [email, g] of map) {
    const list = g.items
      .map((i) => `<li><b>${esc(i.kr)}</b> — ${esc(i.obj)}</li>`)
      .join('');
    const html = `<p>Chào ${esc(g.name || email)},</p>
      <p>Bạn có <b>${g.items.length}</b> kết quả then chốt (KR) chưa check-in trong ${cfg.stale_days} ngày. Vui lòng cập nhật tiến độ:</p>
      <ul>${list}</ul>
      <p><a href="${appUrl}/my">Mở OKR của tôi →</a></p>
      <p style="color:#888;font-size:12px">BTMH OKR Portal — email nhắc tự động.</p>`;
    const ok = await sendMail({ to: email, subject: 'Nhắc check-in OKR', html, kind: 'link' });
    if (ok) {
      sent++;
      recipients.push(email);
    }
  }
  return { sent, recipients };
}
