import { query, queryOne, pool } from './db';
import { ROLE_LABEL, type Role } from './rbac';

// Chức danh hiển thị KÈM TÊN ở mọi nơi chọn/hiện người (phân biệt người trùng tên): "Vai trò · Đơn vị".
// Bỏ đơn vị cấp Công ty cho gọn (CEO/CFO chỉ hiện vai trò). Nguồn DUY NHẤT — dùng chung toàn hệ thống.
export function personTitle(p: { role?: Role | string | null; unit_name?: string | null; unit_type?: string | null } | null | undefined): string | null {
  if (!p) return null;
  const roleLabel = p.role ? ROLE_LABEL[p.role as Role] ?? '' : '';
  const unitName = p.unit_name && p.unit_type !== 'company' ? p.unit_name : null;
  return [roleLabel, unitName].filter(Boolean).join(' · ') || null;
}

export type OkrUser = {
  email: string;
  display_name: string | null;
  title: string | null;
  role: Role;
  unit_id: string | null;
  is_active: boolean;
  notify_email: boolean;
  avatar_url: string | null;
  perm_group: string | null;
  calendar_enabled: boolean;
};

/** Ghi nhận ĐĂNG NHẬP (gọi ở callback signIn). Best-effort. */
export async function recordLogin(email: string): Promise<void> {
  await query(
    'UPDATE okr_users SET last_login_at=now(), login_count=login_count+1 WHERE lower(email)=lower($1)',
    [email],
  );
}

/** Cập nhật avatar Google (gọi lúc đăng nhập). Best-effort, chỉ ghi khi đổi. */
export async function setUserAvatar(email: string, url: string): Promise<void> {
  await query(
    'UPDATE okr_users SET avatar_url=$2 WHERE lower(email)=lower($1) AND avatar_url IS DISTINCT FROM $2',
    [email, url],
  );
  invalidateUser(email);
}

// Cache ngắn allowlist (jwt callback gọi mỗi lần auth()).
const TTL = 45_000;
const cache = new Map<string, { at: number; user: OkrUser | null }>();

export function invalidateUser(email?: string) {
  if (email) cache.delete(email.toLowerCase());
  else cache.clear();
}

export async function getUser(email: string): Promise<OkrUser | null> {
  const key = email.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.user;
  const user = await queryOne<OkrUser>(
    `SELECT email, display_name, title, role, unit_id, is_active, notify_email, avatar_url, perm_group, calendar_enabled
       FROM okr_users WHERE lower(email) = lower($1)`,
    [email],
  );
  cache.set(key, { at: Date.now(), user });
  return user;
}

export async function listUsers(): Promise<
  (OkrUser & { unit_name: string | null; unit_code: string | null; unit_type: string | null })[]
> {
  return query(
    `SELECT u.email, u.display_name, u.title, u.role, u.unit_id, u.is_active, u.notify_email, u.avatar_url,
            u.perm_group, u.calendar_enabled, n.name AS unit_name, n.code AS unit_code, n.type AS unit_type
       FROM okr_users u
       LEFT JOIN okr_units n ON n.id = u.unit_id
      ORDER BY CASE u.role WHEN 'exec' THEN 0 WHEN 'ceo' THEN 0 WHEN 'cfo' THEN 0 WHEN 'division_lead' THEN 1
                           WHEN 'dept_lead' THEN 2 WHEN 'function_lead' THEN 2 ELSE 3 END,
               u.display_name NULLS LAST, u.email`,
  );
}

export async function countActiveExecs(): Promise<number> {
  const r = await queryOne<{ n: number }>(
    "SELECT count(*)::int AS n FROM okr_users WHERE role IN ('exec','ceo','cfo') AND is_active=true",
  );
  return r?.n ?? 0;
}

export async function upsertUser(input: {
  email: string;
  display_name: string | null;
  title: string | null;
  role: Role;
  unit_id: string | null;
  perm_group?: string | null;
}): Promise<void> {
  await query(
    `INSERT INTO okr_users (email, display_name, title, role, unit_id, perm_group)
       VALUES (lower($1), $2, $3, $4, $5, $6)
     ON CONFLICT (email) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       title        = EXCLUDED.title,
       role         = EXCLUDED.role,
       unit_id      = EXCLUDED.unit_id,
       perm_group   = EXCLUDED.perm_group,
       updated_at   = now()`,
    [input.email, input.display_name, input.title, input.role, input.unit_id, input.perm_group ?? null],
  );
  invalidateUser(input.email);
}

