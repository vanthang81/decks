import { query } from './db';
import { getSetting, setSetting } from './settings';
import type { BscPerspective } from './okr';

// CHIẾN LƯỢC CÔNG TY — đỉnh của chuỗi phương pháp luận (khai báo TRƯỚC khi cascade OKR):
// Tầm nhìn · Sứ mệnh · Giá trị cốt lõi · Khát vọng/định vị · Chân trời chiến lược.
// Lưu ở okr_settings key 'company_strategy' (jsonb). Trụ cột chiến lược = OKR multiyear cấp Công ty.

export const STRATEGY_KEY = 'company_strategy';

// Cột mốc chiến lược theo NĂM (lộ trình 2026–2030). Số cửa hàng lấy theo FM Project Imperial v52.1.
export type RoadmapYear = {
  year: string;
  market: string; // vị thế thị trường / thương hiệu
  customers: string; // quy mô khách hàng
  capitalization: string; // vốn hoá mục tiêu
  stores: string; // mạng lưới cửa hàng (theo FM)
};

export type CompanyStrategy = {
  vision: string;
  mission: string;
  ambition: string; // khát vọng / định vị chiến lược
  values: string[]; // giá trị cốt lõi
  horizon: string; // vd "2026–2030"
  roadmap?: RoadmapYear[]; // lộ trình theo năm (read-only, seed từ DB)
};

export const EMPTY_STRATEGY: CompanyStrategy = {
  vision: '', mission: '', ambition: '', values: [], horizon: '', roadmap: [],
};

export async function getCompanyStrategy(): Promise<CompanyStrategy> {
  const s = await getSetting<Partial<CompanyStrategy>>(STRATEGY_KEY, {});
  return {
    vision: s.vision ?? '',
    mission: s.mission ?? '',
    ambition: s.ambition ?? '',
    values: Array.isArray(s.values) ? s.values : [],
    horizon: s.horizon ?? '',
    roadmap: Array.isArray(s.roadmap) ? (s.roadmap as RoadmapYear[]) : [],
  };
}

// Lưu 5 trường văn bản; GIỮ NGUYÊN roadmap (biên tập qua seed DB, form không đụng tới).
export async function setCompanyStrategy(input: CompanyStrategy): Promise<void> {
  const cur = await getSetting<Partial<CompanyStrategy>>(STRATEGY_KEY, {});
  await setSetting(STRATEGY_KEY, {
    vision: input.vision.trim(),
    mission: input.mission.trim(),
    ambition: input.ambition.trim(),
    values: input.values.map((v) => v.trim()).filter(Boolean),
    horizon: input.horizon.trim(),
    roadmap: Array.isArray(cur.roadmap) ? cur.roadmap : [],
  });
}

export type Pillar = {
  id: string;
  code: string | null;
  title: string;
  description: string | null;
  progress: number;
  bsc_perspective: BscPerspective | null;
  owner: string | null;
  child_count: number;
};

/** Trụ cột chiến lược = Objective cấp Công ty thuộc kỳ 'multiyear' (vd 5 trụ 2026–2030). */
export async function listStrategicPillars(): Promise<Pillar[]> {
  return query<Pillar>(
    `SELECT o.id, o.code, o.title, o.description, o.progress::float8 AS progress,
            o.bsc_perspective, ou.display_name AS owner,
            (SELECT count(*) FROM okr_objectives c WHERE c.parent_id=o.id)::int AS child_count
       FROM okr_objectives o
       JOIN okr_periods p ON p.id=o.period_id AND p.kind='multiyear'
       LEFT JOIN okr_users ou ON ou.email=o.owner_email
      WHERE o.level='company'
      ORDER BY o.sort NULLS LAST, o.code`,
  );
}

/** Sắp xếp lại trụ cột chiến lược theo thứ tự id truyền vào (ghi cột sort). Chỉ OKR cấp Công ty kỳ
 *  chiến lược nhiều năm mới bị ảnh hưởng (chặn ghi nhầm objective khác). */
export async function reorderPillars(orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) return;
  await query(
    `UPDATE okr_objectives o SET sort = v.ord - 1
       FROM (SELECT unnest($1::uuid[]) AS id, generate_subscripts($1::uuid[], 1) AS ord) v
      WHERE o.id = v.id AND o.level='company'
        AND o.period_id IN (SELECT id FROM okr_periods WHERE kind='multiyear')`,
    [orderedIds],
  );
}

/** Kỳ chiến lược nhiều năm mới nhất (để gợi ý tạo trụ cột). */
export async function strategicPeriod(): Promise<{ id: string; name: string } | null> {
  const r = await query<{ id: string; name: string }>(
    `SELECT id, name FROM okr_periods WHERE kind='multiyear' ORDER BY starts_on DESC LIMIT 1`,
  );
  return r[0] ?? null;
}
