import { query, queryOne } from './db';
import type { BscPerspective } from './okr';

// THƯ VIỆN KPI — chỉ số đo dùng lại, đo đa cấp. Mỗi KPI mang đủ thuộc tính phục vụ
// cả lens BSC lẫn scorecard vận hành 3 tầng (Control Tower) + engine cảnh báo W/A/E.

export type KpiTier = 'result' | 'driver' | 'enabler';
export type KpiSource = 'manual' | 'bigquery' | 'postgres';
export type KpiDirection = 'up' | 'down';
export type KpiAgg = 'sum' | 'avg' | 'last';

export const TIER_LABEL: Record<KpiTier, string> = {
  result: 'Kết quả',
  driver: 'Động cơ',
  enabler: 'Bộ máy',
};
export const TIER_HINT: Record<KpiTier, string> = {
  result: 'Đầu ra cuối (lagging) — lãi, biên, GMROI…',
  driver: 'Động cơ (leading) — khách, chuyển đổi, ramp-up…',
  enabler: 'Bộ máy — chi phí HO, năng suất, đòn bẩy…',
};
export const TIERS: KpiTier[] = ['result', 'driver', 'enabler'];

export const SOURCE_LABEL: Record<KpiSource, string> = {
  manual: 'Nhập tay',
  bigquery: 'Tự động · BigQuery',
  postgres: 'Tự động · Postgres',
};
export const DIRECTION_LABEL: Record<KpiDirection, string> = {
  up: 'Càng cao càng tốt',
  down: 'Càng thấp càng tốt',
};
export const AGG_LABEL: Record<KpiAgg, string> = {
  sum: 'Cộng',
  avg: 'Trung bình',
  last: 'Mốc cuối',
};
export const CADENCES = ['daily', 'weekly', 'monthly', 'quarterly'] as const;
export const CADENCE_LABEL: Record<string, string> = {
  daily: 'Hằng ngày',
  weekly: 'Hằng tuần',
  monthly: 'Hằng tháng',
  quarterly: 'Hằng quý',
};

// 12 module chức năng (KRA) của hệ điều hành Control Tower — gợi ý cho ô "Module".
export const KPI_MODULES = [
  'Commercial / Retail / Store ops / B2B',
  'Gold pricing & margin',
  'Inventory & Working Capital',
  'Merchandise / Sản phẩm & đặt hàng mới',
  'Customer / CRM / brand',
  'Cash & treasury',
  'Expansion / project',
  'Supply / SKU fulfillment / Mfg',
  'Finance / accounting',
  'People / HR / org',
  'IT / data / system',
  'Risk / compliance',
];

export type Kpi = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  unit_label: string | null;
  bsc_perspective: BscPerspective | null;
  module: string | null;
  tier: KpiTier | null;
  weight: number;
  direction: KpiDirection;
  agg: KpiAgg;
  source: KpiSource;
  source_ref: string | null;
  unit_id: string | null;
  unit_name: string | null;
  business_owner: string | null;
  measurement_owner: string | null;
  cadence: string | null;
  threshold_watch: number | null;
  threshold_alert: number | null;
  threshold_escalate: number | null;
  is_active: boolean;
  created_by: string | null;
  used_by_kr: number; // số Thước đo (KR) đang gắn KPI này → khoá xoá khi > 0
};

const SELECT = `
  SELECT k.id, k.code, k.name, k.description, k.unit_label, k.bsc_perspective, k.module, k.tier,
         k.weight::int AS weight, k.direction, k.agg, k.source, k.source_ref, k.unit_id,
         un.name AS unit_name, k.business_owner, k.measurement_owner, k.cadence,
         k.threshold_watch::float8 AS threshold_watch, k.threshold_alert::float8 AS threshold_alert,
         k.threshold_escalate::float8 AS threshold_escalate, k.is_active, k.created_by,
         (SELECT count(*)::int FROM okr_key_results kr WHERE kr.kpi_id = k.id) AS used_by_kr
    FROM okr_kpis k
    LEFT JOIN okr_units un ON un.id = k.unit_id`;

export async function listKpis(): Promise<Kpi[]> {
  return query<Kpi>(
    `${SELECT} ORDER BY k.is_active DESC,
        CASE k.tier WHEN 'result' THEN 0 WHEN 'driver' THEN 1 WHEN 'enabler' THEN 2 ELSE 3 END,
        k.weight DESC, k.name`,
  );
}

