import { query, queryOne } from './db';
import type { Role } from './rbac';

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
};

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
    `SELECT email, display_name, title, role, unit_id, is_active, notify_email, avatar_url, perm_group
       FROM okr_users WHERE lower(email) = lower($1)`,
    [email],
  );
  cache.set(key, { at: Date.now(), user });
  return user;
}

export async function listUsers(): Promise<
  (OkrUser & { unit_name: string | null; unit_code: string | null })[]
> {
  return query(
    `SELECT u.email, u.display_name, u.title, u.role, u.unit_id, u.is_active, u.notify_email, u.avatar_url,
            u.perm_group, n.name AS unit_name, n.code AS unit_code
       FROM okr_users u
       LEFT JOIN okr_units n ON n.id = u.unit_id
      ORDER BY CASE u.role WHEN 'exec' THEN 0 WHEN 'division_lead' THEN 1
                           WHEN 'dept_lead' THEN 2 ELSE 3 END,
               u.display_name NULLS LAST, u.email`,
  );
}

export async function countActiveExecs(): Promise<number> {
  const r = await queryOne<{ n: number }>(
    "SELECT count(*)::int AS n FROM okr_users WHERE role='exec' AND is_active=true",
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

/** Gán Nhóm quyền cho 1 người (null = suy theo vai trò). */
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
