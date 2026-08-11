import { query, queryOne } from './db';

export type PeriodKind = 'multiyear' | 'year' | 'quarter' | 'month';

export const PERIOD_KIND_LABEL: Record<PeriodKind, string> = {
  multiyear: 'Chiến lược nhiều năm',
  year: 'Năm',
  quarter: 'Quý',
  month: 'Tháng',
};
// Thứ tự cấp (nhỏ hơn = cao hơn) để sắp xếp/thụt.
export const PERIOD_KIND_RANK: Record<PeriodKind, number> = {
  multiyear: 0,
  year: 1,
  quarter: 2,
  month: 3,
};

export type Period = {
  id: string;
  name: string;
  kind: PeriodKind;
  parent_id: string | null;
  starts_on: string;
  ends_on: string;
  status: 'planning' | 'active' | 'closed';
  is_current: boolean;
};

const SELECT = `SELECT id, name, kind, parent_id, starts_on::text, ends_on::text, status, is_current
                  FROM okr_periods`;

export async function listPeriods(): Promise<Period[]> {
  return query<Period>(`${SELECT} ORDER BY starts_on ASC, name ASC`);
}

export async function getCurrentPeriod(): Promise<Period | null> {
  return queryOne<Period>(`${SELECT} WHERE is_current = true LIMIT 1`);
}

export async function getPeriod(id: string): Promise<Period | null> {
  return queryOne<Period>(`${SELECT} WHERE id=$1`, [id]);
}

export async function createPeriod(input: {
  name: string;
  kind: PeriodKind;
  parent_id: string | null;
  starts_on: string;
  ends_on: string;
}): Promise<void> {
  await query(
    `INSERT INTO okr_periods (name, kind, parent_id, starts_on, ends_on, status)
     VALUES ($1,$2,$3,$4,$5,'planning')`,
    [input.name, input.kind, input.parent_id, input.starts_on, input.ends_on],
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

/**
 * Sắp xếp kỳ theo cây phân cấp (parent_id) + trả về depth để thụt lề.
 * Con sắp theo starts_on. Kỳ mồ côi (parent không thuộc tập) coi như gốc.
 */
/** Toàn bộ kỳ HẬU DUỆ của `rootId` (quý/tháng dưới 1 năm; tháng dưới 1 quý…) theo thứ tự phân cấp. */
export function descendantPeriods(periods: Period[], rootId: string): Period[] {
  const byParent = new Map<string, Period[]>();
  for (const p of periods) {
    if (!p.parent_id) continue;
    const arr = byParent.get(p.parent_id) ?? [];
    arr.push(p);
    byParent.set(p.parent_id, arr);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => (a.starts_on < b.starts_on ? -1 : a.starts_on > b.starts_on ? 1 : 0));
  }
  const out: Period[] = [];
  const walk = (id: string) => {
    for (const c of byParent.get(id) ?? []) { out.push(c); walk(c.id); }
  };
  walk(rootId);
  return out;
}

export function orderPeriodsHierarchically(periods: Period[]): { period: Period; depth: number }[] {
  const byParent = new Map<string | null, Period[]>();
  const ids = new Set(periods.map((p) => p.id));
  for (const p of periods) {
    const key = p.parent_id && ids.has(p.parent_id) ? p.parent_id : null;
    const arr = byParent.get(key) ?? [];
    arr.push(p);
    byParent.set(key, arr);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => (a.starts_on < b.starts_on ? -1 : a.starts_on > b.starts_on ? 1 : 0));
  }
  const out: { period: Period; depth: number }[] = [];
  const walk = (parentKey: string | null, depth: number) => {
    for (const p of byParent.get(parentKey) ?? []) {
      out.push({ period: p, depth });
      walk(p.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}
