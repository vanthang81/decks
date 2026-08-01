import { query, queryOne } from './db';
import type { BscPerspective } from './okr';
import type { KpiTier, KpiSource, KpiDirection } from './kpis';

// GIÁ TRỊ KPI theo (KPI × Kỳ × Đơn vị) — nền Scorecard đa cấp + engine cảnh báo W/A/E.

export type KpiStatus = 'ok' | 'watch' | 'alert' | 'escalate';
export const STATUS_LABEL: Record<KpiStatus, string> = {
  ok: 'Ổn', watch: 'Theo dõi', alert: 'Cảnh báo', escalate: 'Khẩn',
};
export const STATUS_CLS: Record<KpiStatus, string> = {
  ok: 'green', watch: 'amber', alert: 'amber', escalate: 'red',
};
export const STATUS_COLOR: Record<KpiStatus, string> = {
  ok: '#16a34a', watch: '#d97706', alert: '#ea580c', escalate: '#dc2626',
};

// 1 dòng scorecard = KPI (thuộc tính cần hiển thị) + giá trị ở (kỳ, đơn vị) đang chọn.
export type ScorecardRow = {
  id: string;
  code: string | null;
  name: string;
  unit_label: string | null;
  bsc_perspective: BscPerspective | null;
  module: string | null;
  tier: KpiTier | null;
  weight: number;
  direction: KpiDirection;
  source: KpiSource;
  threshold_watch: number | null;
  threshold_alert: number | null;
  threshold_escalate: number | null;
  value_id: string | null;
  target: number | null;
  actual: number | null;
  note: string | null;
};

/**
 * Trạng thái cảnh báo theo ngưỡng W/A/E + hướng tốt.
 * - direction 'down' (thấp tốt, vd DIO): actual vượt escalate > alert > watch → càng nặng.
 * - direction 'up'  (cao tốt, vd coverage): actual rơi dưới các ngưỡng → càng nặng.
 * Trả null nếu chưa có actual hoặc chưa đặt ngưỡng nào.
 */
export function kpiStatus(
  k: Pick<ScorecardRow, 'direction' | 'threshold_watch' | 'threshold_alert' | 'threshold_escalate'>,
  actual: number | null,
): KpiStatus | null {
  if (actual == null) return null;
  const { threshold_watch: w, threshold_alert: a, threshold_escalate: e } = k;
  if (w == null && a == null && e == null) return null;
  if (k.direction === 'down') {
    if (e != null && actual > e) return 'escalate';
    if (a != null && actual > a) return 'alert';
    if (w != null && actual > w) return 'watch';
    return 'ok';
  }
  // up
  if (e != null && actual < e) return 'escalate';
  if (a != null && actual < a) return 'alert';
  if (w != null && actual < w) return 'watch';
  return 'ok';
}

/** Tỷ lệ đạt (0..1, cho phép >1) — 'up': actual/target · 'down': target/actual. Null nếu thiếu số. */
export function attainment(direction: KpiDirection, target: number | null, actual: number | null): number | null {
  if (target == null || actual == null || target === 0) return null;
  const r = direction === 'down' ? target / actual : actual / target;
  return r < 0 ? 0 : r;
}

/** Điểm scorecard: Σ trọng số × min(đạt,1) trên các KPI CÓ trọng số & đủ target+actual. */
export function scorecardScore(rows: ScorecardRow[]): { score: number; weighted: number; scored: number } {
  let score = 0, weighted = 0, scored = 0;
  for (const r of rows) {
    if (!r.weight) continue;
    weighted += r.weight;
    const at = attainment(r.direction, r.target, r.actual);
    if (at == null) continue;
    scored += r.weight;
    score += r.weight * Math.min(at, 1);
  }
  return { score: Math.round(score * 10) / 10, weighted, scored };
}

const SELECT = `
  SELECT k.id, k.code, k.name, k.unit_label, k.bsc_perspective, k.module, k.tier, k.weight::int AS weight,
         k.direction, k.source,
         k.threshold_watch::float8 AS threshold_watch, k.threshold_alert::float8 AS threshold_alert,
         k.threshold_escalate::float8 AS threshold_escalate,
         v.id AS value_id, v.target::float8 AS target, v.actual::float8 AS actual, v.note
    FROM okr_kpis k
    LEFT JOIN okr_kpi_values v ON v.kpi_id = k.id AND v.period_id = $1 AND v.unit_id = $2
   WHERE k.is_active`;

/** Scorecard cho 1 kỳ × 1 đơn vị: mọi KPI đang hoạt động + giá trị (nếu có). */
export async function listScorecard(periodId: string, unitId: string): Promise<ScorecardRow[]> {
  return query<ScorecardRow>(
    `${SELECT}
     ORDER BY CASE k.tier WHEN 'result' THEN 0 WHEN 'driver' THEN 1 WHEN 'enabler' THEN 2 ELSE 3 END,
              k.weight DESC, k.name`,
    [periodId, unitId],
  );
}

/** Upsert target/actual/note cho (KPI, kỳ, đơn vị). */
export async function upsertKpiValue(
  kpiId: string,
  periodId: string,
  unitId: string,
  input: { target: number | null; actual: number | null; note: string | null },
  updatedBy: string,
): Promise<void> {
  await query(
    `INSERT INTO okr_kpi_values (kpi_id, period_id, unit_id, target, actual, note, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (kpi_id, period_id, unit_id) DO UPDATE SET
       target=EXCLUDED.target, actual=EXCLUDED.actual, note=EXCLUDED.note,
       updated_by=EXCLUDED.updated_by, updated_at=now()`,
    [kpiId, periodId, unitId, input.target, input.actual, input.note, updatedBy],
  );
}

export async function getKpiName(kpiId: string): Promise<string | null> {
  const r = await queryOne<{ name: string }>('SELECT name FROM okr_kpis WHERE id=$1', [kpiId]);
  return r?.name ?? null;
}
