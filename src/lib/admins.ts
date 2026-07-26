import { query, queryOne } from './db';

export type AdminRole = 'admin' | 'editor';
export type DeckAdmin = {
  email: string;
  display_name: string | null;
  role: AdminRole;
  is_active: boolean;
};

// Cache ngắn allowlist (jwt callback gọi mỗi lần auth()).
const TTL = 45_000;
const cache = new Map<string, { at: number; user: DeckAdmin | null }>();
export function invalidateAdmin(email?: string) {
  if (email) cache.delete(email.toLowerCase());
  else cache.clear();
}

export async function getAdmin(email: string): Promise<DeckAdmin | null> {
  const key = email.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.user;
  const user = await queryOne<DeckAdmin>(
    'SELECT email, display_name, role, is_active FROM deck_admins WHERE lower(email) = lower($1)',
    [email],
  );
  cache.set(key, { at: Date.now(), user });
  return user;
}

export async function listAdmins(): Promise<DeckAdmin[]> {
  return query<DeckAdmin>(
    'SELECT email, display_name, role, is_active FROM deck_admins ORDER BY created_at',
  );
}

export async function countActiveAdmins(): Promise<number> {
  const r = await queryOne<{ n: number }>(
    "SELECT count(*)::int AS n FROM deck_admins WHERE role='admin' AND is_active=true",
  );
  return r?.n ?? 0;
}

export async function addAdmin(email: string, role: AdminRole, displayName: string | null): Promise<void> {
  await query(
    `INSERT INTO deck_admins (email, role, display_name) VALUES (lower($1),$2,$3)
     ON CONFLICT (email) DO UPDATE SET role=EXCLUDED.role,
       display_name=COALESCE(EXCLUDED.display_name, deck_admins.display_name),
       is_active=true, updated_at=now()`,
    [email, role, displayName],
  );
  invalidateAdmin(email);
}

export async function setAdminActive(email: string, active: boolean): Promise<void> {
  await query('UPDATE deck_admins SET is_active=$2, updated_at=now() WHERE lower(email)=lower($1)', [email, active]);
  invalidateAdmin(email);
}

export async function setAdminRole(email: string, role: AdminRole): Promise<void> {
  await query('UPDATE deck_admins SET role=$2, updated_at=now() WHERE lower(email)=lower($1)', [email, role]);
  invalidateAdmin(email);
}

export async function removeAdmin(email: string): Promise<void> {
  await query('DELETE FROM deck_admins WHERE lower(email)=lower($1)', [email]);
  invalidateAdmin(email);
}
