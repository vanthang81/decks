import { query, queryOne } from './db';
import { setKeyResultValue } from './okr';

// ============================================================================
// Registry NGUỒN KPI — khóa (key) → cách kéo giá trị "actual" hiện tại.
// KR gắn kpi_source = key sẽ tự cập nhật current_value khi chạy syncKpiSources().
//
// Dữ liệu tài chính (doanh thu, lãi gộp...) của BTMH nằm ở BigQuery (qua Metabase),
// KHÔNG query thẳng trong Postgres — các nguồn đó sẽ nối qua API price-engine ở phase sau.
// Postgres btmh_data có sẵn pe_cf_* (dòng tiền/ngân sách) → làm nguồn Postgres trực tiếp.
// Mỗi fetcher best-effort: lỗi/không có bảng → trả null (không chặn app).
// ============================================================================

export type KpiSource = {
  key: string;
  label: string;
  unit: string; // nhãn đơn vị gợi ý
  metric: 'number' | 'percent' | 'currency';
  fetch: () => Promise<number | null>;
};

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export const KPI_SOURCES: KpiSource[] = [
  {
    key: 'cf.cash_total',
    label: 'Tổng tồn quỹ (LCTT) — hiện tại',
    unit: 'tỷ',
    metric: 'currency',
    fetch: () =>
      safe(async () => {
        const r = await queryOne<{ v: number }>(
          `SELECT COALESCE(SUM(so_du),0)::float8 AS v
             FROM pe_cf_cash_summary
            WHERE updated_at = (SELECT max(updated_at) FROM pe_cf_cash_summary)`,
        );
        return r?.v ?? null;
      }),
  },
  {
    key: 'cf.budget_actual_ytd',
    label: 'Ngân sách — thực chi luỹ kế (pe_cf_budget)',
    unit: 'tỷ',
    metric: 'currency',
    fetch: () =>
      safe(async () => {
        const r = await queryOne<{ v: number }>(
          `SELECT COALESCE(SUM(actual),0)::float8 AS v FROM pe_cf_budget`,
        );
        return r?.v ?? null;
      }),
  },
];

const BY_KEY = new Map(KPI_SOURCES.map((s) => [s.key, s]));

export function getKpiSource(key: string | null): KpiSource | undefined {
  return key ? BY_KEY.get(key) : undefined;
}

export function listKpiSources(): KpiSource[] {
  return KPI_SOURCES;
}

/**
 * Đồng bộ mọi Key Result có kpi_source → cập nhật current_value + progress.
 * Gọi từ cron/route (phase sau). Trả về số KR đã cập nhật.
 */
export async function syncKpiSources(): Promise<number> {
  const krs = await query<{ id: string; kpi_source: string }>(
    `SELECT id, kpi_source FROM okr_key_results WHERE kpi_source IS NOT NULL`,
  );
  let n = 0;
  for (const kr of krs) {
    const src = BY_KEY.get(kr.kpi_source);
    if (!src) continue;
    const val = await src.fetch();
    if (val === null) continue;
    await setKeyResultValue(kr.id, val);
    n++;
  }
  return n;
}
