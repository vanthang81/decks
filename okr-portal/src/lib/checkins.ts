import { query, queryOne } from './db';

export type Confidence = 'on_track' | 'at_risk' | 'off_track';

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  on_track: 'Đúng tiến độ',
  at_risk: 'Có rủi ro',
  off_track: 'Chệch hướng',
};

export const CONFIDENCE_COLOR: Record<Confidence, string> = {
  on_track: '#1f9d55',
  at_risk: '#d97706',
  off_track: '#dc2626',
};

export type CheckIn = {
  id: string;
  key_result_id: string | null;
  objective_id: string | null;
  value: number | null;
  confidence: Confidence;
  note: string | null;
  author_email: string | null;
  author_name: string | null;
  created_at: string;
};

export async function addCheckIn(input: {
  key_result_id: string | null;
  objective_id: string | null;
  value: number | null;
  confidence: Confidence;
  note: string | null;
  author_email: string;
}): Promise<void> {
  await query(
    `INSERT INTO okr_checkins (key_result_id, objective_id, value, confidence, note, author_email)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      input.key_result_id,
      input.objective_id,
      input.value,
      input.confidence,
      input.note,
      input.author_email,
    ],
  );
}

const CI_SELECT = `
  SELECT ci.id, ci.key_result_id, ci.objective_id, ci.value::float8 AS value, ci.confidence, ci.note,
         ci.author_email, u.display_name AS author_name, ci.created_at::text
    FROM okr_checkins ci
    LEFT JOIN okr_users u ON u.email = ci.author_email`;

export async function listCheckInsForObjective(objectiveId: string, limit = 40): Promise<CheckIn[]> {
  return query<CheckIn>(
    `${CI_SELECT}
      WHERE ci.objective_id=$1 OR ci.key_result_id IN (SELECT id FROM okr_key_results WHERE objective_id=$1)
      ORDER BY ci.created_at DESC LIMIT $2`,
    [objectiveId, limit],
  );
}

export async function getCheckIn(id: string): Promise<CheckIn | null> {
  return queryOne<CheckIn>(`${CI_SELECT} WHERE ci.id=$1`, [id]);
}

export async function updateCheckIn(
  id: string,
  input: { value: number | null; confidence: Confidence; note: string | null },
): Promise<void> {
  await query('UPDATE okr_checkins SET value=$2, confidence=$3, note=$4 WHERE id=$1', [
    id,
    input.value,
    input.confidence,
    input.note,
  ]);
}

export async function deleteCheckIn(id: string): Promise<void> {
  await query('DELETE FROM okr_checkins WHERE id=$1', [id]);
}

/** Giá trị check-in mới nhất (có value) của 1 KR — để đồng bộ lại current_value sau khi sửa/xoá. */
export async function latestCheckinValue(krId: string): Promise<number | null> {
  const r = await queryOne<{ value: number | null }>(
    `SELECT value::float8 AS value FROM okr_checkins
      WHERE key_result_id=$1 AND value IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
    [krId],
  );
  return r ? r.value : null;
}
