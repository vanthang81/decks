import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import ObjectiveTree, { type TreeObjective } from '@/components/ObjectiveTree';
import PeriodPicker from '@/components/PeriodPicker';
import HelpTip from '@/components/HelpTip';
import ImportOkr from '@/components/ImportOkr';
import { requireUser } from '@/lib/current-user';
import { listUnits, objectiveViewScope, canViewObjectiveUnit } from '@/lib/org';
import { unitTreeOptions } from '@/lib/unit-options';
import { loadAccess, canImportData } from '@/lib/access';
import {
  getCurrentPeriod,
  listPeriods,
  getPeriod,
  orderPeriodsHierarchically,
  PERIOD_KIND_LABEL,
} from '@/lib/periods';
import {
  listObjectivesByPeriod,
  ownersOverObjectiveLimit,
  MAX_OBJ_PER_OWNER,
} from '@/lib/okr';

export const dynamic = 'force-dynamic';

export default async function ObjectivesPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const user = await requireUser();
  const periods = await listPeriods();
  const period = searchParams.period
    ? await getPeriod(searchParams.period)
    : (await getCurrentPeriod()) ?? periods[0] ?? null;

  const canImport = canImportData(user, await loadAccess());
  const allObjectives = period ? await listObjectivesByPeriod(period.id) : [];
  const overLimit = period ? await ownersOverObjectiveLimit(period.id) : [];
  const units = await listUnits();
  // Phạm vi ĐỌC: nhân viên (staff) chỉ thấy OKR trong đơn vị mình + chuỗi cấp trên; điều hành &
  // trưởng khối/phòng thấy tất cả. Lọc TẠI NGUỒN để không lộ OKR khối khác cho nhân viên.
  const viewScope = objectiveViewScope(user, units);
  const objectives = viewScope === null
    ? allObjectives
    : allObjectives.filter((o) => canViewObjectiveUnit(viewScope, o, user.email));
  const scopedView = viewScope !== null;
  const unitOptions = unitTreeOptions(units, { excludeCompany: true });

  // Chỉ truyền field cần cho cây (serializable) sang client component.
  const treeData: TreeObjective[] = objectives.map((o) => ({
    id: o.id,
    code: o.code,
    parent_id: o.parent_id,
    level: o.level,
    title: o.title,
    unit_id: o.unit_id,
    unit_name: o.unit_name,
    unit_code: o.unit_code,
    owner_name: o.owner_name,
    owner_email: o.owner_email,
    status: o.status,
    okr_type: o.okr_type,
    kr_count: o.kr_count,
    progress: o.progress,
  }));

  return (
    <>
      <SiteHeader active="okr" />
      <div className="wrap">
        <div className="flexbtw">
          <div>
            <div className="pagetitle">{scopedView ? 'OKR của đơn vị tôi' : 'Toàn bộ OKR'}<HelpTip k="okr-cascade" /></div>
            <p className="subtitle">
              {scopedView
                ? 'Bạn đang xem OKR trong phạm vi đơn vị mình (kèm mục tiêu cấp Công ty/Khối mà đơn vị align lên). Chế độ chỉ xem.'
                : 'Cây mục tiêu theo alignment: Công ty → Khối → Phòng ban → Cá nhân.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', flex: '0 0 auto' }}>
            <PeriodPicker
              periods={orderPeriodsHierarchically(periods).map(({ period: p, depth }) => ({
                id: p.id,
                label: `${PERIOD_KIND_LABEL[p.kind]}: ${p.name}`,
                depth,
                isCurrent: p.is_current,
              }))}
              currentId={period?.id ?? null}
              basePath="/objectives"
            />
            {canImport && (
              <a className="btn ghost" href="/api/export?template=1" title="Tải form Excel mẫu (có sheet Hướng dẫn + ví dụ) để điền rồi nhập lại cho nhanh">
                ⬇ Form mẫu
              </a>
            )}
            {period && (
              <a className="btn ghost" href={`/api/export?period=${period.id}`} title="Xuất toàn bộ OKR kỳ này ra Excel">
                ⬇ Xuất Excel
              </a>
            )}
            {period && (
              <Link className="btn" href={`/objectives/new?period=${period.id}`}>
                + Tạo OKR
              </Link>
            )}
          </div>
        </div>

        {overLimit.length > 0 && (
          <div
            className="card"
            style={{ background: '#fef3c7', borderColor: '#d97706', color: '#92400e' }}
          >
            ⚠️ Nên tập trung ≤ {MAX_OBJ_PER_OWNER} OKR/người mỗi kỳ. Đang vượt:{' '}
            {overLimit.map((o) => `${o.owner_name || o.owner_email} (${o.n})`).join(', ')}.
          </div>
        )}

        <div className="card">
          {!period && <p className="muted">Chưa có kỳ OKR.</p>}
          {period && objectives.length === 0 && (
            <p className="muted">Kỳ này chưa có OKR nào. Bấm “+ Tạo OKR”.</p>
          )}
          {period && objectives.length > 0 && <ObjectiveTree objectives={treeData} unitOptions={unitOptions} />}
        </div>

        {canImport && (
          <div className="card">
            <div className="pagetitle" style={{ fontSize: 16 }}>
              Nhập OKR hàng loạt từ Excel<HelpTip k="okr-import" />
            </div>
            <p className="subtitle" style={{ marginTop: 2 }}>
              Tải <b>Form mẫu</b> ở trên → điền nhiều OKR/KR/công việc → nhập lại để tạo nhanh (không cần khai từng cái).
            </p>
            <ImportOkr />
          </div>
        )}
      </div>
    </>
  );
}
