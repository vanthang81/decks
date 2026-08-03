import { query, queryOne } from './db';
import { kpiStatus, STATUS_LABEL, type KpiStatus } from './kpi-values';
import { integrityIssues, type IntegrityIssue } from './integrity';
import { okrHealthSummary, type HealthSummary } from './health';
import type { KpiDirection } from './kpis';

// ENGINE HỌP ĐIỀU HÀNH (WBR/MBR) — tổng hợp trạng thái 1 kỳ thành gói dữ liệu dùng chung cho
// trang "Họp điều hành", Bản tin tuần (email) và panel "Nhận định & Khuyến nghị" ở Dashboard.

export type UnitRow = {
  code: string | null; name: string; progress: number;
  krTotal: number; krChecked: number; overdue: number;
};
export type KpiAlert = {
  code: string | null; name: string; unit: string | null;
  status: KpiStatus; actual: number | null; target: number | null; unit_label: string | null;
};
export type OkrAttention = {
  id: string; code: string | null; title: string; level: string; unit: string | null;
  progress: number; owner: string | null; checked: boolean;
};
export type OverdueTask = {
  id: string; objectiveId: string | null;
  code: string | null; title: string; owner: string | null; due: string | null; unit: string | null;
};
export type Insight = { tone: 'good' | 'watch' | 'risk'; observe: string; imply: string; recommend: string };

export type ReviewData = {
  periodName: string;
  companyProg: number; elapsed: number; gap: number;
  paceVerdict: { cls: string; txt: string };
  bsc: { key: string; progress: number; n: number }[];
  units: UnitRow[];
  checkinCoverage: number; // 0..1
  krTotal: number; krChecked: number;
  kpiFilled: number; kpiAlerts: KpiAlert[];
  attention: OkrAttention[];
  overdue: OverdueTask[];
  integrity: IntegrityIssue[];
  health: HealthSummary;
  insights: Insight[];
};

const BSC_KEYS = ['financial', 'customer', 'process', 'learning'] as const;

