import { query, queryOne } from './db';

export type Period = {
  id: string;
  name: string;
  kind: 'quarter' | 'year';
  starts_on: string;
  ends_on: string;
  status: 'planning' | 'active' | 'closed';
  is_current: boolean;
};

export async function listPeriods(): Promise<Period[]> {
  return query<Period>(
    `SELECT id, name, kind, starts_on::text, ends_on::text, status, is_current
       FROM okr_periods ORDER BY starts_on DESC`,
  );
}

export async function getCurrentPeriod(): Promise<Period | null> {
  return queryOne<Period>(
    `SELECT id, name, kind, starts_on::text, ends_on::text, status, is_current
       FROM okr_periods WHERE is_current = true LIMIT 1`,
  );
}

export async function getPeriod(id: string): Promise<Period | null> {
  return queryOne<Period>(
    `SELECT id, name, kind, starts_on::text, ends_on::text, status, is_current
       FROM okr_periods WHERE id=$1`,
    [id],
  );
}

export async function createPeriod(input: {
  name: string;
  kind: 'quarter' | 'year';
  starts_on: string;
  ends_on: string;
}): Promise<void> {
  await query(
    `INSERT INTO okr_periods (name, kind, starts_on, ends_on, status)
     VALUES ($1,$2,$3,$4,'planning')`,
    [input.name, input.kind, input.starts_on, input.ends_on],
  );
}

/** Đặt kỳ hiện tại (bỏ cờ ở kỳ cũ, set cờ + status='active' cho kỳ mới). */
export async function setCurrentPeriod(id: string): Promise<void> {
  await query('UPDATE okr_periods SET is_current=false WHERE is_current=true');
  await query("UPDATE okr_periods SET is_current=true, status='active' WHERE id=$1", [id]);
}

export async function setPeriodStatus(
  id: string,
  status: 'planning' | 'active' | 'closed',
): Promise<void> {
  await query('UPDATE okr_periods SET status=$2 WHERE id=$1', [id, status]);
}
