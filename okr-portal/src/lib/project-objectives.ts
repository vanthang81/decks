import { query } from './db';

// Liên kết Dự án ↔ OKR (cấp dự án). Xem db/600 + CLAUDE.md.
export type ProjectObjective = {
  id: string;
  code: string | null;
  title: string;
  unit_name: string | null;
  level: string;
};

/** Các OKR mà dự án gắn (kèm mã/tiêu đề/đơn vị để hiển thị chip điều hướng). */
export async function listProjectObjectives(projectId: string): Promise<ProjectObjective[]> {
  return query<ProjectObjective>(
    `SELECT o.id, o.code, o.title, o.level, un.name AS unit_name
       FROM okr_project_objectives po
       JOIN okr_objectives o ON o.id = po.objective_id
       LEFT JOIN okr_units un ON un.id = o.unit_id
      WHERE po.project_id = $1
      ORDER BY o.code NULLS LAST, o.title`,
    [projectId],
  );
}

export async function listProjectObjectiveIds(projectId: string): Promise<string[]> {
  const rows = await query<{ objective_id: string }>(
    'SELECT objective_id FROM okr_project_objectives WHERE project_id=$1',
    [projectId],
  );
  return rows.map((r) => r.objective_id);
}

/** Đặt LẠI toàn bộ danh sách OKR của dự án (thay thế): xoá cái bỏ, thêm cái mới. */
export async function setProjectObjectives(projectId: string, objectiveIds: string[]): Promise<void> {
  const ids = [...new Set(objectiveIds.filter(Boolean))];
  if (ids.length === 0) {
    await query('DELETE FROM okr_project_objectives WHERE project_id=$1', [projectId]);
    return;
  }
  await query('DELETE FROM okr_project_objectives WHERE project_id=$1 AND objective_id <> ALL($2)', [projectId, ids]);
  await query(
    `INSERT INTO okr_project_objectives (project_id, objective_id)
       SELECT $1, x FROM unnest($2::uuid[]) AS x
     ON CONFLICT (project_id, objective_id) DO NOTHING`,
    [projectId, ids],
  );
}
