import { query } from './db';

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

export async function listCheckInsForObjective(objectiveId: string, limit = 20): Promise<CheckIn[]> {
  return query<CheckIn>(
    `SELECT id, key_result_id, objective_id, value::float8 AS value, confidence, note,
            author_email, created_at::text
       FROM okr_checkins
      WHERE objective_id=$1 OR key_result_id IN (SELECT id FROM okr_key_results WHERE objective_id=$1)
      ORDER BY created_at DESC LIMIT $2`,
    [objectiveId, limit],
  );
}
