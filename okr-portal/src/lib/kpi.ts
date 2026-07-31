import { query, queryOne } from './db';
import { bqScalar } from './bigquery';
import { setKrAutoValues } from './okr';

// ============================================================================
// KPI tự động — mỗi "metric" gắn CẢ kế hoạch (target) LẪN thực hiện (current):
//  - Kế hoạch: BigQuery `f_ke_hoach_kinh_doanh_2` (version 'ĐHCĐ') theo kỳ.
//  - Thực hiện: BigQuery `op_finance.v_flatten_sales` (scope bán lẻ) theo kỳ tới hôm nay.
// KR gắn kpi_source = metric.key → syncKrKpi() điền target = kế hoạch cả kỳ,
// current = thực hiện tới hôm nay, rồi tính progress. Tất cả qua Metabase (bigquery.ts).
// ============================================================================

export type KpiMetric = { key: string; label: string; unit: string };

export const KPI_METRICS: KpiMetric[] = [
  { key: 'revenue', label: 'Doanh thu — kế hoạch ĐHCĐ vs thực hiện', unit: 'tỷ' },
  { key: 'gross_profit', label: 'Lợi nhuận gộp — kế hoạch vs thực hiện', unit: 'tỷ' },
];

const BY_KEY = new Map(KPI_METRICS.map((m) => [m.key, m]));
export function listKpiMetrics(): KpiMetric[] {
  return KPI_METRICS;
}
export function getKpiMetric(key: string | null): KpiMetric | undefined {
  return key ? BY_KEY.get(key) : undefined;
}
export function isKpiMetric(key: string | null): boolean {
  return !!key && BY_KEY.has(key);
}

// Scope bán lẻ (giống price-engine): loại nội bộ + pháp nhân SX/BN/HD.
const RETAIL =
  "is_revenue_recognized=TRUE AND CAST(internal_sales AS STRING)='false' AND company_code NOT IN ('SX','BN','HD')";
const PLAN_TBL = '`btmh-dwh-485609.dwh_fact.f_ke_hoach_kinh_doanh_2`';
const SALES_TBL = 'op_finance.v_flatten_sales';

function planSql(metric: string, from: string, to: string): string {
  const col = metric === 'gross_profit' ? 'loi_nhuan_gop' : 'doanh_thu';
  return `SELECT SUM(${col}) v FROM ${PLAN_TBL}
          WHERE version='ĐHCĐ' AND ngay BETWEEN DATE('${from}') AND DATE('${to}')`;
}
function actualSql(metric: string, from: string, to: string): string {
  const col = metric === 'gross_profit' ? 'gross_profit_vnd' : 'line_income_vnd';
  return `SELECT SUM(${col}) v FROM ${SALES_TBL}
          WHERE ${RETAIL} AND bill_date BETWEEN DATE('${from}') AND DATE('${to}')`;
}

function todayVn(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}

type KrPeriodRow = {
  id: string;
  kpi_source: string;
  starts_on: string;
  ends_on: string;
};

/**
 * Đồng bộ 1 Key Result: đọc kỳ của objective, lấy kế hoạch cả kỳ (target) +
 * thực hiện tới hôm nay (current). Trả true nếu có cập nhật.
 */
export async function syncKrKpi(krId: string): Promise<boolean> {
  const kr = await queryOne<KrPeriodRow>(
    `SELECT k.id, k.kpi_source, p.starts_on::text, p.ends_on::text
       FROM okr_key_results k
       JOIN okr_objectives o ON o.id = k.objective_id
       JOIN okr_periods p ON p.id = o.period_id
      WHERE k.id = $1`,
    [krId],
  );
  if (!kr || !isKpiMetric(kr.kpi_source)) return false;
  const today = todayVn();
  const actualTo = kr.ends_on < today ? kr.ends_on : today;
  const plan = await bqScalar(planSql(kr.kpi_source, kr.starts_on, kr.ends_on));
  const actual = await bqScalar(actualSql(kr.kpi_source, kr.starts_on, actualTo));
  if (plan === null && actual === null) return false;
  await setKrAutoValues(kr.id, plan, actual);
  return true;
}

/** Đồng bộ MỌI KR có kpi_source. Trả về số KR cập nhật / tổng. */
export async function syncAllKpi(): Promise<{ updated: number; total: number }> {
  const krs = await query<{ id: string }>(
    `SELECT id FROM okr_key_results WHERE kpi_source IS NOT NULL`,
  );
  let updated = 0;
  for (const k of krs) {
    try {
      if (await syncKrKpi(k.id)) updated++;
    } catch {
      /* best-effort: 1 KR lỗi không chặn các KR khác */
    }
  }
  return { updated, total: krs.length };
}
