import { query } from './db';

// ĐIỂM SỨC KHỎE OKR — chấm mỗi OKR theo best-practice (có chủ trì, có KR, có KR lagging,
// đã cascade, có thực thi, có check-in gần đây, KR gắn KPI). Nudge chuẩn hóa, không ép.

export type HealthCheckKey =
  | 'owner' | 'has_kr' | 'has_lagging' | 'cascade' | 'execution' | 'checkin' | 'kpi';

export const HEALTH_WEIGHT: Record<HealthCheckKey, number> = {
  owner: 20, has_kr: 20, has_lagging: 10, cascade: 15, execution: 15, checkin: 10, kpi: 10,
};
export const HEALTH_LABEL: Record<HealthCheckKey, string> = {
  owner: 'Có người chủ trì',
  has_kr: 'Có kết quả then chốt (KR)',
  has_lagging: 'Có ≥1 KR đo kết quả (lagging)',
  cascade: 'Đã liên kết cascade (cha/con)',
  execution: 'Có việc thực thi (dự án/công việc)',
  checkin: 'Có check-in gần đây',
  kpi: 'KR gắn KPI thư viện',
};
export const HEALTH_KEYS = Object.keys(HEALTH_WEIGHT) as HealthCheckKey[];

export type OkrHealth = {
  id: string;
  code: string | null;
  title: string;
  level: string;
  unit_name: string | null;
  score: number;
  checks: Record<HealthCheckKey, boolean>;
};

type Raw = {
  id: string; code: string | null; title: string; level: string; unit_name: string | null;
  has_owner: boolean; kr_count: number; lagging_count: number; has_parent: boolean;
  child_count: number; init_count: number; checkin_count: number; kpi_linked: number;
};

/** Chấm sức khỏe mọi OKR trong 1 kỳ. */
export async function okrHealthList(periodId: string): Promise<OkrHealth[]> {
  const rows = await query<Raw>(
    `SELECT o.id, o.code, o.title, o.level, u.name AS unit_name,
        (o.owner_email IS NOT NULL) AS has_owner,
        (SELECT count(*) FROM okr_key_results k WHERE k.objective_id=o.id)::int AS kr_count,
        (SELECT count(*) FROM okr_key_results k WHERE k.objective_id=o.id AND k.indicator='lagging')::int AS lagging_count,
        (o.parent_id IS NOT NULL) AS has_parent,
        (SELECT count(*) FROM okr_objectives c WHERE c.parent_id=o.id)::int AS child_count,
        (SELECT count(*) FROM okr_initiatives i WHERE i.objective_id=o.id
            OR i.key_result_id IN (SELECT id FROM okr_key_results WHERE objective_id=o.id))::int AS init_count,
        (SELECT count(*) FROM okr_checkins c JOIN okr_key_results k ON k.id=c.key_result_id
            WHERE k.objective_id=o.id AND c.created_at > now() - interval '21 days')::int AS checkin_count,
        (SELECT count(*) FROM okr_key_results k WHERE k.objective_id=o.id AND k.kpi_id IS NOT NULL)::int AS kpi_linked
       FROM okr_objectives o
       LEFT JOIN okr_units u ON u.id=o.unit_id
      WHERE o.period_id=$1
      ORDER BY o.level, o.code`,
    [periodId],
  );
  return rows.map((r) => {
    // "cascade OK" = có cha (đã align lên) HOẶC có con (đã rải xuống) — trụ gốc chỉ cần có con.
    const cascade = r.has_parent || r.child_count > 0;
    const checks: Record<HealthCheckKey, boolean> = {
      owner: r.has_owner,
      has_kr: r.kr_count > 0,
      has_lagging: r.lagging_count > 0,
      cascade,
      execution: r.init_count > 0,
      checkin: r.checkin_count > 0,
      kpi: r.kpi_linked > 0,
    };
    let score = 0;
    for (const k of HEALTH_KEYS) if (checks[k]) score += HEALTH_WEIGHT[k];
    return { id: r.id, code: r.code, title: r.title, level: r.level, unit_name: r.unit_name, score, checks };
  });
}

export type HealthSummary = {
  total: number; avg: number;
  good: number; ok: number; weak: number; // ≥80 · 60–79 · <60
  gaps: { key: HealthCheckKey; label: string; missing: number }[]; // hạng mục thiếu nhiều nhất
  weakest: OkrHealth[]; // vài OKR điểm thấp nhất
};

export function healthBand(score: number): 'good' | 'ok' | 'weak' {
  return score >= 80 ? 'good' : score >= 60 ? 'ok' : 'weak';
}

export async function okrHealthSummary(periodId: string): Promise<HealthSummary> {
  const list = await okrHealthList(periodId);
  const total = list.length;
  if (!total) return { total: 0, avg: 0, good: 0, ok: 0, weak: 0, gaps: [], weakest: [] };
  let good = 0, ok = 0, weak = 0, sum = 0;
  const missing: Record<HealthCheckKey, number> = { owner: 0, has_kr: 0, has_lagging: 0, cascade: 0, execution: 0, checkin: 0, kpi: 0 };
  for (const h of list) {
    sum += h.score;
    const b = healthBand(h.score);
    if (b === 'good') good++; else if (b === 'ok') ok++; else weak++;
    for (const k of HEALTH_KEYS) if (!h.checks[k]) missing[k]++;
  }
  const gaps = HEALTH_KEYS.map((k) => ({ key: k, label: HEALTH_LABEL[k], missing: missing[k] }))
    .filter((g) => g.missing > 0)
    .sort((a, b) => b.missing - a.missing);
  const weakest = [...list].sort((a, b) => a.score - b.score).slice(0, 5);
  return { total, avg: Math.round(sum / total), good, ok, weak, gaps, weakest };
}
