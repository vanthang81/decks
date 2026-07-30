import { query, queryOne } from './db';

export type InitStatus = 'todo' | 'in_progress' | 'blocked' | 'done' | 'canceled';
export type Priority = 'low' | 'medium' | 'high';

export const INIT_STATUS_LABEL: Record<InitStatus, string> = {
  todo: 'Chưa làm',
  in_progress: 'Đang làm',
  blocked: 'Vướng',
  done: 'Xong',
  canceled: 'Huỷ',
};

export type Initiative = {
  id: string;
  objective_id: string | null;
  key_result_id: string | null;
  title: string;
  description: string | null;
  owner_email: string | null;
  owner_name: string | null;
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

const SELECT = `
  SELECT i.id, i.objective_id, i.key_result_id, i.title, i.description, i.owner_email,
         u.display_name AS owner_name, i.status, i.priority, i.progress::float8 AS progress,
         i.start_on::text, i.due_on::text, i.done_on::text,
         i.budget_planned::float8 AS budget_planned, i.budget_actual::float8 AS budget_actual,
         i.budget_currency, i.budget_source
    FROM okr_initiatives i
    LEFT JOIN okr_users u ON u.email = i.owner_email`;

export async function listInitiativesForObjective(objectiveId: string): Promise<Initiative[]> {
  return query<Initiative>(
    `${SELECT} WHERE i.objective_id=$1 OR i.key_result_id IN
       (SELECT id FROM okr_key_results WHERE objective_id=$1)
     ORDER BY CASE i.status WHEN 'blocked' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'todo' THEN 2
                            WHEN 'done' THEN 3 ELSE 4 END, i.due_on NULLS LAST, i.sort`,
    [objectiveId],
  );
}

export async function listInitiativesForOwner(email: string): Promise<Initiative[]> {
  return query<Initiative>(
    `${SELECT} WHERE lower(i.owner_email)=lower($1) AND i.status NOT IN ('done','canceled')
     ORDER BY i.due_on NULLS LAST, i.sort`,
    [email],
  );
}

export async function createInitiative(input: {
  objective_id: string | null;
  key_result_id: string | null;
  title: string;
  description: string | null;
  owner_email: string | null;
  status: InitStatus;
  priority: Priority;
  start_on: string | null;
  due_on: string | null;
  budget_planned: number;
  budget_actual: number;
  budget_source: string | null;
  created_by: string;
}): Promise<void> {
  await query(
    `INSERT INTO okr_initiatives (objective_id, key_result_id, title, description, owner_email,
        status, priority, start_on, due_on, budget_planned, budget_actual, budget_source, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      input.objective_id,
      input.key_result_id,
      input.title,
      input.description,
      input.owner_email,
      input.status,
      input.priority,
      input.start_on,
      input.due_on,
      input.budget_planned,
      input.budget_actual,
      input.budget_source,
      input.created_by,
    ],
  );
}

export async function updateInitiative(
  id: string,
  input: {
    status: InitStatus;
    progress: number;
    budget_actual: number;
    budget_planned: number;
  },
): Promise<void> {
  await query(
    `UPDATE okr_initiatives SET status=$2, progress=$3, budget_actual=$4, budget_planned=$5,
        done_on = CASE WHEN $2='done' AND done_on IS NULL THEN now()::date
                       WHEN $2<>'done' THEN NULL ELSE done_on END,
        updated_at=now() WHERE id=$1`,
    [id, input.status, input.progress, input.budget_actual, input.budget_planned],
  );
}

export async function deleteInitiative(id: string): Promise<void> {
  await query('DELETE FROM okr_initiatives WHERE id=$1', [id]);
}

/** Tổng ngân sách kế hoạch vs thực chi cho 1 objective (gồm KR con). */
export async function budgetSummaryForObjective(
  objectiveId: string,
): Promise<{ planned: number; actual: number; count: number }> {
  const r = await queryOne<{ planned: number; actual: number; count: number }>(
    `SELECT COALESCE(SUM(budget_planned),0)::float8 AS planned,
            COALESCE(SUM(budget_actual),0)::float8 AS actual,
            count(*)::int AS count
       FROM okr_initiatives
      WHERE objective_id=$1 OR key_result_id IN
            (SELECT id FROM okr_key_results WHERE objective_id=$1)`,
    [objectiveId],
  );
  return r ?? { planned: 0, actual: 0, count: 0 };
}
