import SiteHeader from '@/components/SiteHeader';
import ObjectiveTree, { type TreeObjective } from '@/components/ObjectiveTree';
import PeriodPicker from '@/components/PeriodPicker';
import HelpTip from '@/components/HelpTip';
import ImportOkr from '@/components/ImportOkr';
import NewObjectiveModal from '@/components/NewObjectiveModal';
import ExportOkrModal from '@/components/ExportOkrModal';
import { buildObjectiveFormProps } from '@/lib/objective-form';
import { createObjectiveAction } from './actions';
import { requireUser } from '@/lib/current-user';
import { listUnits, objectiveViewScope, canViewObjectiveUnit } from '@/lib/org';
import { unitTreeOptions } from '@/lib/unit-options';
import { loadAccess, canImportData } from '@/lib/access';
import {
  getCurrentPeriod,
  listPeriods,
  getPeriod,
  orderPeriodsHierarchically,
  descendantPeriods,
  PERIOD_KIND_LABEL,
} from '@/lib/periods';
import {
  listObjectivesByPeriod,
  listObjectivesByPeriods,
  ownersOverObjectiveLimit,
  MAX_OBJ_PER_OWNER,
} from '@/lib/okr';

export const dynamic = 'force-dynamic';

export default async function ObjectivesPage({
  searchParams,
}: {
  searchParams: { period?: string; owner?: string };
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
  // Dữ liệu cho popup "+ Tạo OKR" (chỉ khi có kỳ + không phải nhân viên).
  const okrFormProps = period && user.role !== 'staff' ? await buildObjectiveFormProps(user, period.id) : null;

  // Chỉ truyền field cần cho cây (serializable) sang client component.
  const toTree = (rows: typeof objectives): TreeObjective[] =>
    rows.map((o) => ({
      id: o.id, code: o.code, parent_id: o.parent_id, level: o.level, title: o.title,
      unit_id: o.unit_id, unit_name: o.unit_name, unit_code: o.unit_code,
      owner_name: o.owner_name, owner_email: o.owner_email, status: o.status,
      okr_type: o.okr_type, kr_count: o.kr_count, progress: o.progress,
    }));
  const treeData: TreeObjective[] = toTree(objectives);

  // KỲ CON: khi xem kỳ NĂM/QUÝ → gom thêm OKR của các kỳ con (Quý/Tháng) ĐÃ ĐẶT, nhóm theo từng kỳ con.
  // Vẫn tôn trọng phạm vi đọc (nhân viên chỉ thấy OKR đơn vị mình).
  const showChildren = !!period && (period.kind === 'year' || period.kind === 'quarter');
  const childList = showChildren ? descendantPeriods(periods, period!.id) : [];
  const childObjsRaw = childList.length ? await listObjectivesByPeriods(childList.map((p) => p.id)) : [];
  const childObjs = viewScope === null
    ? childObjsRaw
    : childObjsRaw.filter((o) => canViewObjectiveUnit(viewScope, o, user.email));
  const childByPeriod = new Map<string, typeof childObjs>();
  for (const o of childObjs) {
    const arr = childByPeriod.get(o.period_id) ?? [];
    arr.push(o);
    childByPeriod.set(o.period_id, arr);
  }
  const childSections = childList
    .map((p) => ({ period: p, objs: childByPeriod.get(p.id) ?? [] }))
    .filter((sec) => sec.objs.length > 0)
    .map((sec) => ({
      period: sec.period,
      count: sec.objs.length,
      avg: Math.round(sec.objs.reduce((a, o) => a + (o.progress ?? 0), 0) / sec.objs.length),
      tree: toTree(sec.objs),
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
            <span data-tour="objectives-export" style={{ display: 'inline-flex' }}>
              <ExportOkrModal
                periods={orderPeriodsHierarchically(periods).map(({ period: p, depth }) => ({
                  value: p.id,
                  label: `${'· '.repeat(depth)}${PERIOD_KIND_LABEL[p.kind]}: ${p.name}`,
                }))}
                units={unitOptions}
                currentPeriodId={period?.id ?? null}
              />
            </span>
            {okrFormProps && (
              <span data-tour="objectives-new" style={{ display: 'inline-flex' }}>
                <NewObjectiveModal formProps={okrFormProps} create={createObjectiveAction} />
              </span>
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

        <div className="card" data-tour="objectives-tree">
          {!period && <p className="muted">Chưa có kỳ OKR.</p>}
          {period && objectives.length === 0 && (
            <p className="muted">Kỳ này chưa có OKR nào. Bấm “+ Tạo OKR”.</p>
          )}
          {period && objectives.length > 0 && <ObjectiveTree objectives={treeData} unitOptions={unitOptions} initialOwner={searchParams.owner} />}
        </div>

        {childSections.length > 0 && (
          <div className="card">
            <div className="flexbtw" style={{ alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
              <h3 style={{ margin: '0 0 2px' }}>OKR theo kỳ con</h3>
              <span className="muted" style={{ fontSize: 12.5 }}>
                Kỳ {PERIOD_KIND_LABEL[period!.kind]} “{period!.name}” gồm {childSections.length} kỳ con có OKR
              </span>
            </div>
            <p className="subtitle" style={{ marginTop: 0 }}>
              Mở từng kỳ con (Quý/Tháng) để xem cây OKR riêng của kỳ đó.
            </p>
            {childSections.map((sec) => (
              <details key={sec.period.id} style={{ borderTop: '1px solid var(--line)', padding: '10px 0' }}>
                <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="badge gray">{PERIOD_KIND_LABEL[sec.period.kind]}</span>
                  <b>{sec.period.name}</b>
                  <span className="muted" style={{ fontSize: 12.5 }}>· {sec.count} OKR</span>
                  <span style={{ flex: 1, minWidth: 8 }} />
                  <span style={{ width: 120, height: 7, background: 'var(--line)', borderRadius: 999, overflow: 'hidden', flex: '0 0 auto' }}>
                    <span style={{ display: 'block', height: '100%', width: `${sec.avg}%`, background: 'var(--primary)' }} />
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 13, width: 36, textAlign: 'right' }}>{sec.avg}%</span>
                </summary>
                <div style={{ marginTop: 12 }}>
                  <ObjectiveTree objectives={sec.tree} unitOptions={unitOptions} />
                </div>
              </details>
            ))}
          </div>
        )}

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
