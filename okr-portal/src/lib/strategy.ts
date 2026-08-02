import { query } from './db';
import { getSetting, setSetting } from './settings';
import type { BscPerspective } from './okr';

// CHIẾN LƯỢC CÔNG TY — đỉnh của chuỗi phương pháp luận (khai báo TRƯỚC khi cascade OKR):
// Tầm nhìn · Sứ mệnh · Giá trị cốt lõi · Khát vọng/định vị · Chân trời chiến lược.
// Lưu ở okr_settings key 'company_strategy' (jsonb). Trụ cột chiến lược = OKR multiyear cấp Công ty.

export const STRATEGY_KEY = 'company_strategy';

export type CompanyStrategy = {
  vision: string;
  mission: string;
  ambition: string; // khát vọng / định vị chiến lược
  values: string[]; // giá trị cốt lõi
  horizon: string; // vd "2026–2030"
};

export const EMPTY_STRATEGY: CompanyStrategy = {
  vision: '', mission: '', ambition: '', values: [], horizon: '',
};

export async function getCompanyStrategy(): Promise<CompanyStrategy> {
  const s = await getSetting<Partial<CompanyStrategy>>(STRATEGY_KEY, {});
  return {
    vision: s.vision ?? '',
    mission: s.mission ?? '',
    ambition: s.ambition ?? '',
    values: Array.isArray(s.values) ? s.values : [],
    horizon: s.horizon ?? '',
  };
}

export async function setCompanyStrategy(input: CompanyStrategy): Promise<void> {
  await setSetting(STRATEGY_KEY, {
    vision: input.vision.trim(),
    mission: input.mission.trim(),
    ambition: input.ambition.trim(),
    values: input.values.map((v) => v.trim()).filter(Boolean),
    horizon: input.horizon.trim(),
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
      ORDER BY o.code`,
  );
}

/** Kỳ chiến lược nhiều năm mới nhất (để gợi ý tạo trụ cột). */
export async function strategicPeriod(): Promise<{ id: string; name: string } | null> {
  const r = await query<{ id: string; name: string }>(
    `SELECT id, name FROM okr_periods WHERE kind='multiyear' ORDER BY starts_on DESC LIMIT 1`,
  );
  return r[0] ?? null;
}
