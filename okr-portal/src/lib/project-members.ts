import { query, queryOne } from './db';

// Thành viên dự án (tường minh) — nền tảng phân quyền XEM dự án. Xem db/590 + CLAUDE.md.
export type ProjectMember = {
  email: string;
  name: string | null;
  title: string | null;
  unit_name: string | null;
  added_by: string | null;
  created_at: string;
};

export async function listProjectMembers(projectId: string): Promise<ProjectMember[]> {
  return query<ProjectMember>(
    `SELECT m.email, u.display_name AS name, u.title, un.name AS unit_name,
            m.added_by, m.created_at::text AS created_at
       FROM okr_project_members m
       LEFT JOIN okr_users u ON lower(u.email) = lower(m.email)
       LEFT JOIN okr_units un ON un.id = u.unit_id
      WHERE m.project_id = $1
      ORDER BY u.display_name NULLS LAST, m.email`,
    [projectId],
  );
}

export async function addProjectMember(projectId: string, email: string, addedBy: string): Promise<void> {
  await query(
    `INSERT INTO okr_project_members (project_id, email, added_by) VALUES ($1, lower($2), $3)
     ON CONFLICT (project_id, email) DO NOTHING`,
    [projectId, email, addedBy],
  );
}

export async function removeProjectMember(projectId: string, email: string): Promise<void> {
  await query('DELETE FROM okr_project_members WHERE project_id=$1 AND lower(email)=lower($2)', [projectId, email]);
}

export async function isProjectMember(projectId: string, email: string): Promise<boolean> {
  const r = await queryOne<{ x: number }>(
    'SELECT 1 AS x FROM okr_project_members WHERE project_id=$1 AND lower(email)=lower($2)',
    [projectId, email],
  );
  return !!r;
}

/** Tập id dự án mà 1 người là THÀNH VIÊN tường minh (cho lọc danh sách /projects). */
export async function memberProjectIds(email: string): Promise<Set<string>> {
  const rows = await query<{ project_id: string }>(
    'SELECT project_id FROM okr_project_members WHERE lower(email)=lower($1)',
    [email],
  );
  return new Set(rows.map((r) => r.project_id));
}

/** Tập id dự án mà 1 người ĐƯỢC GIAO ít nhất 1 việc (assignee) — cũng được xem dự án. */
export async function assigneeProjectIds(email: string): Promise<Set<string>> {
  const rows = await query<{ project_id: string }>(
    'SELECT DISTINCT project_id FROM okr_initiatives WHERE project_id IS NOT NULL AND lower(owner_email)=lower($1)',
    [email],
  );
  return new Set(rows.map((r) => r.project_id));
}
