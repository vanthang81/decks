import { query, queryOne } from './db';
import { getSetting } from './settings';

// GHI THẲNG GOOGLE CALENDAR (app-side). Ba tầng kiểm soát:
//  (1) env GOOGLE_CALENDAR_ENABLED=1 — bật SCOPE lúc đăng nhập + master (đổi cần redeploy);
//  (2) công tắc TOÀN CỤC ở Quản trị — okr_settings key 'calendar_sync' (mặc định true, đổi runtime);
//  (3) tuỳ chọn MỖI NGƯỜI — okr_users.calendar_enabled (mặc định true).
// Chỉ ghi khi CẢ BA ON + người đó đã cấp quyền (có token). Mọi hàm best-effort: no-op khi tắt/lỗi.
// Xem docs/GOOGLE-CALENDAR-SETUP.md.

const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export const CALENDAR_SYNC_KEY = 'calendar_sync';

export function isCalendarEnabled(): boolean {
  return process.env.GOOGLE_CALENDAR_ENABLED === '1';
}

/** Công tắc toàn cục (Quản trị) — mặc định BẬT khi env đã bật. */
export async function calendarGloballyOn(): Promise<boolean> {
  if (!isCalendarEnabled()) return false;
  return getSetting<boolean>(CALENDAR_SYNC_KEY, true).catch(() => true);
}

/** Có được ghi lịch của 1 người không = env + toàn cục + tuỳ chọn cá nhân (mặc định bật). */
async function userCalendarOn(email: string | null): Promise<boolean> {
  if (!email || !(await calendarGloballyOn())) return false;
  const r = await queryOne<{ calendar_enabled: boolean }>(
    'SELECT calendar_enabled FROM okr_users WHERE lower(email)=lower($1)', [email],
  ).catch(() => null);
  return r ? r.calendar_enabled !== false : false; // email ngoài hệ thống → không ghi lịch của họ
}

type TokenRow = { access_token: string | null; refresh_token: string | null; expiry: string | null; scope: string | null };

/** Lưu token OAuth của 1 người (gọi từ jwt callback khi Google trả account có calendar scope). */
export async function saveGoogleTokens(email: string, t: {
  access_token?: string | null; refresh_token?: string | null; expiry?: number | null; scope?: string | null;
}): Promise<void> {
  const expiryIso = t.expiry ? new Date(t.expiry * 1000).toISOString() : null;
  // refresh_token chỉ trả lần đầu (prompt=consent) → GIỮ token cũ nếu lần này rỗng (COALESCE).
  await query(
    `INSERT INTO okr_google_tokens (email, access_token, refresh_token, expiry, scope, updated_at)
     VALUES ($1,$2,$3,$4,$5, now())
     ON CONFLICT (email) DO UPDATE SET
       access_token = EXCLUDED.access_token,
       refresh_token = COALESCE(EXCLUDED.refresh_token, okr_google_tokens.refresh_token),
       expiry = EXCLUDED.expiry, scope = EXCLUDED.scope, updated_at = now()`,
    [email.toLowerCase(), t.access_token ?? null, t.refresh_token ?? null, expiryIso, t.scope ?? null],
  ).catch((e) => console.error('[gcal] saveTokens lỗi', e));
}

/** Lấy access_token còn hạn (tự refresh nếu hết hạn). null nếu không có token/không refresh được. */
async function getAccessToken(email: string): Promise<string | null> {
  const row = await queryOne<TokenRow>(
    'SELECT access_token, refresh_token, expiry, scope FROM okr_google_tokens WHERE email=$1',
    [email.toLowerCase()],
  );
  if (!row) return null;
  const stillValid = row.expiry && new Date(row.expiry).getTime() - 60_000 > Date.now();
  if (row.access_token && stillValid) return row.access_token;
  if (!row.refresh_token) return row.access_token ?? null;
  // Refresh bằng client hiện hành (env). Lưu ý: refresh_token phải phát từ CÙNG client.
  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        refresh_token: row.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!j.access_token) return null;
    const expiryIso = new Date(Date.now() + (j.expires_in ?? 3600) * 1000).toISOString();
    await query('UPDATE okr_google_tokens SET access_token=$2, expiry=$3, updated_at=now() WHERE email=$1',
      [email.toLowerCase(), j.access_token, expiryIso]).catch(() => {});
    return j.access_token;
  } catch (e) {
    console.error('[gcal] refresh lỗi', e);
    return null;
  }
}

