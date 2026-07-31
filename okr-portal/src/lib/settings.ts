import { query, queryOne } from './db';

// Cấu hình hệ thống dạng key → JSON (bảng okr_settings).
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await queryOne<{ value: unknown }>(
      'SELECT value FROM okr_settings WHERE key=$1',
      [key],
    );
    const v = row?.value;
    if (v == null) return fallback;
    return (typeof v === 'string' ? JSON.parse(v) : v) as T;
  } catch {
    return fallback;
  }
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await query(
    `INSERT INTO okr_settings (key, value) VALUES ($1, $2::jsonb)
     ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`,
    [key, JSON.stringify(value)],
  );
}
