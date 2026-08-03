import { query, queryOne } from './db';
import type { OkrUser } from './users';
import { manageScope, type Unit } from './org';
import { nextProjectCode } from './codes';
import { hasCap, type Access } from './access';

// DỰ ÁN độc lập, xuyên nhiều OKR. Task (okr_initiatives.project_id) trỏ vào 1 dự án.
export type ProjectStatus = 'active' | 'done' | 'paused' | 'archived';

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'Đang chạy',
  done: 'Hoàn thành',
  paused: 'Tạm dừng',
  archived: 'Lưu trữ',
};
export const PROJECT_STATUS_CLS: Record<ProjectStatus, string> = {
  active: 'blue',
  done: 'green',
  paused: 'amber',
  archived: 'gray',
};

export type Project = {
  id: string;
  code: string | null;
  period_id: string | null;
  name: string;
  description: string | null;
  owner_email: string | null;
  unit_id: string | null;
  status: ProjectStatus;
  start_on: string | null;
  due_on: string | null;
  budget_planned: number;
  budget_actual: number;
  created_by: string | null;
};

export type ProjectRow = Project & {
  owner_name: string | null;
  unit_name: string | null;
  task_count: number;
  done_count: number;
  progress: number;
  task_budget_planned: number;
  task_budget_actual: number;
  charter: import('./charter').Charter;
};

const SELECT = `
  SELECT p.id, p.code, p.period_id, p.name, p.description, p.owner_email, p.unit_id, p.status,
         p.start_on::text, p.due_on::text,
         p.budget_planned::float8 AS budget_planned, p.budget_actual::float8 AS budget_actual,
         p.created_by,
         ou.display_name AS owner_name, un.name AS unit_name,
         (SELECT count(*) FROM okr_initiatives i WHERE i.project_id = p.id)::int AS task_count,
         (SELECT count(*) FROM okr_initiatives i WHERE i.project_id = p.id AND i.status='done')::int AS done_count,
         COALESCE((SELECT avg(i.progress) FROM okr_initiatives i
                    WHERE i.project_id = p.id AND i.status <> 'canceled'), 0)::float8 AS progress,
         COALESCE((SELECT sum(i.budget_planned) FROM okr_initiatives i WHERE i.project_id = p.id), 0)::float8 AS task_budget_planned,
         COALESCE((SELECT sum(i.budget_actual) FROM okr_initiatives i WHERE i.project_id = p.id), 0)::float8 AS task_budget_actual,
         COALESCE(p.charter, '{}'::jsonb) AS charter
    FROM okr_projects p
    LEFT JOIN okr_users ou ON ou.email = p.owner_email
    LEFT JOIN okr_units un ON un.id = p.unit_id`;

export async function listProjectsByPeriod(periodId: string): Promise<ProjectRow[]> {
  return query<ProjectRow>(
    `${SELECT} WHERE p.period_id = $1
     ORDER BY CASE p.status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 WHEN 'done' THEN 2 ELSE 3 END,
              p.created_at`,
    [periodId],
  );
}

export async function getProject(id: string): Promise<ProjectRow | null> {
  return queryOne<ProjectRow>(`${SELECT} WHERE p.id = $1`, [id]);
}

/** Danh sách gọn cho dropdown (theo kỳ). */
export async function listProjectOptions(
  periodId: string,
): Promise<{ id: string; code: string | null; name: string }[]> {
  return query<{ id: string; code: string | null; name: string }>(
    `SELECT id, code, name FROM okr_projects
      WHERE period_id = $1 AND status <> 'archived' ORDER BY name`,
    [periodId],
  );
}

/** Toàn bộ dự án (mọi kỳ) dạng gọn — cho dropdown gắn việc ở trang Công việc. */
export async function listAllProjectOptions(): Promise<{ id: string; code: string | null; name: string }[]> {
  return query<{ id: string; code: string | null; name: string }>(
    `SELECT id, code, name FROM okr_projects WHERE status <> 'archived' ORDER BY name`,
  );
}

/** Task/công việc thuộc 1 dự án (xuyên nhiều OKR) — kèm OKR gốc để điều hướng. */
export type ProjectTask = {
  id: string;
  code: string | null;
  title: string;
  status: string;
  progress: number;
  due_on: string | null;
  owner_email: string | null;
  owner_name: string | null;
  objective_id: string | null;
  objective_title: string | null;
  objective_code: string | null;
  objective_unit: string | null;
};

