import { query, queryOne } from './db';

// Sinh mã unique cho Objective/KR/Initiative theo định dạng:
//   Objective:  <PREFIX>-O<n>     (PREFIX = mã đơn vị, hoặc 'CTY' cho công ty/chiến lược)
//   KeyResult:  <objCode>.KR<m>
//   Initiative: <objCode>.H<kk>   (kk = 2 chữ số)

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function maxNum(codes: (string | null)[], re: RegExp): number {
  let m = 0;
  for (const c of codes) {
    const x = c?.match(re);
    if (x) m = Math.max(m, Number(x[1]));
  }
  return m;
}

export async function objPrefix(unitId: string | null): Promise<string> {
  if (!unitId) return 'CTY';
  const r = await queryOne<{ code: string | null }>('SELECT code FROM okr_units WHERE id=$1', [unitId]);
  return r?.code ?? 'CTY';
}

export async function nextObjectiveCode(unitId: string | null): Promise<string> {
  const p = await objPrefix(unitId);
  const rows = await query<{ code: string | null }>(
    `SELECT code FROM okr_objectives WHERE code LIKE $1`,
    [p + '-O%'],
  );
  const n = maxNum(rows.map((r) => r.code), new RegExp('^' + escapeRe(p) + '-O(\\d+)$')) + 1;
  return `${p}-O${n}`;
}

export async function nextKrCode(objectiveId: string): Promise<string | null> {
  const o = await queryOne<{ code: string | null }>('SELECT code FROM okr_objectives WHERE id=$1', [objectiveId]);
  const oc = o?.code;
  if (!oc) return null;
  const rows = await query<{ code: string | null }>(
    `SELECT code FROM okr_key_results WHERE objective_id=$1 AND code LIKE $2`,
    [objectiveId, oc + '.KR%'],
  );
  const n = maxNum(rows.map((r) => r.code), new RegExp('\\.KR(\\d+)$')) + 1;
  return `${oc}.KR${n}`;
}

export async function nextInitCode(objectiveId: string | null): Promise<string | null> {
  if (!objectiveId) return null;
  const o = await queryOne<{ code: string | null }>('SELECT code FROM okr_objectives WHERE id=$1', [objectiveId]);
  const oc = o?.code;
  if (!oc) return null;
  const rows = await query<{ code: string | null }>(
    `SELECT code FROM okr_initiatives WHERE objective_id=$1 AND code LIKE $2`,
    [objectiveId, oc + '.H%'],
  );
  const n = maxNum(rows.map((r) => r.code), new RegExp('\\.H(\\d+)$')) + 1;
  return `${oc}.H${String(n).padStart(2, '0')}`;
}