export async function reviewData(period: { id: string; name: string; starts_on: string; ends_on: string }): Promise<ReviewData> {
  const objectives = await query<{
    id: string; code: string | null; title: string; level: string; progress: number;
    owner: string | null; unit_code: string | null; unit_name: string | null; bsc: string | null;
    kr_total: number; kr_checked: number;
  }>(
    `SELECT o.id, o.code, o.title, o.level, o.progress::float8 AS progress,
        ou.display_name AS owner, u.code AS unit_code, u.name AS unit_name, o.bsc_perspective AS bsc,
        (SELECT count(*) FROM okr_key_results k WHERE k.objective_id=o.id)::int AS kr_total,
        (SELECT count(*) FROM okr_key_results k WHERE k.objective_id=o.id
            AND EXISTS (SELECT 1 FROM okr_checkins c WHERE c.key_result_id=k.id))::int AS kr_checked
       FROM okr_objectives o
       LEFT JOIN okr_units u ON u.id=o.unit_id
       LEFT JOIN okr_users ou ON ou.email=o.owner_email
      WHERE o.period_id=$1`,
    [period.id],
  );

  const company = objectives.filter((o) => o.level === 'company');
  const divisions = objectives.filter((o) => o.level === 'division');
  const avg = (a: { progress: number }[]) => (a.length ? a.reduce((s, o) => s + o.progress, 0) / a.length : 0);
  const companyProg = Math.round(avg(company.length ? company : divisions));

  const s = new Date(period.starts_on).getTime();
  const e = new Date(period.ends_on).getTime();
  const elapsed = e > s ? Math.max(0, Math.min(100, Math.round(((Date.now() - s) / (e - s)) * 100))) : 0;
  const gap = companyProg - elapsed;
  const paceVerdict =
    gap >= 5 ? { cls: 'green', txt: `Đang dẫn nhịp +${gap} điểm` }
    : gap <= -5 ? { cls: 'red', txt: `Chậm nhịp ${-gap} điểm` }
    : { cls: 'blue', txt: 'Đúng nhịp kế hoạch' };

  // BSC bars
  const bsc = BSC_KEYS.map((k) => {
    const arr = objectives.filter((o) => o.bsc === k);
    return { key: k, progress: arr.length ? Math.round(avg(arr)) : 0, n: arr.length };
  }).filter((x) => x.n > 0);

  // Overdue tasks per unit + list
  const overdueRows = await query<{ id: string; objective_id: string | null; code: string | null; title: string; owner: string | null; due: string | null; unit_code: string | null; unit_name: string | null }>(
    `SELECT i.id, i.objective_id, i.code, i.title, ou.display_name AS owner, i.due_on::text AS due,
            u.code AS unit_code, u.name AS unit_name
       FROM okr_initiatives i
       JOIN okr_objectives o ON o.id=i.objective_id
       LEFT JOIN okr_units u ON u.id=o.unit_id
       LEFT JOIN okr_users ou ON ou.email=i.owner_email
      WHERE o.period_id=$1 AND i.due_on IS NOT NULL AND i.due_on < CURRENT_DATE
        AND i.status NOT IN ('done','canceled')
      ORDER BY i.due_on ASC`,
    [period.id],
  );
  const overdueByUnit = new Map<string, number>();
  for (const r of overdueRows) overdueByUnit.set(r.unit_code ?? '-', (overdueByUnit.get(r.unit_code ?? '-') ?? 0) + 1);

  // Unit rows (gộp theo Khối)
  const byUnit = new Map<string, UnitRow>();
  for (const o of divisions) {
    const key = o.unit_code ?? o.id;
    const cur = byUnit.get(key) ?? { code: o.unit_code, name: o.unit_name ?? o.title, progress: 0, krTotal: 0, krChecked: 0, overdue: 0 };
    cur.progress += o.progress;
    cur.krTotal += o.kr_total;
    cur.krChecked += o.kr_checked;
    byUnit.set(key, cur);
  }
  const unitObjCount = new Map<string, number>();
  for (const o of divisions) unitObjCount.set(o.unit_code ?? o.id, (unitObjCount.get(o.unit_code ?? o.id) ?? 0) + 1);
  const units: UnitRow[] = [...byUnit.entries()].map(([key, u]) => ({
    ...u,
    progress: Math.round(u.progress / (unitObjCount.get(key) || 1)),
    overdue: overdueByUnit.get(u.code ?? '-') ?? 0,
  })).sort((a, b) => a.progress - b.progress);

  const krTotal = objectives.reduce((s2, o) => s2 + o.kr_total, 0);
  const krChecked = objectives.reduce((s2, o) => s2 + o.kr_checked, 0);
  const checkinCoverage = krTotal ? krChecked / krTotal : 0;

  // KPI alerts (mọi đơn vị, kỳ hiện tại)
  const kpiRows = await query<{
    code: string | null; name: string; unit_label: string | null; direction: KpiDirection;
    tw: number | null; ta: number | null; te: number | null;
    target: number | null; actual: number | null; unit_name: string | null;
  }>(
    `SELECT k.code, k.name, k.unit_label, k.direction,
            k.threshold_watch::float8 AS tw, k.threshold_alert::float8 AS ta, k.threshold_escalate::float8 AS te,
            v.target::float8 AS target, v.actual::float8 AS actual, u.name AS unit_name
       FROM okr_kpi_values v
       JOIN okr_kpis k ON k.id=v.kpi_id
       LEFT JOIN okr_units u ON u.id=v.unit_id
      WHERE v.period_id=$1 AND v.actual IS NOT NULL AND k.is_active`,
    [period.id],
  );
  const kpiFilled = kpiRows.length;
  const kpiAlerts: KpiAlert[] = [];
  for (const r of kpiRows) {
    const st = kpiStatus(
      { direction: r.direction, threshold_watch: r.tw, threshold_alert: r.ta, threshold_escalate: r.te },
      r.actual, r.target,
    );
    if (st === 'alert' || st === 'escalate') {
      kpiAlerts.push({ code: r.code, name: r.name, unit: r.unit_name, status: st, actual: r.actual, target: r.target, unit_label: r.unit_label });
    }
  }
  kpiAlerts.sort((a, b) => (a.status === 'escalate' ? 0 : 1) - (b.status === 'escalate' ? 0 : 1));

  // OKR cần chú ý = tiến độ thấp nhất (active, không phải trụ multiyear đã lọc theo period), top 8
  const attention: OkrAttention[] = objectives
    .filter((o) => o.level !== 'company' || company.length > 0) // giữ mọi cấp trong kỳ
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 8)
    .map((o) => ({
      id: o.id, code: o.code, title: o.title, level: o.level, unit: o.unit_name,
      progress: Math.round(o.progress), owner: o.owner, checked: o.kr_checked > 0,
    }));

  const overdue: OverdueTask[] = overdueRows.slice(0, 12).map((r) => ({
    id: r.id, objectiveId: r.objective_id, code: r.code, title: r.title, owner: r.owner, due: r.due, unit: r.unit_name,
  }));

  const integrity = await integrityIssues(period.id).catch(() => []);
  const health = await okrHealthSummary(period.id);

  // ---- Nhận định & Khuyến nghị (rule-based: Quan sát → Hàm ý → Khuyến nghị) ----
  const insights: Insight[] = [];
  // 1. Nhịp độ
  if (gap <= -5) {
    insights.push({
      tone: 'risk',
      observe: `Tiến độ công ty ${companyProg}% đang chậm hơn nhịp thời gian ${elapsed}% (lệch ${gap} điểm).`,
      imply: 'Nếu giữ tốc độ này, khả năng cao không đạt mục tiêu cuối kỳ.',
      recommend: 'Rà các OKR/Khối chậm nhất, dồn nguồn lực hoặc điều chỉnh phạm vi; đưa vào họp điều hành.',
    });
  } else if (gap >= 5) {
    insights.push({
      tone: 'good',
      observe: `Tiến độ công ty ${companyProg}% đang vượt nhịp thời gian ${elapsed}% (+${gap} điểm).`,
      imply: 'Đang dẫn nhịp — có dư địa nâng mục tiêu hoặc củng cố chất lượng.',
      recommend: 'Giữ nhịp; cân nhắc đặt mục tiêu khát vọng cho phần còn lại của kỳ.',
    });
  }
  // 2. Độ phủ check-in
  if (checkinCoverage < 0.5) {
    insights.push({
      tone: checkinCoverage < 0.25 ? 'risk' : 'watch',
      observe: `Chỉ ${Math.round(checkinCoverage * 100)}% KR (${krChecked}/${krTotal}) được check-in.`,
      imply: 'Số tiến độ chưa phản ánh đúng thực tế → khó ra quyết định điều hành.',
      recommend: 'Bật nhắc check-in định kỳ (Quản trị → Thiết lập) và yêu cầu cập nhật trước mỗi kỳ họp.',
    });
  }
  // 3. KPI
  if (kpiAlerts.length > 0) {
    const esc = kpiAlerts.filter((a) => a.status === 'escalate').length;
    insights.push({
      tone: esc > 0 ? 'risk' : 'watch',
      observe: `${kpiAlerts.length} KPI đang ở mức Cảnh báo/Khẩn${esc ? ` (trong đó ${esc} Khẩn)` : ''}.`,
      imply: 'Có chỉ số vận hành lệch ngưỡng an toàn, cần can thiệp sớm.',
      recommend: `Giao chủ sở hữu KPI phân tích nguyên nhân & hành động: ${kpiAlerts.slice(0, 3).map((a) => a.code ?? a.name).join(', ')}.`,
    });
  } else if (kpiFilled === 0) {
    insights.push({
      tone: 'watch',
      observe: 'Chưa có KPI nào được nhập/đồng bộ số ở kỳ này.',
      imply: 'Scorecard chưa đo được — chuỗi "đo lường" còn hở.',
      recommend: 'Nhập mục tiêu KPI (Nhóm A đã tự lấy số thực hiện); đặt target để tính điểm scorecard.',
    });
  }
  // 4. Toàn vẹn alignment
  if (integrity.length > 0) {
    const top = integrity.slice(0, 3).map((i) => `${i.label} (${i.count})`).join('; ');
    insights.push({
      tone: 'watch',
      observe: `Còn ${integrity.reduce((s2, i) => s2 + i.count, 0)} điểm hở trong chuỗi chiến lược→thực thi: ${top}.`,
      imply: 'Chuỗi liên kết chưa liền mạch làm giảm hiệu lực điều hành theo mục tiêu.',
      recommend: 'Bịt lần lượt trên trang Bản đồ / chi tiết OKR (gán chủ trì, cascade, gắn việc/KPI).',
    });
  }
  // 5. Sức khỏe OKR
  if (health.weak > 0) {
    insights.push({
      tone: 'watch',
      observe: `${health.weak}/${health.total} OKR có điểm sức khỏe yếu (<60); điểm trung bình ${health.avg}.`,
      imply: 'Một số OKR thiếu yếu tố nền (KR/chủ trì/liên kết/thực thi) → khó đo và khó đạt.',
      recommend: health.gaps[0] ? `Ưu tiên bổ sung: ${health.gaps[0].label} (${health.gaps[0].missing} OKR còn thiếu).` : 'Bổ sung các yếu tố còn thiếu theo checklist sức khỏe.',
    });
  }
  // 6. Việc quá hạn
  if (overdue.length > 0) {
    insights.push({
      tone: overdueRows.length >= 10 ? 'risk' : 'watch',
      observe: `${overdueRows.length} công việc đã quá hạn và chưa hoàn thành.`,
      imply: 'Thực thi đang trễ so với kế hoạch, ảnh hưởng kết quả KR.',
      recommend: 'Chủ trì rà lại hạn & nguồn lực; cập nhật trạng thái hoặc dời hạn có kiểm soát.',
    });
  }
  if (insights.length === 0) {
    insights.push({
      tone: 'good',
      observe: 'Không phát hiện rủi ro nổi bật ở kỳ này.',
      imply: 'Hệ thống đang vận hành ổn định theo mục tiêu.',
      recommend: 'Duy trì nhịp check-in và theo dõi KPI định kỳ.',
    });
  }

  return {
    periodName: period.name, companyProg, elapsed, gap, paceVerdict, bsc, units,
    checkinCoverage, krTotal, krChecked, kpiFilled, kpiAlerts, attention, overdue, integrity, health, insights,
  };
}

/** Lấy kỳ hiện tại (hoặc mới nhất) rồi dựng ReviewData. */
export async function currentReviewData(): Promise<ReviewData | null> {
  const p = await queryOne<{ id: string; name: string; starts_on: string; ends_on: string }>(
    `SELECT id, name, starts_on::text AS starts_on, ends_on::text AS ends_on
       FROM okr_periods ORDER BY is_current DESC, starts_on DESC LIMIT 1`,
  );
  if (!p) return null;
  return reviewData(p);
}
