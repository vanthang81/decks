import { query, queryOne } from './db';
import type { OkrUser } from './users';
import { nextInitCode } from './codes';

export type InitStatus = 'todo' | 'in_progress' | 'blocked' | 'done' | 'canceled';
export type Priority = 'low' | 'medium' | 'high';
// Loại nút trong cây thực thi: dự án → tiểu dự án → công việc/hành động.
export type InitKind = 'project' | 'subproject' | 'action';

export const INIT_STATUS_LABEL: Record<InitStatus, string> = {
  todo: 'Chưa làm',
  in_progress: 'Đang làm',
  blocked: 'Vướng',
  done: 'Xong',
  canceled: 'Huỷ',
};

export const INIT_KIND_LABEL: Record<InitKind, string> = {
  project: 'Dự án',
  subproject: 'Tiểu dự án',
  action: 'Công việc',
};

// Loại con hợp lệ khi thêm dưới 1 nút (project→subproject/action, subproject→action).
export const CHILD_KIND: Record<InitKind, InitKind[]> = {
  project: ['subproject', 'action'],
  subproject: ['action'],
  action: [],
};

export type Initiative = {
  id: string;
  code: string | null;
  objective_id: string | null;
  key_result_id: string | null;
  parent_id: string | null;
  kind: InitKind;
  title: string;
  description: string | null;
  owner_email: string | null;
  owner_name: string | null;
  unit_id: string | null;
  unit_name: string | null;
  project_id: string | null;
  project_name: string | null;
  project_code: string | null;
  meeting_id: string | null;
  meeting_code: string | null;
  meeting_title: string | null;
  objective_code: string | null;
  key_result_code: string | null;
  status: InitStatus;
  priority: Priority;
  progress: number;
  start_on: string | null;
  due_on: string | null;
  done_on: string | null;
  budget_planned: number;
  budget_actual: number;
  budget_currency: string;
  budget_source: string | null;
};

// Nút cây (có con) — dùng để render phân cấp.
export type InitiativeNode = Initiative & { children: InitiativeNode[]; depth: number };

const SELECT = `
  SELECT i.id, i.code, i.objective_id, i.key_result_id, i.parent_id, i.kind, i.title, i.description,
         i.owner_email, u.display_name AS owner_name, i.unit_id, un.name AS unit_name,
         i.project_id, pr.name AS project_name, pr.code AS project_code,
         i.meeting_id, mt.code AS meeting_code, mt.title AS meeting_title,
         obj.code AS objective_code, kr.code AS key_result_code,
         i.status, i.priority,
         i.progress::float8 AS progress, i.start_on::text, i.due_on::text, i.done_on::text,
         i.budget_planned::float8 AS budget_planned, i.budget_actual::float8 AS budget_actual,
         i.budget_currency, i.budget_source
    FROM okr_initiatives i
    LEFT JOIN okr_users u ON u.email = i.owner_email
    LEFT JOIN okr_units un ON un.id = i.unit_id
    LEFT JOIN okr_projects pr ON pr.id = i.project_id
    LEFT JOIN okr_meetings mt ON mt.id = i.meeting_id
    LEFT JOIN okr_objectives obj ON obj.id = i.objective_id
    LEFT JOIN okr_key_results kr ON kr.id = i.key_result_id`;

/** Toàn bộ initiative (mọi cấp) gắn với 1 objective (gồm KR con). Phẳng — dựng cây bằng buildInitiativeTree. */
export async function listInitiativesForObjective(objectiveId: string): Promise<Initiative[]> {
  return query<Initiative>(
    `${SELECT} WHERE i.objective_id=$1 OR i.key_result_id IN
       (SELECT id FROM okr_key_results WHERE objective_id=$1)
     ORDER BY CASE i.kind WHEN 'project' THEN 0 WHEN 'subproject' THEN 1 ELSE 2 END,
              i.due_on NULLS LAST, i.sort, i.created_at`,
    [objectiveId],
  );
}

/** Toàn bộ task thuộc 1 DỰ ÁN (xuyên nhiều OKR) — phẳng, dựng cây bằng buildInitiativeTree. */
export async function listInitiativesForProject(projectId: string): Promise<Initiative[]> {
  return query<Initiative>(
    `${SELECT} WHERE i.project_id=$1
     ORDER BY CASE i.kind WHEN 'project' THEN 0 WHEN 'subproject' THEN 1 ELSE 2 END,
              i.due_on NULLS LAST, i.sort, i.created_at`,
    [projectId],
  );
}