export type CalEvent = {
  summary: string;
  description?: string | null;
  location?: string | null;
  // all-day: {date:'YYYY-MM-DD'} ; theo giờ: {dateTime, timeZone}
  start: Record<string, string>;
  end: Record<string, string>;
  attendees?: { email: string }[];
};

/** Tạo sự kiện trên lịch CHÍNH của 1 người. Trả event id, hoặc null nếu không tạo được/không bật. */
export async function createEvent(email: string, ev: CalEvent): Promise<string | null> {
  if (!isCalendarEnabled()) return null;
  const token = await getAccessToken(email);
  if (!token) return null;
  try {
    const res = await fetch(`${API}?sendUpdates=all`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(ev),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { id?: string };
    return j.id ?? null;
  } catch (e) {
    console.error('[gcal] createEvent lỗi', e);
    return null;
  }
}

export async function updateEvent(email: string, eventId: string, ev: Partial<CalEvent>): Promise<boolean> {
  if (!isCalendarEnabled()) return false;
  const token = await getAccessToken(email);
  if (!token) return false;
  try {
    const res = await fetch(`${API}/${encodeURIComponent(eventId)}?sendUpdates=all`, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(ev),
    });
    return res.ok;
  } catch (e) {
    console.error('[gcal] updateEvent lỗi', e);
    return false;
  }
}

export async function deleteEvent(email: string, eventId: string): Promise<boolean> {
  if (!isCalendarEnabled()) return false;
  const token = await getAccessToken(email);
  if (!token) return false;
  try {
    const res = await fetch(`${API}/${encodeURIComponent(eventId)}?sendUpdates=all`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    });
    return res.ok || res.status === 410; // 410 = đã xoá
  } catch (e) {
    console.error('[gcal] deleteEvent lỗi', e);
    return false;
  }
}

const TZ = 'Asia/Ho_Chi_Minh';
const dateOnly = (s: string) => s.slice(0, 10); // 'YYYY-MM-DD'

/** Đồng bộ 1 CUỘC HỌP lên lịch chủ trì (mời người tham gia làm attendee). Best-effort. */
export async function syncMeetingCalendar(meetingId: string): Promise<void> {
  if (!isCalendarEnabled()) return;
  try {
    const m = await queryOne<{ owner_email: string | null; title: string; agenda: string | null; location: string | null; meeting_at: string | null; status: string; gcal_event_id: string | null }>(
      `SELECT owner_email, title, agenda, location, meeting_at::text AS meeting_at, status, gcal_event_id
         FROM okr_meetings WHERE id=$1`, [meetingId]);
    if (!m || !m.owner_email || !m.meeting_at) return;
    // Đã huỷ HOẶC chủ trì tắt đồng bộ lịch (toàn cục/cá nhân) → xoá sự kiện nếu có, rồi thôi.
    if (m.status === 'cancelled' || !(await userCalendarOn(m.owner_email))) {
      if (m.gcal_event_id) { await deleteEvent(m.owner_email, m.gcal_event_id); await query('UPDATE okr_meetings SET gcal_event_id=NULL WHERE id=$1', [meetingId]); }
      return;
    }
    const parts = await query<{ email: string }>('SELECT email FROM okr_meeting_participants WHERE meeting_id=$1', [meetingId]);
    const start = new Date(m.meeting_at);
    if (isNaN(start.getTime())) return;
    const end = new Date(start.getTime() + 60 * 60 * 1000); // mặc định 1 giờ
    const ev: CalEvent = {
      summary: m.title,
      description: m.agenda ?? undefined,
      location: m.location ?? undefined,
      start: { dateTime: start.toISOString(), timeZone: TZ },
      end: { dateTime: end.toISOString(), timeZone: TZ },
      attendees: parts.filter((p) => p.email).map((p) => ({ email: p.email })),
    };
    if (m.gcal_event_id) {
      await updateEvent(m.owner_email, m.gcal_event_id, ev);
    } else {
      const id = await createEvent(m.owner_email, ev);
      if (id) await query('UPDATE okr_meetings SET gcal_event_id=$2 WHERE id=$1', [meetingId, id]);
    }
  } catch (e) { console.error('[gcal] syncMeeting lỗi', e); }
}

