import { query, queryOne } from './db';

// Nhật ký lỗi hệ thống — ghi/đọc (best-effort, KHÔNG để lỗi-của-lỗi phá app).

export type ErrLogInput = {
  kind?: 'client' | 'server';
  path?: string | null;
  digest?: string | null;
  message?: string | null;
  detail?: string | null;
  user_email?: string | null;
};

export async function logError(e: ErrLogInput): Promise<void> {
  try {
    const msg = (e.message ?? '').slice(0, 2000) || null;
    const detail = (e.detail ?? '').slice(0, 4000) || null;
    await query(
      `INSERT INTO okr_error_log (kind, path, digest, message, detail, user_email)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (digest) WHERE digest IS NOT NULL
       DO UPDATE SET count = okr_error_log.count + 1, created_at = now(), resolved = false,
                     path = EXCLUDED.path,
                     message = COALESCE(EXCLUDED.message, okr_error_log.message),
                     user_email = EXCLUDED.user_email`,
      [e.kind ?? 'client', e.path ?? null, e.digest ?? null, msg, detail, e.user_email ?? null],
    );
  } catch {
    /* nuốt lỗi: nhật ký lỗi không được phép làm hỏng luồng chính */
  }
}

export type ErrRow = {
  id: string; created_at: string; kind: string; path: string | null; digest: string | null;
  message: string | null; detail: string | null; user_email: string | null; count: number; resolved: boolean;
};

export async function listRecentErrors(limit = 100): Promise<ErrRow[]> {
  return query<ErrRow>(
    `SELECT id::text, created_at::text, kind, path, digest, message, detail, user_email, count, resolved
       FROM okr_error_log ORDER BY resolved ASC, created_at DESC LIMIT $1`,
    [limit],
  ).catch(() => []);
}

export async function unresolvedErrorCount(): Promise<number> {
  const r = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM okr_error_log WHERE resolved = false`,
  ).catch(() => null);
  return r?.n ?? 0;
}

export async function setErrorResolved(id: string, resolved: boolean): Promise<void> {
  await query(`UPDATE okr_error_log SET resolved = $2 WHERE id = $1::bigint`, [id, resolved]);
}
