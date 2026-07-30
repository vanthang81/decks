import { Pool, types, type QueryResultRow } from 'pg';

// pg trả bigint (int8, OID 20) + numeric (OID 1700) dạng STRING.
// bigint → number (an toàn < 2^53). numeric giữ nguyên xử lý ở tầng gọi (ép Number khi cần).
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

declare global {
  // eslint-disable-next-line no-var
  var _okrPool: Pool | undefined;
}

const pool =
  global._okrPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
    application_name: 'okr-portal',
  });

if (process.env.NODE_ENV !== 'production') global._okrPool = pool;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await pool.query<T>(text, params as never[]);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export { pool };
