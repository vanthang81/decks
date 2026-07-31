import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import ObjectiveTree, { type TreeObjective } from '@/components/ObjectiveTree';
import PeriodPicker from '@/components/PeriodPicker';
import { requireUser } from '@/lib/current-user';
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
  await requireUser();
  const periods = await listPeriods();
  const period = searchParams.period
    ? await getPeriod(searchParams.period)
    : (await getCurrentPeriod()) ?? periods[0] ?? null;

  const objectives = period ? await listObjectivesByPeriod(period.id) : [];
  const overLimit = period ? await ownersOverObjectiveLimit(period.id) : [];

  // Chỉ truyền field cần cho cây (serializable) sang client component.
  const treeData: TreeObjective[] = objectives.map((o) => ({
    id: o.id,
    code: o.code,
    parent_id: o.parent_id,
    level: o.level,
    title: o.title,
    unit_name: o.unit_name,
    owner_name: o.owner_name,
    kr_count: o.kr_count,
    progress: o.progress,
  }));

  return (
    <>
      <SiteHeader active="okr" />
      <div className="wrap">
        <div className="flexbtw">
          <div>
            <div className="pagetitle">Toàn bộ OKR</div>
            <p className="subtitle">
              Cây mục tiêu theo alignment: Công ty → Khối → Phòng ban → Cá nhân.
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
          {period && objectives.length > 0 && <ObjectiveTree objectives={treeData} />}
        </div>
      </div>
    </>
  );
}
