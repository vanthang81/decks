import { query, queryOne } from './db';

// Sinh mã unique cho Objective/KeyResult/Initiative/Project theo BỘ ĐẾM BỀN
// (bảng okr_code_seq) — tăng đơn điệu, atomic (an toàn khi tạo đồng thời) và
// KHÔNG TÁI DÙNG số đã cấp, kể cả sau khi xoá mục (mã luôn trỏ về đúng 1 mục).
//   Objective:  <PREFIX>-O<n>     (PREFIX = mã đơn vị, hoặc 'CTY' cho công ty/chiến lược)
//   KeyResult:  <objCode>.KR<m>
//   Initiative: <objCode>.H<kk>   (kk = 2 chữ số)
//   Project:    PRJ-<nn>          (nn = 2 chữ số, toàn cục)

/** Tăng bộ đếm của 1 phạm vi (atomic) và trả về giá trị mới. */
async function bumpSeq(scopeKey: string): Promise<number> {
  const r = await queryOne<{ last_val: number }>(
    `INSERT INTO okr_code_seq (scope_key, last_val) VALUES ($1, 1)
       ON CONFLICT (scope_key) DO UPDATE SET last_val = okr_code_seq.last_val + 1
     RETURNING last_val`,
    [scopeKey],
  );
  return r!.last_val;
}

export async function objPrefix(unitId: string | null): Promise<string> {
  if (!unitId) return 'CTY';
  const r = await queryOne<{ code: string | null }>('SELECT code FROM okr_units WHERE id=$1', [unitId]);
  return r?.code ?? 'CTY';
}

async function objCode(objectiveId: string): Promise<string | null> {
  const o = await queryOne<{ code: string | null }>('SELECT code FROM okr_objectives WHERE id=$1', [objectiveId]);
  return o?.code ?? null;
}

export async function nextObjectiveCode(unitId: string | null): Promise<string> {
  const p = await objPrefix(unitId);
  const n = await bumpSeq(`O:${p}`);
  return `${p}-O${n}`;
}

export async function nextKrCode(objectiveId: string): Promise<string | null> {
  const oc = await objCode(objectiveId);
  if (!oc) return null;
  const m = await bumpSeq(`KR:${oc}`);
  return `${oc}.KR${m}`;
}

export async function nextInitCode(objectiveId: string | null): Promise<string | null> {
  if (!objectiveId) return null;
  const oc = await objCode(objectiveId);
  if (!oc) return null;
  const n = await bumpSeq(`H:${oc}`);
  return `${oc}.H${String(n).padStart(2, '0')}`;
}

export async function nextProjectCode(): Promise<string> {
  const n = await bumpSeq('PRJ');
  return `PRJ-${String(n).padStart(2, '0')}`;
}
