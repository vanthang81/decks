import SiteHeader from '@/components/SiteHeader';
import HelpTip from '@/components/HelpTip';
import AlignmentMap from '@/components/AlignmentMap';
import { requireUser } from '@/lib/current-user';
import { getCurrentPeriod, listPeriods } from '@/lib/periods';
import { listUnits } from '@/lib/org';
import { loadAccess, canEditObjective } from '@/lib/access';
import { listObjectivesByPeriod, listKrsWithKpiByPeriod } from '@/lib/okr';
import { listKpis } from '@/lib/kpis';

export const dynamic = 'force-dynamic';

export default async function MapPage() {
  const user = await requireUser();
  const period = (await getCurrentPeriod()) ?? (await listPeriods())[0] ?? null;

  if (!period) {
    return (
      <>
        <SiteHeader active="map" />
        <div className="wrap">
          <div className="pagetitle">Bản đồ liên kết<HelpTip k="align-map" /></div>
          <div className="card">
            <p className="muted">Chưa có kỳ OKR nào. Tạo kỳ ở mục Quản trị trước.</p>
          </div>
        </div>
      </>
    );
  }

  const [objectives, krs, kpisAll, units, access] = await Promise.all([
    listObjectivesByPeriod(period.id),
    listKrsWithKpiByPeriod(period.id),
    listKpis(),
    listUnits(),
    loadAccess(),
  ]);
  const kpis = kpisAll.filter((k) => k.is_active);

  // Tập OKR mà người dùng ĐƯỢC SỬA → chỉ những card này mới kéo–thả / chỉnh liên kết.
  const manageableIds = objectives
    .filter((o) => canEditObjective(user, o, units, access))
    .map((o) => o.id);

  const objData = objectives.map((o) => ({
    id: o.id,
    code: o.code,
    title: o.title,
    level: o.level,
    unit_name: o.unit_name,
    unit_code: o.unit_code,
    owner_name: o.owner_name,
    progress: o.progress,
    bsc_perspective: o.bsc_perspective,
    parent_id: o.parent_id,
    kr_count: o.kr_count,
  }));
  const krData = krs.map((k) => ({
    id: k.id,
    code: k.code,
    objective_id: k.objective_id,
    title: k.title,
    progress: k.progress,
    indicator: k.indicator,
    kpi_id: k.kpi_id,
    kpi_code: k.kpi_code,
    kpi_name: k.kpi_name,
  }));
  const kpiData = kpis.map((k) => ({
    id: k.id,
    code: k.code,
    name: k.name,
    bsc_perspective: k.bsc_perspective,
    unit_name: k.unit_name,
  }));

  return (
    <>
      <SiteHeader active="map" />
      <div className="wrap">
        <div className="pagetitle">
          Bản đồ liên kết chiến lược<HelpTip k="align-map" />
        </div>
        <p className="subtitle">
          Toàn cảnh chuỗi <b>BSC → Mục tiêu → Kết quả then chốt → KPI</b> · kỳ <b>{period.name}</b>.
          Kéo–thả một mục tiêu sang làn Viễn cảnh khác để gắn BSC; mở ⚙ để đặt cấp trên (cascade) & gắn KPI.
        </p>
        <AlignmentMap
          objectives={objData}
          krs={krData}
          kpis={kpiData}
          manageableIds={manageableIds}
        />
      </div>
    </>
  );
}