export async function listProjectTasks(projectId: string): Promise<ProjectTask[]> {
  return query<ProjectTask>(
    `SELECT i.id, i.code, i.title, i.status, i.progress::float8 AS progress, i.due_on::text,
            i.owner_email, u.display_name AS owner_name,
            i.objective_id, o.title AS objective_title, o.code AS objective_code,
            ounit.name AS objective_unit
       FROM okr_initiatives i
       LEFT JOIN okr_users u ON u.email = i.owner_email
       LEFT JOIN okr_objectives o ON o.id = i.objective_id
       LEFT JOIN okr_units ounit ON ounit.id = o.unit_id
      WHERE i.project_id = $1
      ORDER BY o.title NULLS LAST, i.title`,
    [projectId],
  );
}


export async function createProject(input: {
  period_id: string | null;
  name: string;
  description: string | null;
  owner_email: string | null;
  unit_id: string | null;
  status: ProjectStatus;
  start_on: string | null;
  due_on: string | null;
  budget_planned: number;
  budget_actual: number;
  created_by: string;
}): Promise<string> {
  const code = await nextProjectCode();
  const row = await queryOne<{ id: string }>(
    `INSERT INTO okr_projects (code, period_id, name, description, owner_email, unit_id, status,
        start_on, due_on, budget_planned, budget_actual, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [
      code,
      input.period_id,
      input.name,
      input.description,
      input.owner_email,
      input.unit_id,
      input.status,
      input.start_on,
      input.due_on,
      input.budget_planned,
      input.budget_actual,
      input.created_by,
    ],
  );
  return row!.id;
}

export async function updateProject(
  id: string,
  input: {
    name: string;
    description: string | null;
    owner_email: string | null;
    unit_id: string | null;
    status: ProjectStatus;
    start_on: string | null;
    due_on: string | null;
    budget_planned: number;
    budget_actual: number;
  },
): Promise<void> {
  await query(
    `UPDATE okr_projects SET name=$2, description=$3, owner_email=$4, unit_id=$5, status=$6,
        start_on=$7, due_on=$8, budget_planned=$9, budget_actual=$10, updated_at=now()
      WHERE id=$1`,
    [id, input.name, input.description, input.owner_email, input.unit_id, input.status,
     input.start_on, input.due_on, input.budget_planned, input.budget_actual],
  );
}

export async function setProjectCharter(id: string, charter: import('./charter').Charter): Promise<void> {
  await query('UPDATE okr_projects SET charter=$2, updated_at=now() WHERE id=$1', [id, JSON.stringify(charter)]);
}

export async function deleteProject(id: string): Promise<void> {
  // FK ON DELETE SET NULL: task được gỡ liên kết, KHÔNG bị xoá.
  await query('DELETE FROM okr_projects WHERE id=$1', [id]);
}

/** Gắn / gỡ 1 task vào dự án. */
export async function setInitiativeProject(initId: string, projectId: string | null): Promise<void> {
  await query('UPDATE okr_initiatives SET project_id=$2, updated_at=now() WHERE id=$1', [
    initId,
    projectId,
  ]);
}

/** Quyền quản trị 1 dự án: Quản trị OKR (scope.all) · chủ trì · người tạo ·
 *  hoặc có năng lực "Quản lý Dự án" trong phạm vi đơn vị của dự án. */
export function canManageProject(
  user: OkrUser,
  project: Pick<Project, 'owner_email' | 'created_by' | 'unit_id'>,
  units: Unit[],
  access: Access,
): boolean {
  if (hasCap(user, 'scope.all', access)) return true; // Quản trị hệ thống / OKR Admin
  const email = user.email.toLowerCase();
  if (project.owner_email && project.owner_email.toLowerCase() === email) return true;
  if (project.created_by && project.created_by.toLowerCase() === email) return true;
  if (!hasCap(user, 'project.manage', access)) return false;
  const scope = manageScope(user, units);
  if (scope === null) return true;
  if (project.unit_id && scope.has(project.unit_id)) return true;
  return false;
}

/** Ai được TẠO dự án: cần năng lực "Quản lý Dự án" (mặc định: Quản lý trở lên). */
export function canCreateProject(user: OkrUser, access: Access): boolean {
  return hasCap(user, 'project.manage', access);
}
