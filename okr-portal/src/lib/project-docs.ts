import { query, queryOne } from './db';

// Thư viện tài liệu dự án — tạm lưu LINK (chưa upload file). Xem CLAUDE.md.
export type ProjectDoc = {
  id: string;
  project_id: string;
  title: string;
  url: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export async function listProjectDocs(projectId: string): Promise<ProjectDoc[]> {
  return query<ProjectDoc>(
    `SELECT id, project_id, title, url, note, created_by, created_at::text AS created_at
       FROM okr_project_docs WHERE project_id=$1 ORDER BY created_at DESC`,
    [projectId],
  );
}

export async function addProjectDoc(input: {
  project_id: string;
  title: string;
  url: string;
  note: string | null;
  created_by: string;
}): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO okr_project_docs (project_id, title, url, note, created_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [input.project_id, input.title, input.url, input.note, input.created_by],
  );
  return row!.id;
}

export async function updateProjectDoc(
  id: string,
  input: { title: string; url: string; note: string | null },
): Promise<void> {
  await query('UPDATE okr_project_docs SET title=$2, url=$3, note=$4 WHERE id=$1', [
    id, input.title, input.url, input.note,
  ]);
}

export async function getProjectDoc(id: string): Promise<ProjectDoc | null> {
  return queryOne<ProjectDoc>(
    `SELECT id, project_id, title, url, note, created_by, created_at::text AS created_at
       FROM okr_project_docs WHERE id=$1`,
    [id],
  );
}

export async function deleteProjectDoc(id: string): Promise<void> {
  await query('DELETE FROM okr_project_docs WHERE id=$1', [id]);
}
