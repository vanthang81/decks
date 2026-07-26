import { query, queryOne } from './db';

export type Viewer = {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  note: string | null;
  created_at?: string;
};

export async function upsertViewer(v: {
  email: string;
  name?: string | null;
  company?: string | null;
  note?: string | null;
  createdBy?: string | null;
}): Promise<Viewer> {
  const existing = await queryOne<Viewer>(
    'SELECT id, email, name, company, note FROM deck_viewers WHERE lower(email)=lower($1)',
    [v.email],
  );
  if (existing) {
    return (await queryOne<Viewer>(
      `UPDATE deck_viewers SET name=COALESCE($2,name), company=COALESCE($3,company), note=COALESCE($4,note)
       WHERE id=$1 RETURNING id, email, name, company, note`,
      [existing.id, v.name ?? null, v.company ?? null, v.note ?? null],
    ))!;
  }
  return (await queryOne<Viewer>(
    `INSERT INTO deck_viewers (email, name, company, note, created_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, email, name, company, note`,
    [v.email.toLowerCase(), v.name ?? null, v.company ?? null, v.note ?? null, v.createdBy ?? null],
  ))!;
}

export async function getViewer(id: string): Promise<Viewer | null> {
  return queryOne<Viewer>(
    'SELECT id, email, name, company, note FROM deck_viewers WHERE id=$1',
    [id],
  );
}

export async function listViewers(): Promise<Viewer[]> {
  return query<Viewer>(
    'SELECT id, email, name, company, note, created_at FROM deck_viewers ORDER BY created_at DESC',
  );
}
