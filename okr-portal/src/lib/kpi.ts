import { query, queryOne } from './db';
import { bqScalar } from './bigquery';
import { setKrAutoValues } from './okr';
import { setKpiActual } from './kpi-values';

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

// ============================================================================
// Auto-fill ACTUAL cho Scorecard (Thư viện KPI) — CHỈ số thực hiện (không target),
// cấp CÔNG TY, kỳ hiện tại, dùng scope bán lẻ đã kiểm chứng. Map theo MÃ KPI thư viện.
// Chỉ những KPI ánh xạ SẠCH sang v_flatten_sales; các KPI khác nhập tay / phase sau.
// ============================================================================
// Nguồn bổ sung (từ điển dữ liệu đã kiểm chứng): mua vào + tồn kho.
const BUYBACK_TBL = 'op_finance.v_flatten_buyback';
const INV_TBL = 'op_finance.v_so_du_ton_kho';
const BUYBACK_SCOPE = "company_code NOT IN ('SX','BN','HD')"; // bán lẻ NY+SG
const INV_SCOPE = "nguon NOT IN ('Bắc Ninh','Sản xuất','Hải Dương')"; // bán lẻ

const KPI_ACTUAL_SQL: Record<string, (from: string, to: string) => string> = {
  // ── Scorecard (đã kiểm chứng) ──
  // T1-01 Lợi nhuận gộp thương mại = SUM(gross_profit_vnd), scope bán lẻ
  'T1-01': (f, t) =>
    `SELECT SUM(gross_profit_vnd) v FROM ${SALES_TBL} WHERE ${RETAIL} AND bill_date BETWEEN DATE('${f}') AND DATE('${t}')`,
  // T1-03 Sản lượng (chỉ quy 24K) = SUM(gold_weight_chi), scope bán lẻ
  'T1-03': (f, t) =>
    `SELECT SUM(gold_weight_chi) v FROM ${SALES_TBL} WHERE ${RETAIL} AND bill_date BETWEEN DATE('${f}') AND DATE('${t}')`,

  // ── Nhóm A · KPI vận hành (BAU) — công thức từ từ điển dữ liệu ──
  // OPS-01 Doanh thu = SUM(line_income_vnd), scope bán lẻ
  'OPS-01': (f, t) =>
    `SELECT SUM(line_income_vnd) v FROM ${SALES_TBL} WHERE ${RETAIL} AND bill_date BETWEEN DATE('${f}') AND DATE('${t}')`,
  // OPS-02 Số hóa đơn = COUNT(DISTINCT bill_id), scope bán lẻ
  'OPS-02': (f, t) =>
    `SELECT COUNT(DISTINCT bill_id) v FROM ${SALES_TBL} WHERE ${RETAIL} AND bill_date BETWEEN DATE('${f}') AND DATE('${t}')`,
  // OPS-03 Sản lượng mua vào (chỉ) = SUM(assessed_weight_chi), buyback bán lẻ
  'OPS-03': (f, t) =>
    `SELECT SUM(assessed_weight_chi) v FROM ${BUYBACK_TBL} WHERE ${BUYBACK_SCOPE} AND buyback_date BETWEEN DATE('${f}') AND DATE('${t}')`,
  // OPS-04 Giá trị mua vào = SUM(net_buyback_amount_vnd), buyback bán lẻ
  'OPS-04': (f, t) =>
    `SELECT SUM(net_buyback_amount_vnd) v FROM ${BUYBACK_TBL} WHERE ${BUYBACK_SCOPE} AND buyback_date BETWEEN DATE('${f}') AND DATE('${t}')`,
  // OPS-05 Tồn kho (giá trị) = SUM(ton_cuoi_ngay_gt) tại ngày MỚI NHẤT ≤ to
  'OPS-05': (_f, t) =>
    `SELECT SUM(ton_cuoi_ngay_gt) v FROM ${INV_TBL} WHERE ${INV_SCOPE}
       AND ngay = (SELECT MAX(ngay) FROM ${INV_TBL} WHERE ${INV_SCOPE} AND ngay <= DATE('${t}'))`,
  // OPS-06 Tồn kho (chỉ) = SUM(ton_cuoi_ngay_tl) tại ngày MỚI NHẤT ≤ to
  'OPS-06': (_f, t) =>
    `SELECT SUM(ton_cuoi_ngay_tl) v FROM ${INV_TBL} WHERE ${INV_SCOPE}
       AND ngay = (SELECT MAX(ngay) FROM ${INV_TBL} WHERE ${INV_SCOPE} AND ngay <= DATE('${t}'))`,
};

/** Auto-fill ACTUAL cho các KPI nguồn BigQuery (cấp Công ty, kỳ hiện tại). Best-effort. */
export async function syncKpiScorecardActuals(): Promise<{ updated: number }> {
  const period = await queryOne<{ id: string; starts_on: string; ends_on: string }>(
    `SELECT id, starts_on::text AS starts_on, ends_on::text AS ends_on
       FROM okr_periods ORDER BY is_current DESC LIMIT 1`,
  );
  const company = await queryOne<{ id: string }>(`SELECT id FROM okr_units WHERE type='company' LIMIT 1`);
  if (!period || !company) return { updated: 0 };
  const today = todayVn();
  const to = period.ends_on < today ? period.ends_on : today;
  let updated = 0;
  for (const [code, sqlFn] of Object.entries(KPI_ACTUAL_SQL)) {
    try {
      const kpi = await queryOne<{ id: string }>(
        `SELECT id FROM okr_kpis WHERE code=$1 AND is_active=true`,
        [code],
      );
      if (!kpi) continue;
      const actual = await bqScalar(sqlFn(period.starts_on, to));
      if (actual === null) continue;
      await setKpiActual(kpi.id, period.id, company.id, actual, 'auto:bigquery');
      updated++;
    } catch {
      /* best-effort: 1 KPI lỗi không chặn KPI khác */
    }
  }
  return { updated };
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
