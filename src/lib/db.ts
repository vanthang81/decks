import { Pool, types, type QueryResultRow } from 'pg';

// pg trả bigint (int8, OID 20) dạng STRING → ép về number (an toàn < 2^53).
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

declare global {
  // eslint-disable-next-line no-var
  var _deckPool: Pool | undefined;
}

const pool =
  global._deckPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
    application_name: 'decks-portal',
  });

if (process.env.NODE_ENV !== 'production') global._deckPool = pool;

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