export async function getKpi(id: string): Promise<Kpi | null> {
  return queryOne<Kpi>(`${SELECT} WHERE k.id=$1`, [id]);
}

/** Sinh mã KPI kế tiếp: KPI-01, KPI-02… */
async function nextKpiCode(): Promise<string> {
  const r = await queryOne<{ n: number }>(
    `SELECT COALESCE(MAX((substring(code from 'KPI-([0-9]+)'))::int), 0) + 1 AS n
       FROM okr_kpis WHERE code ~ '^KPI-[0-9]+$'`,
  );
  return `KPI-${String(r?.n ?? 1).padStart(2, '0')}`;
}

export type KpiInput = {
  name: string;
  description: string | null;
  unit_label: string | null;
  bsc_perspective: BscPerspective | null;
  module: string | null;
  tier: KpiTier | null;
  weight: number;
  direction: KpiDirection;
  agg: KpiAgg;
  source: KpiSource;
  source_ref: string | null;
  unit_id: string | null;
  business_owner: string | null;
  measurement_owner: string | null;
  cadence: string | null;
  threshold_watch: number | null;
  threshold_alert: number | null;
  threshold_escalate: number | null;
};

export async function createKpi(input: KpiInput, createdBy: string): Promise<string> {
  const code = await nextKpiCode();
  const row = await queryOne<{ id: string }>(
    `INSERT INTO okr_kpis (code, name, description, unit_label, bsc_perspective, module, tier, weight,
        direction, agg, source, source_ref, unit_id, business_owner, measurement_owner, cadence,
        threshold_watch, threshold_alert, threshold_escalate, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING id`,
    [
      code, input.name, input.description, input.unit_label, input.bsc_perspective, input.module,
      input.tier, input.weight, input.direction, input.agg, input.source, input.source_ref,
      input.unit_id, input.business_owner, input.measurement_owner, input.cadence,
      input.threshold_watch, input.threshold_alert, input.threshold_escalate, createdBy,
    ],
  );
  return row!.id;
}

export async function updateKpi(id: string, input: KpiInput): Promise<void> {
  await query(
    `UPDATE okr_kpis SET name=$2, description=$3, unit_label=$4, bsc_perspective=$5, module=$6, tier=$7,
        weight=$8, direction=$9, agg=$10, source=$11, source_ref=$12, unit_id=$13, business_owner=$14,
        measurement_owner=$15, cadence=$16, threshold_watch=$17, threshold_alert=$18,
        threshold_escalate=$19, updated_at=now()
      WHERE id=$1`,
    [
      id, input.name, input.description, input.unit_label, input.bsc_perspective, input.module,
      input.tier, input.weight, input.direction, input.agg, input.source, input.source_ref,
      input.unit_id, input.business_owner, input.measurement_owner, input.cadence,
      input.threshold_watch, input.threshold_alert, input.threshold_escalate,
    ],
  );
}

export async function setKpiActive(id: string, active: boolean): Promise<void> {
  await query('UPDATE okr_kpis SET is_active=$2, updated_at=now() WHERE id=$1', [id, active]);
}

export async function deleteKpi(id: string): Promise<void> {
  await query('DELETE FROM okr_kpis WHERE id=$1', [id]);
}

// Số Thước đo (KR) đang gắn 1 KPI — dùng để CHẶN xoá khi KPI còn được sử dụng.
export async function kpiUsageCount(id: string): Promise<number> {
  const r = await queryOne<{ n: number }>('SELECT count(*)::int AS n FROM okr_key_results WHERE kpi_id=$1', [id]);
  return r?.n ?? 0;
}

// Trace-back: mỗi KPI → danh sách KR (kèm OKR gốc) đang gắn nó, để hiện "đang dùng bởi" + link.
export type KpiKrLink = { kpi_id: string; kr_title: string; objective_id: string; obj_code: string | null; obj_title: string };
export async function listKpiKrLinks(): Promise<Map<string, KpiKrLink[]>> {
  const rows = await query<KpiKrLink>(
    `SELECT kr.kpi_id, kr.title AS kr_title, o.id AS objective_id, o.code AS obj_code, o.title AS obj_title
       FROM okr_key_results kr JOIN okr_objectives o ON o.id = kr.objective_id
      WHERE kr.kpi_id IS NOT NULL
      ORDER BY o.code`,
  );
  const map = new Map<string, KpiKrLink[]>();
  for (const r of rows) {
    const arr = map.get(r.kpi_id) ?? [];
    arr.push(r);
    map.set(r.kpi_id, arr);
  }
  return map;
}
