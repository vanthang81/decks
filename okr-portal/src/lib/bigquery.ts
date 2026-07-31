import { queryOne } from './db';

// Truy vấn BigQuery qua Metabase — TÁI DÙNG hạ tầng price-engine:
// config `{url, api_key}` lưu ở Postgres pe_pricing_config key 'metabase',
// gọi POST {url}/api/dataset (database 5 = BigQuery btmh-dwh-485609). Best-effort.

let cached: { url: string; api_key: string } | null | undefined;

async function getMetabase(): Promise<{ url: string; api_key: string } | null> {
  if (cached !== undefined) return cached;
  try {
    const row = await queryOne<{ value: unknown }>(
      "SELECT value FROM pe_pricing_config WHERE key='metabase'",
    );
    const v = row?.value;
    const cfg = (typeof v === 'string' ? JSON.parse(v) : v) as {
      url?: string;
      api_key?: string;
    } | null;
    cached = cfg?.url && cfg?.api_key ? { url: cfg.url, api_key: cfg.api_key } : null;
  } catch {
    cached = null;
  }
  return cached;
}

export async function bqQuery(sql: string): Promise<Record<string, unknown>[]> {
  const mb = await getMetabase();
  if (!mb) throw new Error('Chưa cấu hình Metabase (pe_pricing_config.metabase)');
  const res = await fetch(`${mb.url}/api/dataset`, {
    method: 'POST',
    headers: { 'x-api-key': mb.api_key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ database: 5, type: 'native', native: { query: sql } }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Metabase ${res.status}`);
  const j = await res.json();
  const cols: string[] = (j.data?.cols ?? []).map((c: { name: string }) => c.name);
  return (j.data?.rows ?? []).map((r: unknown[]) =>
    Object.fromEntries(cols.map((c, i) => [c, r[i]])),
  );
}

/** Trả ô đầu tiên của hàng đầu tiên dưới dạng số (null nếu rỗng/không phải số). */
export async function bqScalar(sql: string): Promise<number | null> {
  const rows = await bqQuery(sql);
  if (!rows.length) return null;
  const v = Object.values(rows[0])[0];
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : null;
}