// Mọi cột (bảng, cột) đang LƯU email người dùng — dùng để "dời" toàn bộ dữ liệu/lịch sử khi ĐỔI EMAIL.
// Nguồn: introspection DB 30/08 (FK owner_email + các cột *_email/created_by/actor…). KHÔNG gồm
// okr_users.notify_email (boolean) và 2 cột xử lý riêng bên dưới: okr_meeting_participants.email
// (unique meeting_id,email → gỡ trùng trước) & okr_google_tokens.email (token OAuth → xoá của email mới trước).
const EMAIL_REF_COLS: readonly [string, string][] = [
  ['okr_audit_log', 'actor'],
  ['okr_budget_lines', 'created_by'],
  ['okr_checkins', 'author_email'],
  ['okr_comments', 'author_email'],
  ['okr_error_log', 'user_email'],
  ['okr_google_tokens', 'email'],
  ['okr_initiatives', 'created_by'],
  ['okr_initiatives', 'owner_email'],
  ['okr_kpi_values', 'updated_by'],
  ['okr_kpis', 'created_by'],
  ['okr_meeting_access_requests', 'requester_email'],
  ['okr_meetings', 'created_by'],
  ['okr_meetings', 'minutes_updated_by'],
  ['okr_meetings', 'owner_email'],
  ['okr_meetings', 'secretary_email'],
  ['okr_notifications', 'actor_email'],
  ['okr_notifications', 'recipient_email'],
  ['okr_objectives', 'created_by'],
  ['okr_objectives', 'owner_email'],
  ['okr_projects', 'created_by'],
  ['okr_projects', 'owner_email'],
  ['okr_unit_versions', 'created_by'],
  ['okr_user_invites', 'email'],
  ['okr_user_invites', 'invited_by'],
];

/**
 * ĐỔI EMAIL đăng nhập của 1 người dùng (sửa email nhập sai). Vì email là KHOÁ CHÍNH của okr_users và
 * được nhiều bảng tham chiếu, thao tác chạy TRONG 1 GIAO DỊCH: tạo bản ghi user email mới (copy toàn bộ
 * hồ sơ) → dời MỌI tham chiếu (OKR/việc/dự án/họp/nhật ký/thông báo…) sang email mới → xoá bản ghi cũ.
 * Nguyên tử: lỗi bất kỳ → rollback, dữ liệu không đổi. Email mới lưu ở dạng chữ thường (như toàn hệ).
 */
export async function changeUserEmail(oldEmailRaw: string, newEmailRaw: string): Promise<void> {
  const oldEmail = (oldEmailRaw || '').trim();
  const newEmail = (newEmailRaw || '').trim().toLowerCase();
  if (!oldEmail) throw new Error('Thiếu email hiện tại.');
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) throw new Error('Email mới không hợp lệ.');
  if (newEmail === oldEmail.toLowerCase()) throw new Error('Email mới trùng với email hiện tại.');
  const dup = await queryOne(`SELECT 1 AS x FROM okr_users WHERE lower(email)=lower($1)`, [newEmail]);
  if (dup) throw new Error(`Email "${newEmail}" đã thuộc về một người dùng khác — không thể đổi trùng.`);
  const cur = await queryOne(`SELECT 1 AS x FROM okr_users WHERE lower(email)=lower($1)`, [oldEmail]);
  if (!cur) throw new Error('Không tìm thấy người dùng cần đổi email.');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 1) Tạo bản ghi user MỚI (copy đầy đủ hồ sơ) với email mới — FK con sẽ trỏ được vào đây.
    await client.query(
      `INSERT INTO okr_users
         (email, display_name, title, role, unit_id, is_active, created_at, updated_at,
          notify_email, avatar_url, perm_group, notif_prefs, last_login_at, login_count, calendar_enabled)
       SELECT $1, display_name, title, role, unit_id, is_active, created_at, now(),
          notify_email, avatar_url, perm_group, notif_prefs, last_login_at, login_count, calendar_enabled
       FROM okr_users WHERE lower(email)=lower($2)`,
      [newEmail, oldEmail],
    );
    // 2) Người dự họp: unique (meeting_id,email) → gỡ dòng trùng của email mới trước khi trỏ.
    await client.query(
      `DELETE FROM okr_meeting_participants WHERE lower(email)=lower($1)
         AND meeting_id IN (SELECT meeting_id FROM okr_meeting_participants WHERE lower(email)=lower($2))`,
      [newEmail, oldEmail],
    );
    await client.query(`UPDATE okr_meeting_participants SET email=$1 WHERE lower(email)=lower($2)`, [newEmail, oldEmail]);
    // 2b) Token Google (OAuth lịch) khoá theo email → xoá token của email mới (nếu có) rồi để bước 3 trỏ.
    await client.query(`DELETE FROM okr_google_tokens WHERE lower(email)=lower($1)`, [newEmail]);
    // 3) Dời mọi tham chiếu email còn lại.
    for (const [t, c] of EMAIL_REF_COLS) {
      await client.query(`UPDATE ${t} SET ${c}=$1 WHERE lower(${c})=lower($2)`, [newEmail, oldEmail]);
    }
    // 4) Xoá bản ghi user cũ (mọi tham chiếu đã dời xong).
    await client.query(`DELETE FROM okr_users WHERE lower(email)=lower($1)`, [oldEmail]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  invalidateUser(oldEmail);
  invalidateUser(newEmail);
}
export async function setUserGroup(email: string, group: string | null): Promise<void> {
  await query('UPDATE okr_users SET perm_group=$2, updated_at=now() WHERE lower(email)=lower($1)', [
    email,
    group,
  ]);
  invalidateUser(email);
}

export async function setUserActive(email: string, active: boolean): Promise<void> {
  await query('UPDATE okr_users SET is_active=$2, updated_at=now() WHERE lower(email)=lower($1)', [
    email,
    active,
  ]);
  invalidateUser(email);
}

export async function removeUser(email: string): Promise<void> {
  await query('DELETE FROM okr_users WHERE lower(email)=lower($1)', [email]);
  invalidateUser(email);
}