/** Toàn bộ task (hành động) gắn 1 CUỘC HỌP — phẳng, dựng cây bằng buildInitiativeTree. */
export async function listInitiativesForMeeting(meetingId: string): Promise<Initiative[]> {
  return query<Initiative>(
    `${SELECT} WHERE i.meeting_id=$1
     ORDER BY CASE i.kind WHEN 'project' THEN 0 WHEN 'subproject' THEN 1 ELSE 2 END,
              i.due_on NULLS LAST, i.sort, i.created_at`,
    [meetingId],
  );
}

// ---- Danh sách TOÀN BỘ công việc (xuyên mọi OKR/KR/dự án) cho trang /tasks ----
// Kèm đủ trường để lọc + kiểm quyền XEM (need-to-know): người giao (created_by),
// chủ trì OKR gốc + đơn vị OKR (COALESCE objective/kr→objective), chủ trì dự án, kỳ.
export type TaskRow = {
  id: string;
  code: string | null;
  kind: InitKind;
  title: string;
  status: InitStatus;
  priority: Priority;
  progress: number;
  start_on: string | null;
  due_on: string | null;
  owner_email: string | null;
  owner_name: string | null;
  owner_avatar: string | null;
  created_by: string | null;
  unit_id: string | null;
  unit_name: string | null;
  project_id: string | null;
  project_code: string | null;
  project_name: string | null;
  project_owner: string | null;
  objective_id: string | null; // OKR gốc HIỆU LỰC (i.objective_id hoặc kr.objective_id)
  objective_code: string | null;
  objective_title: string | null;
  objective_owner: string | null;
  objective_unit_id: string | null;
  objective_created_by: string | null;
  key_result_id: string | null;
  key_result_code: string | null;
  description: string | null;
  period_id: string | null;
  period_name: string | null;
  budget_planned: number;
  budget_actual: number;
};

const TASK_SELECT = `
  SELECT i.id, i.code, i.kind, i.title, i.status, i.priority, i.description,
         i.progress::float8 AS progress, i.start_on::text, i.due_on::text,
         i.owner_email, u.display_name AS owner_name, u.avatar_url AS owner_avatar, i.created_by,
         i.unit_id, un.name AS unit_name,
         i.project_id, pr.code AS project_code, pr.name AS project_name, pr.owner_email AS project_owner,
         eo.id AS objective_id, eo.code AS objective_code, eo.title AS objective_title,
         eo.owner_email AS objective_owner, eo.unit_id AS objective_unit_id, eo.created_by AS objective_created_by,
         i.key_result_id, kr.code AS key_result_code,
         eo.period_id, per.name AS period_name,
         i.budget_planned::float8 AS budget_planned, i.budget_actual::float8 AS budget_actual
    FROM okr_initiatives i
    LEFT JOIN okr_users u ON u.email = i.owner_email
    LEFT JOIN okr_units un ON un.id = i.unit_id
    LEFT JOIN okr_projects pr ON pr.id = i.project_id
    LEFT JOIN okr_key_results kr ON kr.id = i.key_result_id
    LEFT JOIN okr_objectives eo ON eo.id = COALESCE(i.objective_id, kr.objective_id)
    LEFT JOIN okr_periods per ON per.id = eo.period_id`;

/** Toàn bộ công việc trong hệ thống (mọi kỳ). Lọc quyền XEM ở tầng gọi (canViewInitiative). */
export async function listAllInitiatives(): Promise<TaskRow[]> {
  return query<TaskRow>(
    `${TASK_SELECT}
     ORDER BY CASE i.status WHEN 'blocked' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'todo' THEN 2
                            WHEN 'done' THEN 3 ELSE 4 END,
              i.due_on NULLS LAST, i.created_at`,
  );
}

/** Việc được giao cho 1 người (mọi cấp, còn mở). */
export async function listInitiativesForOwner(email: string): Promise<Initiative[]> {
  return query<Initiative>(
    `${SELECT} WHERE lower(i.owner_email)=lower($1) AND i.status NOT IN ('done','canceled')
     ORDER BY i.due_on NULLS LAST, i.sort`,
    [email],
  );
}

export async function getInitiative(id: string): Promise<Initiative | null> {
  return queryOne<Initiative>(`${SELECT} WHERE i.id=$1`, [id]);
}

/** Tìm id nút cha theo mã (trong cùng objective) — dùng khi import. */
export async function initIdByCode(objectiveId: string, code: string): Promise<string | null> {
  if (!code) return null;
  const r = await queryOne<{ id: string }>(
    'SELECT id FROM okr_initiatives WHERE objective_id=$1 AND code=$2',
    [objectiveId, code],
  );
  return r?.id ?? null;
}

