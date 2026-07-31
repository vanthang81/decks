import { query, queryOne } from './db';
import type { OkrUser } from './users';
import { manageScope, type Unit } from './org';
import { nextObjectiveCode, nextKrCode } from './codes';

export type Level = 'company' | 'division' | 'department' | 'individual';

// Objective + KR của nó (cho bộ chọn khi thêm việc vào dự án — việc gắn vào O/KR nào
// của bộ phận thì hiện luôn ở action plan của bộ phận đó).
export type ObjectiveWithKrs = {
  id: string;
  code: string | null;
  title: string;
  unit_name: string | null;
  krs: { id: string; code: string | null; title: string }[];
};

export async function listObjectivesWithKrs(periodId: string): Promise<ObjectiveWithKrs[]> {
  return query<ObjectiveWithKrs>(
    `SELECT o.id, o.code, o.title, u.name AS unit_name,
            COALESCE(
              json_agg(json_build_object('id', k.id, 'code', k.code, 'title', k.title)
                       ORDER BY k.code) FILTER (WHERE k.id IS NOT NULL),
              '[]'
            ) AS krs
       FROM okr_objectives o
       LEFT JOIN okr_units u ON u.id = o.unit_id
       LEFT JOIN okr_key_results k ON k.objective_id = o.id
      WHERE o.period_id = $1
      GROUP BY o.id, o.code, o.title, u.name, u.code, o.sort
      ORDER BY u.code NULLS FIRST, o.code`,
    [periodId],
  );
}
export type ObjStatus = 'draft' | 'active' | 'done' | 'archived';
export type MetricType = 'number' | 'percent' | 'currency' | 'boolean';
export type Direction = 'increase' | 'decrease';
export type OkrType = 'committed' | 'aspirational' | 'learning';
export type Indicator = 'leading' | 'lagging';

export const LEVEL_LABEL: Record<Level, string> = {
  company: 'Công ty',
  division: 'Khối',
  department: 'Phòng ban',
  individual: 'Cá nhân',
};

// #1 Loại OKR — kỳ vọng điểm khác nhau (best practice: cam kết ~100%, khát vọng ~70%).
export const OKR_TYPE_LABEL: Record<OkrType, string> = {
  committed: 'Cam kết',
  aspirational: 'Khát vọng',
  learning: 'Học hỏi',
};
export const OKR_TYPE_EXPECT: Record<OkrType, string> = {
  committed: 'Kỳ vọng đạt ~100%; không đạt cần giải trình.',
  aspirational: 'Mục tiêu đột phá, kỳ vọng ~70%, chấp nhận rủi ro.',
  learning: 'Ưu tiên học hỏi/khám phá, không ép điểm.',
};

// #2 Nhãn chỉ số KR — dẫn dắt (hành động) vs kết quả (đầu ra cuối).
export const INDICATOR_LABEL: Record<Indicator, string> = {
  leading: 'Dẫn dắt',
  lagging: 'Kết quả',
};

// #5 Guardrail số lượng (best practice: tập trung ít mục tiêu ưu tiên).
export const MAX_KR = 5;
export const MAX_OBJ_PER_OWNER = 5;
export const MAX_LEADING = 3;

export type Objective = {
  id: string;
  code: string | null;
  period_id: string;
  parent_id: string | null;
  level: Level;
  unit_id: string | null;
  owner_email: string | null;
  title: string;
  description: string | null;
  status: ObjStatus;
  okr_type: OkrType;
  progress: number;
  sort: number;
  created_by: string | null;
};

export type ObjectiveRow = Objective & {
  unit_name: string | null;
  unit_code: string | null;
  owner_name: string | null;
  kr_count: number;
};

export type KeyResult = {
  id: string;
  code: string | null;
  objective_id: string;
  title: string;
  metric_type: MetricType;
  direction: Direction;
  unit_label: string | null;
  start_value: number;
  target_value: number;
  current_value: number;
  weight: number;
  kpi_source: string | null;
  indicator: Indicator;
  progress: number;
  sort: number;
};

// ---------- Tính toán progress ----------

export function computeKrProgress(kr: {
  metric_type: MetricType;
  direction: Direction;
  start_value: number;
  target_value: number;
  current_value: number;
}): number {
  const { start_value: s, target_value: t, current_value: c } = kr;
  if (kr.metric_type === 'boolean') return c >= 1 ? 100 : 0;
  const denom = kr.direction === 'increase' ? t - s : s - t;
  if (denom === 0) {
    // start == target: đạt mốc thì 100.
    const hit = kr.direction === 'increase' ? c >= t : c <= t;
    return hit ? 100 : 0;
  }
  const num = kr.direction === 'increase' ? c - s : s - c;
  const p = (num / denom) * 100;
  return Math.max(0, Math.min(100, Math.round(p * 100) / 100));
}

// ---------- Truy vấn ----------

