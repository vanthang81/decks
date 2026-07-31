import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { ProgressBar, LevelBadge } from '@/components/ui';
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
  type ObjectiveRow,
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

  // Dựng cây theo parent_id (alignment). Gốc = objective không có parent trong tập.
  const byId = new Map(objectives.map((o) => [o.id, o]));
  const childrenOf = new Map<string, ObjectiveRow[]>();
  const roots: ObjectiveRow[] = [];
  for (const o of objectives) {
    if (o.parent_id && byId.has(o.parent_id)) {
      const arr = childrenOf.get(o.parent_id) ?? [];
      arr.push(o);
      childrenOf.set(o.parent_id, arr);
    } else {
      roots.push(o);
    }
  }

  const render = (o: ObjectiveRow, depth: number): React.ReactNode => {
    const kids = childrenOf.get(o.id) ?? [];
    const indent = depth > 0 ? `indent-${Math.min(depth, 3)}` : '';
    return (
      <div key={o.id}>
        <div className={`obj-row ${indent}`}>
          <div className="obj-main">
            <div className="ttl">
              <LevelBadge level={o.level} />{' '}
              {o.code && <span className="okr-code">{o.code}</span>}{' '}
              <Link href={`/objectives/${o.id}`}>{o.title}</Link>
            </div>
            <div className="obj-meta">
              {o.unit_name ? `${o.unit_name} · ` : ''}
              {o.owner_name ? `Chủ trì: ${o.owner_name} · ` : ''}
              {o.kr_count} KR
            </div>
          </div>
          <div className="obj-prog">
            <ProgressBar value={o.progress} />
            <div className="right muted mono" style={{ fontSize: 12 }}>
              {o.progress.toFixed(0)}%
            </div>
          </div>
        </div>
        {kids.map((k) => render(k, depth + 1))}
      </div>
    );
  };

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
          <div className="row" style={{ flex: '0 0 auto' }}>
            <form method="get" style={{ display: 'flex', gap: 8 }}>
              <select className="i" name="period" defaultValue={period?.id ?? ''}>
                {orderPeriodsHierarchically(periods).map(({ period: p, depth }) => (
                  <option key={p.id} value={p.id}>
                    {'  '.repeat(depth)}
                    {PERIOD_KIND_LABEL[p.kind]}: {p.name}
                    {p.is_current ? ' (hiện tại)' : ''}
                  </option>
                ))}
              </select>
              <button className="btn ghost" type="submit">
                Xem
              </button>
            </form>
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
          {roots.map((o) => render(o, 0))}
        </div>
      </div>
    </>
  );
}