/** Dựng cây từ danh sách phẳng (theo parent_id). Trả về các nút gốc (parent_id null). */
export function buildInitiativeTree(flat: Initiative[]): InitiativeNode[] {
  const byId = new Map<string, InitiativeNode>();
  flat.forEach((i) => byId.set(i.id, { ...i, children: [], depth: 0 }));
  const roots: InitiativeNode[] = [];
  byId.forEach((node) => {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const setDepth = (n: InitiativeNode, d: number) => {
    n.depth = d;
    n.children.forEach((c) => setDepth(c, d + 1));
  };
  roots.forEach((r) => setDepth(r, 0));
  return roots;
}

export async function createInitiative(input: {
  objective_id: string | null;
  key_result_id: string | null;
  parent_id: string | null;
  kind: InitKind;
  title: string;
  description: string | null;
  owner_email: string | null;
  unit_id: string | null;
  project_id: string | null;
  meeting_id?: string | null;
  status: InitStatus;
  priority: Priority;
  start_on: string | null;
  due_on: string | null;
  budget_planned: number;
  budget_actual: number;
  budget_source: string | null;
  created_by: string;
}): Promise<string> {
  const code = await nextInitCode(input.objective_id);
  const row = await queryOne<{ id: string }>(
    `INSERT INTO okr_initiatives (objective_id, key_result_id, parent_id, kind, title, description,
        owner_email, unit_id, project_id, meeting_id, status, priority, start_on, due_on, budget_planned, budget_actual, budget_source, created_by, code)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`,
    [
      input.objective_id,
      input.key_result_id,
      input.parent_id,
      input.kind,
      input.title,
      input.description,
      input.owner_email,
      input.unit_id,
      input.project_id,
      input.meeting_id ?? null,
      input.status,
      input.priority,
      input.start_on,
      input.due_on,
      input.budget_planned,
      input.budget_actual,
      input.budget_source,
      input.created_by,
      code,
    ],
  );
  if (input.parent_id) await recomputeInitiativeUp(input.parent_id);
  return row!.id;
}

/** Cập nhật trạng thái + tiến độ (nút lá). done → progress 100. Rồi roll-up lên cha. */
export async function setInitiativeProgress(
  id: string,
  input: { status: InitStatus; progress: number },
): Promise<void> {
  const prog = input.status === 'done' ? 100 : Math.max(0, Math.min(100, input.progress));
  await query(
    `UPDATE okr_initiatives SET status=$2, progress=$3,
        done_on = CASE WHEN $2='done' AND done_on IS NULL THEN now()::date
                       WHEN $2<>'done' THEN NULL ELSE done_on END,
        updated_at=now() WHERE id=$1`,
    [id, input.status, prog],
  );
  await recomputeInitiativeUp(id);
}

/** Chỉ đổi trạng thái (dùng cho kéo-thả Kanban) — giữ nguyên progress, trừ done→100. Roll-up lên cha. */
export async function setInitiativeStatus(id: string, status: InitStatus): Promise<void> {
  await query(
    `UPDATE okr_initiatives SET status=$2,
        progress = CASE WHEN $2='done' THEN 100 ELSE progress END,
        done_on = CASE WHEN $2='done' AND done_on IS NULL THEN now()::date
                       WHEN $2<>'done' THEN NULL ELSE done_on END,
        updated_at=now() WHERE id=$1`,
    [id, status],
  );
  await recomputeInitiativeUp(id);
}

/** Cập nhật đầy đủ (quản lý): trạng thái, tiến độ, ngân sách, người phụ trách, hạn. */
export async function updateInitiative(
  id: string,
  input: {
    status: InitStatus;
    progress: number;
    owner_email: string | null;
    unit_id: string | null;
    priority: Priority;
    due_on: string | null;
    budget_planned: number;
    budget_actual: number;
  },
): Promise<void> {
  const prog = input.status === 'done' ? 100 : Math.max(0, Math.min(100, input.progress));
  await query(
    `UPDATE okr_initiatives SET status=$2, progress=$3, owner_email=$4, priority=$5, due_on=$6,
        budget_planned=$7, budget_actual=$8, unit_id=$9,
        done_on = CASE WHEN $2='done' AND done_on IS NULL THEN now()::date
                       WHEN $2<>'done' THEN NULL ELSE done_on END,
        updated_at=now() WHERE id=$1`,
    [id, input.status, prog, input.owner_email, input.priority, input.due_on,
     input.budget_planned, input.budget_actual, input.unit_id],
  );
  await recomputeInitiativeUp(id);
}

/**
 * Sửa ĐẦY ĐỦ 1 dự án/công việc (dùng cho popup edit trên Kanban — quyền quản lý):
 * tên, mô tả, đơn vị phụ trách (khối/phòng), người được giao, ưu tiên, trạng thái, tiến độ,
 * ngày bắt đầu/hạn, ngân sách. Rồi roll-up tiến độ lên cha.
 */
export async function editInitiative(
  id: string,
  input: {
    title: string;
    description: string | null;
    unit_id: string | null;
    project_id: string | null;
    meeting_id: string | null;
    owner_email: string | null;
    status: InitStatus;
    progress: number;
    priority: Priority;
    start_on: string | null;
    due_on: string | null;
    budget_planned: number;
    budget_actual: number;
  },
): Promise<void> {
  const prog = input.status === 'done' ? 100 : Math.max(0, Math.min(100, input.progress));
  await query(
    `UPDATE okr_initiatives SET title=$2, description=$3, unit_id=$4, owner_email=$5,
        status=$6, progress=$7, priority=$8, start_on=$9, due_on=$10,
        budget_planned=$11, budget_actual=$12, project_id=$13, meeting_id=$14,
        done_on = CASE WHEN $6='done' AND done_on IS NULL THEN now()::date
                       WHEN $6<>'done' THEN NULL ELSE done_on END,
        updated_at=now() WHERE id=$1`,
    [id, input.title, input.description, input.unit_id, input.owner_email, input.status, prog,
     input.priority, input.start_on, input.due_on, input.budget_planned, input.budget_actual,
     input.project_id, input.meeting_id],
  );
  await recomputeInitiativeUp(id);
}

export async function deleteInitiative(id: string): Promise<void> {
  const init = await getInitiative(id);
  await query('DELETE FROM okr_initiatives WHERE id=$1', [id]); // FK cascade xoá cả nhánh con
  if (init?.parent_id) await recomputeInitiativeUp(init.parent_id);
}

/**
 * Roll-up tiến độ trong cây thực thi: nút có con → progress = bình quân con (bỏ 'canceled').
 * Nút lá giữ progress thủ công. Bắt đầu từ `id` rồi cascade lên cha.
 */
export async function recomputeInitiativeUp(id: string | null): Promise<void> {
  let cur = id;
  const guard = new Set<string>();
  while (cur && !guard.has(cur)) {
    guard.add(cur);
    const kids = await query<{ progress: number; status: string }>(
      `SELECT progress::float8 AS progress, status FROM okr_initiatives WHERE parent_id=$1`,
      [cur],
    );
    const active = kids.filter((k) => k.status !== 'canceled');
    let parentId: string | null = null;
    if (active.length) {
      const p = Math.round((active.reduce((a, k) => a + k.progress, 0) / active.length) * 100) / 100;
      const row = await queryOne<{ parent_id: string | null }>(
        'UPDATE okr_initiatives SET progress=$2, updated_at=now() WHERE id=$1 RETURNING parent_id',
        [cur, p],
      );
      parentId = row?.parent_id ?? null;
    } else {
      // nút lá — không ghi đè progress, chỉ đi tiếp lên cha.
      const row = await queryOne<{ parent_id: string | null }>(
        'SELECT parent_id FROM okr_initiatives WHERE id=$1',
        [cur],
      );
      parentId = row?.parent_id ?? null;
    }
    cur = parentId;
  }
}

/**
 * Quyền cập nhật 1 initiative. `manage` = quyền quản lý OKR gắn việc (do caller
 * tính bằng canEditObjective — năng lực + phạm vi); người được giao (owner_email)
 * chỉ cập nhật trạng thái + tiến độ việc CỦA MÌNH.
 */
export function canUpdateInitiative(
  user: OkrUser,
  init: Pick<Initiative, 'owner_email'>,
  manage: boolean,
): { manage: boolean; assignee: boolean } {
  const email = user.email.toLowerCase();
  const assignee = Boolean(init.owner_email && init.owner_email.toLowerCase() === email);
  return { manage, assignee };
}

/** Tổng ngân sách kế hoạch vs thực chi cho 1 objective — chỉ tính NÚT LÁ (tránh cộng đôi cha+con). */
export async function budgetSummaryForObjective(
  objectiveId: string,
): Promise<{ planned: number; actual: number; count: number }> {
  const r = await queryOne<{ planned: number; actual: number; count: number }>(
    `SELECT COALESCE(SUM(budget_planned),0)::float8 AS planned,
            COALESCE(SUM(budget_actual),0)::float8 AS actual,
            count(*)::int AS count
       FROM okr_initiatives i
      WHERE (i.objective_id=$1 OR i.key_result_id IN
             (SELECT id FROM okr_key_results WHERE objective_id=$1))
        AND NOT EXISTS (SELECT 1 FROM okr_initiatives c WHERE c.parent_id = i.id)`,
    [objectiveId],
  );
  return r ?? { planned: 0, actual: 0, count: 0 };
}