const OBJ_SELECT = `
  SELECT o.id, o.code, o.period_id, o.parent_id, o.level, o.unit_id, o.owner_email,
         o.title, o.description, o.status, o.okr_type, o.progress::float8 AS progress, o.sort, o.created_by,
         n.name AS unit_name, n.code AS unit_code,
         u.display_name AS owner_name,
         (SELECT count(*)::int FROM okr_key_results k WHERE k.objective_id=o.id) AS kr_count
    FROM okr_objectives o
    LEFT JOIN okr_units n ON n.id = o.unit_id
    LEFT JOIN okr_users u ON u.email = o.owner_email`;

export async function listObjectivesByPeriod(periodId: string): Promise<ObjectiveRow[]> {
  return query<ObjectiveRow>(`${OBJ_SELECT} WHERE o.period_id=$1 ORDER BY
      CASE o.level WHEN 'company' THEN 0 WHEN 'division' THEN 1 WHEN 'department' THEN 2 ELSE 3 END,
      o.sort, o.created_at`, [periodId]);
}

export async function getObjective(id: string): Promise<ObjectiveRow | null> {
  return queryOne<ObjectiveRow>(`${OBJ_SELECT} WHERE o.id=$1`, [id]);
}

export async function listChildObjectives(parentId: string): Promise<ObjectiveRow[]> {
  return query<ObjectiveRow>(`${OBJ_SELECT} WHERE o.parent_id=$1 ORDER BY o.sort, o.created_at`, [
    parentId,
  ]);
}

export async function listObjectivesForOwner(
  email: string,
  periodId: string,
): Promise<ObjectiveRow[]> {
  return query<ObjectiveRow>(
    `${OBJ_SELECT} WHERE o.period_id=$2 AND lower(o.owner_email)=lower($1)
       ORDER BY o.sort, o.created_at`,
    [email, periodId],
  );
}

// #5 Guardrail: người chủ trì có > MAX_OBJ_PER_OWNER OKR trong kỳ (cảnh báo, không chặn).
export async function ownersOverObjectiveLimit(
  periodId: string,
): Promise<{ owner_email: string; owner_name: string | null; n: number }[]> {
  return query(
    `SELECT o.owner_email, u.display_name AS owner_name, count(*)::int AS n
       FROM okr_objectives o LEFT JOIN okr_users u ON u.email=o.owner_email
      WHERE o.period_id=$1 AND o.owner_email IS NOT NULL
      GROUP BY o.owner_email, u.display_name
      HAVING count(*) > $2
      ORDER BY n DESC`,
    [periodId, MAX_OBJ_PER_OWNER],
  );
}

export async function listKeyResults(objectiveId: string): Promise<KeyResult[]> {
  return query<KeyResult>(
    `SELECT id, code, objective_id, title, metric_type, direction, unit_label,
            start_value::float8 AS start_value, target_value::float8 AS target_value,
            current_value::float8 AS current_value, weight::float8 AS weight,
            kpi_source, indicator, progress::float8 AS progress, sort
       FROM okr_key_results WHERE objective_id=$1 ORDER BY sort, created_at`,
    [objectiveId],
  );
}

export async function getKeyResult(id: string): Promise<KeyResult | null> {
  return queryOne<KeyResult>(
    `SELECT id, code, objective_id, title, metric_type, direction, unit_label,
            start_value::float8 AS start_value, target_value::float8 AS target_value,
            current_value::float8 AS current_value, weight::float8 AS weight,
            kpi_source, indicator, progress::float8 AS progress, sort
       FROM okr_key_results WHERE id=$1`,
    [id],
  );
}

// ---------- Ghi ----------

export async function createObjective(input: {
  period_id: string;
  level: Level;
  unit_id: string | null;
  owner_email: string | null;
  parent_id: string | null;
  title: string;
  description: string | null;
  status: ObjStatus;
  okr_type: OkrType;
  created_by: string;
}): Promise<string> {
  const code = await nextObjectiveCode(input.unit_id);
  const row = await queryOne<{ id: string }>(
    `INSERT INTO okr_objectives (period_id, level, unit_id, owner_email, parent_id,
                                 title, description, status, okr_type, created_by, code)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [
      input.period_id,
      input.level,
      input.unit_id,
      input.owner_email,
      input.parent_id,
      input.title,
      input.description,
      input.status,
      input.okr_type,
      input.created_by,
      code,
    ],
  );
  return row!.id;
}

export async function updateObjective(
  id: string,
  input: { title: string; description: string | null; status: ObjStatus; parent_id: string | null },
): Promise<void> {
  await query(
    `UPDATE okr_objectives SET title=$2, description=$3, status=$4, parent_id=$5, updated_at=now()
       WHERE id=$1`,
    [id, input.title, input.description, input.status, input.parent_id],
  );
}

export async function deleteObjective(id: string): Promise<void> {
  await query('DELETE FROM okr_objectives WHERE id=$1', [id]);
}

export async function createKeyResult(input: {
  objective_id: string;
  title: string;
  metric_type: MetricType;
  direction: Direction;
  unit_label: string | null;
  start_value: number;
  target_value: number;
  current_value: number;
  weight: number;
  kpi_source: string | null;
  indicator: Indicator;
}): Promise<string> {
  const progress = computeKrProgress(input);
  const code = await nextKrCode(input.objective_id);
  const row = await queryOne<{ id: string }>(
    `INSERT INTO okr_key_results (objective_id, title, metric_type, direction, unit_label,
        start_value, target_value, current_value, weight, kpi_source, indicator, progress, code)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
    [
      input.objective_id,
      input.title,
      input.metric_type,
      input.direction,
      input.unit_label,
      input.start_value,
      input.target_value,
      input.current_value,
      input.weight,
      input.kpi_source,
      input.indicator,
      progress,
      code,
    ],
  );
  await recomputeUp(input.objective_id);
  return row!.id;
}

