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
