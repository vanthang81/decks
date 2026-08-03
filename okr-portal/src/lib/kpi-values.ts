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
  target?: number | null,
): KpiStatus | null {
  if (actual == null) return null;
  const { threshold_watch: w, threshold_alert: a, threshold_escalate: e } = k;
  if (w != null || a != null || e != null) {
    // Ngưỡng TUYỆT ĐỐI đã đặt → dùng trực tiếp.
    if (k.direction === 'down') {
      if (e != null && actual > e) return 'escalate';
      if (a != null && actual > a) return 'alert';
      if (w != null && actual > w) return 'watch';
      return 'ok';
    }
    if (e != null && actual < e) return 'escalate';
    if (a != null && actual < a) return 'alert';
    if (w != null && actual < w) return 'watch';
    return 'ok';
  }
  // Mặc định: theo % ĐẠT so target (khi chưa đặt ngưỡng tuyệt đối). Bands 90/70/50.
  const at = attainment(k.direction, target ?? null, actual);
  if (at == null) return null;
  if (at >= 0.9) return 'ok';
  if (at >= 0.7) return 'watch';
  if (at >= 0.5) return 'alert';
  return 'escalate';
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

// ── KẾT QUẢ KPI (kỳ hiện tại + xu hướng) cho Thư viện KPI ──
// Mỗi KPI kèm giá trị mục tiêu/thực hiện ở (kỳ, đơn vị) đang xét + trạng thái W/A/E + % đạt
// + LỊCH SỬ actual qua các kỳ (để vẽ sparkline xu hướng).
export type KpiHistoryPoint = {
  period: string;
  kind: string;
  starts_on: string;
  actual: number | null;
  target: number | null;
};
export type KpiResult = {
  id: string;
  code: string | null;
  name: string;
  unit_label: string | null;
  direction: KpiDirection;
  source: KpiSource;
  threshold_watch: number | null;
  threshold_alert: number | null;
  threshold_escalate: number | null;
  target: number | null;
  actual: number | null;
  note: string | null;
  updated_at: string | null;
  status: KpiStatus | null;
  att: number | null;
  history: KpiHistoryPoint[];
};

/**
 * Kết quả mọi KPI đang hoạt động tại (kỳ, đơn vị) — giá trị kỳ này + lịch sử actual qua các kỳ.
 * Trả về theo cùng thứ tự listScorecard (tầng → trọng số → tên) để khớp bảng Thư viện.
 */
export async function listKpiResults(periodId: string, unitId: string): Promise<KpiResult[]> {
  const cur = await query<{
    id: string; code: string | null; name: string; unit_label: string | null;
    direction: KpiDirection; source: KpiSource;
    threshold_watch: number | null; threshold_alert: number | null; threshold_escalate: number | null;
    target: number | null; actual: number | null; note: string | null; updated_at: string | null;
  }>(
    `SELECT k.id, k.code, k.name, k.unit_label, k.direction, k.source,
            k.threshold_watch::float8 AS threshold_watch, k.threshold_alert::float8 AS threshold_alert,
            k.threshold_escalate::float8 AS threshold_escalate,
            v.target::float8 AS target, v.actual::float8 AS actual, v.note, v.updated_at::text AS updated_at
       FROM okr_kpis k
       LEFT JOIN okr_kpi_values v ON v.kpi_id = k.id AND v.period_id = $1 AND v.unit_id = $2
      WHERE k.is_active`,
    [periodId, unitId],
  );

  // Lịch sử actual của TẤT CẢ kpi tại đơn vị này, qua mọi kỳ có số — gom theo kpi ở JS.
  const hist = await query<{
    kpi_id: string; period: string; kind: string; starts_on: string; actual: number | null; target: number | null;
  }>(
    `SELECT v.kpi_id, p.name AS period, p.kind, p.starts_on::text AS starts_on,
            v.actual::float8 AS actual, v.target::float8 AS target
       FROM okr_kpi_values v
       JOIN okr_periods p ON p.id = v.period_id
      WHERE v.unit_id = $1 AND v.actual IS NOT NULL
      ORDER BY p.starts_on ASC, p.name ASC`,
    [unitId],
  );
  const byKpi = new Map<string, KpiHistoryPoint[]>();
  for (const h of hist) {
    const arr = byKpi.get(h.kpi_id) ?? [];
    arr.push({ period: h.period, kind: h.kind, starts_on: h.starts_on, actual: h.actual, target: h.target });
    byKpi.set(h.kpi_id, arr);
  }

  return cur.map((k) => ({
    id: k.id, code: k.code, name: k.name, unit_label: k.unit_label,
    direction: k.direction, source: k.source,
    threshold_watch: k.threshold_watch, threshold_alert: k.threshold_alert, threshold_escalate: k.threshold_escalate,
    target: k.target, actual: k.actual, note: k.note, updated_at: k.updated_at,
    status: kpiStatus(k, k.actual, k.target),
    att: attainment(k.direction, k.target, k.actual),
    history: byKpi.get(k.id) ?? [],
  }));
}

export async function getKpiName(kpiId: string): Promise<string | null> {
  const r = await queryOne<{ name: string }>('SELECT name FROM okr_kpis WHERE id=$1', [kpiId]);
  return r?.name ?? null;
}

/** CHỈ cập nhật ACTUAL (giữ nguyên target/note) — dùng cho auto-fill từ BigQuery. */
export async function setKpiActual(
  kpiId: string,
  periodId: string,
  unitId: string,
  actual: number,
  updatedBy: string,
): Promise<void> {
  await query(
    `INSERT INTO okr_kpi_values (kpi_id, period_id, unit_id, actual, updated_by)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (kpi_id, period_id, unit_id) DO UPDATE SET
       actual=EXCLUDED.actual, updated_by=EXCLUDED.updated_by, updated_at=now()`,
    [kpiId, periodId, unitId, actual, updatedBy],
  );
}