export async function setKeyResultValue(krId: string, current: number): Promise<void> {
  const kr = await getKeyResult(krId);
  if (!kr) return;
  const progress = computeKrProgress({ ...kr, current_value: current });
  await query('UPDATE okr_key_results SET current_value=$2, progress=$3, updated_at=now() WHERE id=$1', [
    krId,
    current,
    progress,
  ]);
  await recomputeUp(kr.objective_id);
}

/** Cập nhật đồng thời target (kế hoạch) + current (thực hiện) — dùng cho auto-sync KPI. */
export async function setKrAutoValues(
  krId: string,
  target: number | null,
  current: number | null,
): Promise<void> {
  const kr = await getKeyResult(krId);
  if (!kr) return;
  const t = target ?? kr.target_value;
  const c = current ?? kr.current_value;
  const progress = computeKrProgress({ ...kr, target_value: t, current_value: c });
  await query(
    'UPDATE okr_key_results SET target_value=$2, current_value=$3, progress=$4, updated_at=now() WHERE id=$1',
    [krId, t, c, progress],
  );
  await recomputeUp(kr.objective_id);
}

export async function deleteKeyResult(krId: string): Promise<void> {
  const kr = await getKeyResult(krId);
  await query('DELETE FROM okr_key_results WHERE id=$1', [krId]);
  if (kr) await recomputeUp(kr.objective_id);
}

/**
 * Tính lại progress của 1 objective từ Key Results (bình quân theo weight);
 * nếu không có KR thì lấy bình quân progress của objective con. Rồi cascade lên cha.
 */
export async function recomputeUp(objectiveId: string | null): Promise<void> {
  let cur = objectiveId;
  const guard = new Set<string>();
  while (cur && !guard.has(cur)) {
    guard.add(cur);
    const krs = await query<{ progress: number; weight: number }>(
      `SELECT progress::float8 AS progress, weight::float8 AS weight
         FROM okr_key_results WHERE objective_id=$1`,
      [cur],
    );
    let progress: number;
    if (krs.length) {
      const wsum = krs.reduce((a, k) => a + (k.weight || 0), 0) || krs.length;
      const acc = krs.reduce((a, k) => a + k.progress * (k.weight || 1), 0);
      progress = acc / (wsum || 1);
    } else {
      const kids = await query<{ progress: number }>(
        `SELECT progress::float8 AS progress FROM okr_objectives WHERE parent_id=$1`,
        [cur],
      );
      progress = kids.length ? kids.reduce((a, k) => a + k.progress, 0) / kids.length : 0;
    }
    progress = Math.round(progress * 100) / 100;
    const row = await queryOne<{ parent_id: string | null }>(
      'UPDATE okr_objectives SET progress=$2, updated_at=now() WHERE id=$1 RETURNING parent_id',
      [cur, progress],
    );
    cur = row?.parent_id ?? null;
  }
}

// ---------- Quyền sửa ----------

/**
 * Người dùng có được TẠO/SỬA objective này không?
 *  - exec: luôn được
 *  - owner (individual) hoặc created_by: được
 *  - lead: nếu unit của objective nằm trong phạm vi quản trị (subtree đơn vị mình)
 */
export function canManageObjective(
  user: OkrUser,
  obj: Pick<Objective, 'unit_id' | 'owner_email' | 'created_by'>,
  units: Unit[],
): boolean {
  if (user.role === 'exec') return true;
  const email = user.email.toLowerCase();
  if (obj.owner_email && obj.owner_email.toLowerCase() === email) return true;
  if (obj.created_by && obj.created_by.toLowerCase() === email) return true;
  const scope = manageScope(user, units);
  if (scope === null) return true;
  if (obj.unit_id && scope.has(obj.unit_id)) return true;
  return false;
}

/** Người dùng có được tạo objective ở level + unit chỉ định không (dùng cho form tạo mới). */
export function canCreateAt(
  user: OkrUser,
  level: Level,
  unitId: string | null,
  units: Unit[],
): boolean {
  if (user.role === 'exec') return true;
  if (level === 'individual') return true; // ai cũng tạo được OKR cá nhân của mình
  const scope = manageScope(user, units);
  if (scope === null) return true;
  return Boolean(unitId && scope.has(unitId));
}
