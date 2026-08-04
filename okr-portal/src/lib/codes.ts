import { query, queryOne } from './db';

// Sinh mã unique cho Objective/KeyResult/Initiative/Project theo BỘ ĐẾM BỀN
// (bảng okr_code_seq) — tăng đơn điệu, atomic (an toàn khi tạo đồng thời) và
// KHÔNG TÁI DÙNG số đã cấp, kể cả sau khi xoá mục (mã luôn trỏ về đúng 1 mục).
//   Objective:  <PREFIX>-O<n>     (PREFIX = mã đơn vị, hoặc 'CTY' cho công ty/chiến lược)
//   KeyResult:  <objCode>.KR<m>
//   Initiative: <objCode>.H<kk>   (kk = 2 chữ số)
//   Project:    PRJ-<nn>          (nn = 2 chữ số, toàn cục)
//
// CHỐNG LỆCH BỘ ĐẾM (self-heal): dữ liệu seed / import chèn mã tường minh mà KHÔNG tăng
// okr_code_seq → bộ đếm tụt hậu so với mã thực có → sinh trùng mã (lỗi 23505). Vì vậy mỗi lần
// sinh mã, ta lấy `floor` = số lớn nhất đang tồn tại theo tiền tố rồi ép bộ đếm nhảy QUA nó.

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');

/** Tăng bộ đếm của 1 phạm vi (atomic), ép qua `floor` (số lớn nhất đã tồn tại). Trả về giá trị mới. */
async function bumpSeq(scopeKey: string, floor = 0): Promise<number> {
  const r = await queryOne<{ last_val: number }>(
    `INSERT INTO okr_code_seq (scope_key, last_val) VALUES ($1, GREATEST(1, $2 + 1))
       ON CONFLICT (scope_key) DO UPDATE SET last_val = GREATEST(okr_code_seq.last_val, $2) + 1
     RETURNING last_val`,
    [scopeKey, floor],
  );
  return r!.last_val;
}

/** Số lớn nhất đang tồn tại trong cột code khớp mẫu (mẫu có ĐÚNG 1 nhóm bắt số). */
async function maxNum(table: 'okr_objectives' | 'okr_key_results' | 'okr_initiatives' | 'okr_projects', pattern: string): Promise<number> {
  const r = await queryOne<{ n: number | null }>(
    `SELECT MAX((substring(code from $1))::int) AS n FROM ${table} WHERE code ~ $1`,
    [pattern],
  );
  return r?.n ?? 0;
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
  const floor = await maxNum('okr_objectives', `^${escRe(p)}-O([0-9]+)$`);
  const n = await bumpSeq(`O:${p}`, floor);
  return `${p}-O${n}`;
}

export async function nextKrCode(objectiveId: string): Promise<string | null> {
  const oc = await objCode(objectiveId);
  if (!oc) return null;
  const floor = await maxNum('okr_key_results', `^${escRe(oc)}\\.KR([0-9]+)$`);
  const m = await bumpSeq(`KR:${oc}`, floor);
  return `${oc}.KR${m}`;
}

export async function nextInitCode(objectiveId: string | null): Promise<string | null> {
  if (!objectiveId) return null;
  const oc = await objCode(objectiveId);
  if (!oc) return null;
  const floor = await maxNum('okr_initiatives', `^${escRe(oc)}\\.H([0-9]+)$`);
  const n = await bumpSeq(`H:${oc}`, floor);
  return `${oc}.H${String(n).padStart(2, '0')}`;
}

export async function nextProjectCode(): Promise<string> {
  const floor = await maxNum('okr_projects', `^PRJ-([0-9]+)$`);
  const n = await bumpSeq('PRJ', floor);
  return `PRJ-${String(n).padStart(2, '0')}`;
}