/** Đồng bộ 1 CÔNG VIỆC (có hạn) lên lịch người phụ trách — sự kiện cả-ngày theo hạn. Best-effort. */
export async function syncTaskCalendar(initId: string): Promise<void> {
  if (!isCalendarEnabled()) return;
  try {
    const t = await queryOne<{ owner_email: string | null; title: string; description: string | null; start_on: string | null; due_on: string | null; status: string; gcal_event_id: string | null }>(
      `SELECT owner_email, title, description, start_on::text AS start_on, due_on::text AS due_on, status, gcal_event_id
         FROM okr_initiatives WHERE id=$1`, [initId]);
    if (!t || !t.owner_email) return;
    const day = t.due_on || t.start_on;
    // Không có mốc / đã xong/huỷ / người phụ trách tắt đồng bộ → xoá sự kiện nếu có, rồi thôi.
    if (!day || t.status === 'done' || t.status === 'cancelled' || !(await userCalendarOn(t.owner_email))) {
      if (t.gcal_event_id) { await deleteEvent(t.owner_email, t.gcal_event_id); await query('UPDATE okr_initiatives SET gcal_event_id=NULL WHERE id=$1', [initId]); }
      return;
    }
    const startD = dateOnly(t.start_on || day);
    const endExclusive = new Date(new Date(dateOnly(day) + 'T00:00:00Z').getTime() + 24 * 60 * 60 * 1000);
    const ev: CalEvent = {
      summary: `[Việc] ${t.title}`,
      description: t.description ?? undefined,
      start: { date: startD },
      end: { date: dateOnly(endExclusive.toISOString()) },
    };
    if (t.gcal_event_id) {
      await updateEvent(t.owner_email, t.gcal_event_id, ev);
    } else {
      const id = await createEvent(t.owner_email, ev);
      if (id) await query('UPDATE okr_initiatives SET gcal_event_id=$2 WHERE id=$1', [initId, id]);
    }
  } catch (e) { console.error('[gcal] syncTask lỗi', e); }
}

/** Xoá sự kiện của 1 cuộc họp/công việc TRƯỚC khi xoá bản ghi (cần owner + eventId đã đọc trước). */
export async function removeCalendarEvent(ownerEmail: string | null, eventId: string | null): Promise<void> {
  if (!isCalendarEnabled() || !ownerEmail || !eventId) return;
  await deleteEvent(ownerEmail, eventId);
}
/** Đọc owner+event của cuộc họp rồi xoá sự kiện (gọi TRƯỚC khi xoá bản ghi họp). */
export async function removeMeetingCalendar(meetingId: string): Promise<void> {
  if (!isCalendarEnabled()) return;
  const m = await queryOne<{ owner_email: string | null; gcal_event_id: string | null }>(
    'SELECT owner_email, gcal_event_id FROM okr_meetings WHERE id=$1', [meetingId]).catch(() => null);
  if (m) await removeCalendarEvent(m.owner_email, m.gcal_event_id);
}
/** Đọc owner+event của công việc rồi xoá sự kiện (gọi TRƯỚC khi xoá công việc). */
export async function removeTaskCalendar(initId: string): Promise<void> {
  if (!isCalendarEnabled()) return;
  const t = await queryOne<{ owner_email: string | null; gcal_event_id: string | null }>(
    'SELECT owner_email, gcal_event_id FROM okr_initiatives WHERE id=$1', [initId]).catch(() => null);
  if (t) await removeCalendarEvent(t.owner_email, t.gcal_event_id);
}
