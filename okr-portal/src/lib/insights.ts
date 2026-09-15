import { query, queryOne } from './db';

// Số liệu tổng hợp cho biểu đồ Bảng điều khiển (theo kỳ).
export type PeriodInsights = {
  krTotal: number;
  krCheckedIn: number;
  progress: { done: number; ahead: number; behind: number; notStarted: number }; // theo KR
  confidence: { on_track: number; at_risk: number; off_track: number; none: number };
  initByStatus: Record<'todo' | 'in_progress' | 'blocked' | 'done' | 'canceled', number>;
  initTotal: number;
  overdueTasks: number;
};

// Phạm vi XEM (CFO 15/09): giới hạn số liệu Dashboard theo đơn vị người xem. unitIds=null = toàn bộ.
export type ScopeFilter = { unitIds: string[] | null; email: string };

export async function periodInsights(periodId: string, scope?: ScopeFilter): Promise<PeriodInsights> {
  // Lọc theo phạm vi: OKR trong đơn vị mình (subtree+cấp trên) HOẶC OKR cấp Công ty HOẶC do mình chủ trì.
  const scoped = !!scope && scope.unitIds !== null;
  const params: unknown[] = scoped ? [periodId, scope!.unitIds, scope!.email] : [periodId];
  const sc = scoped
    ? ` AND (o.unit_id = ANY($2::text[]) OR o.level='company' OR lower(o.owner_email)=lower($3))`
    : '';

  const kr = await queryOne<{
    total: number;
    done: number;
    ahead: number;
    behind: number;
    notstarted: number;
    checked: number;
  }>(
    `SELECT count(*)::int total,
        count(*) FILTER (WHERE k.progress>=90)::int done,
        count(*) FILTER (WHERE k.progress>=50 AND k.progress<90)::int ahead,
        count(*) FILTER (WHERE k.progress>=10 AND k.progress<50)::int behind,
        count(*) FILTER (WHERE k.progress<10)::int notstarted,
        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM okr_checkins c WHERE c.key_result_id=k.id))::int checked
       FROM okr_key_results k JOIN okr_objectives o ON o.id=k.objective_id
      WHERE o.period_id=$1${sc}`,
    params,
  );

  const conf = await query<{ confidence: string; n: number }>(
    `SELECT confidence, count(*)::int n FROM (
        SELECT DISTINCT ON (c.key_result_id) c.confidence
          FROM okr_checkins c
          JOIN okr_key_results k ON k.id=c.key_result_id
          JOIN okr_objectives o ON o.id=k.objective_id
         WHERE o.period_id=$1 AND c.key_result_id IS NOT NULL${sc}
         ORDER BY c.key_result_id, c.created_at DESC
     ) t GROUP BY confidence`,
    params,
  );
  const cmap = Object.fromEntries(conf.map((r) => [r.confidence, r.n]));

  const initRows = await query<{ status: string; n: number }>(
    `SELECT i.status, count(*)::int n FROM okr_initiatives i
        JOIN okr_objectives o ON o.id=i.objective_id
       WHERE o.period_id=$1${sc} GROUP BY i.status`,
    params,
  );
  const imap = Object.fromEntries(initRows.map((r) => [r.status, r.n]));

  const od = await queryOne<{ n: number }>(
    `SELECT count(*)::int n FROM okr_initiatives i JOIN okr_objectives o ON o.id=i.objective_id
      WHERE o.period_id=$1 AND i.due_on IS NOT NULL AND i.due_on < CURRENT_DATE
        AND i.status NOT IN ('done','canceled')${sc}`,
    params,
  );

  const total = kr?.total ?? 0;
  const checked = kr?.checked ?? 0;
  return {
    krTotal: total,
    krCheckedIn: checked,
    progress: {
      done: kr?.done ?? 0,
      ahead: kr?.ahead ?? 0,
      behind: kr?.behind ?? 0,
      notStarted: kr?.notstarted ?? 0,
    },
    confidence: {
      on_track: cmap['on_track'] ?? 0,
      at_risk: cmap['at_risk'] ?? 0,
      off_track: cmap['off_track'] ?? 0,
      none: Math.max(0, total - checked),
    },
    initByStatus: {
      todo: imap['todo'] ?? 0,
      in_progress: imap['in_progress'] ?? 0,
      blocked: imap['blocked'] ?? 0,
      done: imap['done'] ?? 0,
      canceled: imap['canceled'] ?? 0,
    },
    initTotal: initRows.reduce((a, r) => a + r.n, 0),
    overdueTasks: od?.n ?? 0,
  };
}
