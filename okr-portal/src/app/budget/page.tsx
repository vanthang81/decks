import Link from 'next/link';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import HelpTip from '@/components/HelpTip';
import { requireUser } from '@/lib/current-user';
import { isExec } from '@/lib/rbac';
import { getCurrentPeriod, listPeriods, getPeriod, orderPeriodsHierarchically, PERIOD_KIND_LABEL } from '@/lib/periods';
import { budgetOverview } from '@/lib/budget';
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_CLS, type ProjectStatus } from '@/lib/projects';
import PeriodPicker from '@/components/PeriodPicker';
import { BudgetToolbar, UnitDetailButton, type UnitProject } from '@/components/BudgetTools';
import { fmtVnd, progressColor } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Quản trị ngân sách · BTMH OKR' };

const pct = (a: number, p: number) => (p > 0 ? Math.round((a / p) * 100) : 0);
// Bộ lọc trạng thái dự án (mặc định "Đang chạy" cho gọn).
const STATUS_FILTERS: { key: ProjectStatus | 'all'; label: string }[] = [
  { key: 'active', label: 'Đang chạy' },
  { key: 'paused', label: 'Tạm dừng' },
  { key: 'done', label: 'Hoàn thành' },
  { key: 'archived', label: 'Lưu trữ' },
  { key: 'all', label: 'Tất cả' },
];

export default async function BudgetPage({ searchParams }: { searchParams: { period?: string; status?: string } }) {
  const user = await requireUser();
  if (!isExec(user.role)) redirect('/'); // ngân sách: CEO/CFO xem toàn cảnh

  const periods = await listPeriods();
  const period = searchParams.period ? await getPeriod(searchParams.period) : (await getCurrentPeriod()) ?? periods[0] ?? null;
  const statusF = (STATUS_FILTERS.some((s) => s.key === searchParams.status) ? searchParams.status : 'active') as ProjectStatus | 'all';
  const d = period ? await budgetOverview(period.id, statusF) : null;
  const qs = (o: Record<string, string>) => {
    const p = new URLSearchParams();
    if (period) p.set('period', period.id);
    if (statusF) p.set('status', statusF);
    for (const [k, v] of Object.entries(o)) p.set(k, v);
    return `/budget?${p.toString()}`;
  };

  const usedPct = d ? pct(d.totalActual, d.totalPlanned) : 0;
  const remaining = d ? d.totalPlanned - d.totalActual : 0;

  // Gom danh sách dự án theo đơn vị (cho popup "Chi tiết" theo khối).
  const projByUnit = new Map<string, UnitProject[]>();
  if (d) {
    for (const p of d.projects) {
      const key = p.unit_name ?? '— Chưa gắn đơn vị —';
      const arr = projByUnit.get(key) ?? [];
      arr.push({
        id: p.id, code: p.code, name: p.name, status: p.status,
        statusLabel: PROJECT_STATUS_LABEL[p.status], statusCls: PROJECT_STATUS_CLS[p.status],
        planned: p.planned, actual: p.actual, lines: p.lines,
      });
      projByUnit.set(key, arr);
    }
  }

  return (
    <>
      <SiteHeader active="budget" />
      <div className="wrap">
        <div className="flexbtw flexbtw-top">
          <div>
            <div className="pagetitle">Quản trị ngân sách<HelpTip k="budget" /></div>
            <p className="subtitle">
              Ngân sách kế hoạch vs thực chi theo dự án và khối. "Đã chi" gom từ ngân sách thực chi của công việc trong mỗi dự án.
            </p>
          </div>
          <PeriodPicker
            periods={orderPeriodsHierarchically(periods).map(({ period: p, depth }) => ({
              id: p.id, label: `${PERIOD_KIND_LABEL[p.kind]}: ${p.name}`, depth, isCurrent: p.is_current,
            }))}
            currentId={period?.id ?? null}
            basePath="/budget"
          />
        </div>
        <div className="bud-filterbar">
          <div className="cal-legend" style={{ margin: 0 }}>
            <span className="muted" style={{ fontSize: 12.5 }}>Lọc dự án:</span>
            {STATUS_FILTERS.map((s) => (
              <a key={s.key} href={qs({ status: s.key })} className={`chip${statusF === s.key ? ' chip-on' : ''}`}>{s.label}</a>
            ))}
          </div>
          {period && <BudgetToolbar periodId={period.id} status={statusF} />}
        </div>

        {!d || d.projects.length === 0 ? (
          <div className="card"><p className="muted" style={{ margin: 0 }}>Chưa có dự án/ngân sách trong kỳ. Khai báo ngân sách khi tạo/sửa dự án hoặc công việc.</p></div>
        ) : (
          <>
            {/* KPIs */}
            <div className="card">
              <div className="stat">
                <div><div className="n" style={{ color: 'var(--primary)' }}>{fmtVnd(d.totalPlanned)}</div><div className="l">Ngân sách kế hoạch</div></div>
                <div><div className="n">{fmtVnd(d.totalActual)}</div><div className="l">Đã chi (gom việc)</div></div>
                <div><div className="n" style={{ color: remaining < 0 ? '#dc2626' : '#16a34a' }}>{fmtVnd(remaining)}</div><div className="l">Còn lại</div></div>
                <div><div className="n" style={{ color: progressColor(100 - usedPct) }}>{usedPct}%</div><div className="l">Đã dùng</div></div>
              </div>
            </div>

            {/* Theo dự án */}
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Theo dự án</h3>
              <div className="table-scroll">
                <table className="t">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Dự án</th><th style={{ textAlign: 'left' }}>Khối</th>
                      <th className="right">Kế hoạch</th><th className="right">Đã chi</th>
                      <th>Đã dùng</th><th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.projects.map((p) => {
                      const up = pct(p.actual, p.planned);
                      return (
                        <tr key={p.id}>
                          <td>
                            <Link href={`/projects/${p.id}`} className="tbl-link">
                              {p.code && <span className="okr-code" style={{ marginRight: 6 }}>{p.code}</span>}{p.name}
                            </Link>
                            <div className="muted" style={{ fontSize: 11 }}>{p.taskCount} việc</div>
                          </td>
                          <td style={{ fontSize: 12.5 }}>{p.unit_name ?? <span className="muted">—</span>}</td>
                          <td className="right mono">{fmtVnd(p.planned)}</td>
                          <td className="right mono">{fmtVnd(p.actual)}</td>
                          <td style={{ minWidth: 120 }}>
                            <span className="map-mini"><i style={{ width: `${Math.min(up, 100)}%`, background: up > 100 ? '#dc2626' : 'var(--primary)' }} /></span>
                            <span className="muted mono" style={{ fontSize: 11 }}>{up}%</span>
                          </td>
                          <td><span className={`badge ${PROJECT_STATUS_CLS[p.status]}`}>{PROJECT_STATUS_LABEL[p.status]}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Theo khối */}
            {d.units.length > 0 && (
              <div className="card">
                <h3 style={{ marginTop: 0 }}>Theo khối / đơn vị</h3>
                <p className="muted" style={{ margin: '0 0 8px', fontSize: 12.5 }}>Bấm vào tên đơn vị để mở chi tiết các dự án &amp; hạng mục ngân sách của đơn vị đó.</p>
                <div className="table-scroll">
                  <table className="t">
                    <thead><tr><th style={{ textAlign: 'left' }}>Đơn vị</th><th className="right">Số dự án</th><th className="right">Kế hoạch</th><th className="right">Đã chi</th><th>Đã dùng</th></tr></thead>
                    <tbody>
                      {d.units.map((u) => {
                        const up = pct(u.actual, u.planned);
                        return (
                          <tr key={u.unit}>
                            <td><UnitDetailButton unit={u.unit} projects={projByUnit.get(u.unit) ?? []} triggerLabel={u.unit} /></td>
                            <td className="right mono">{u.nProjects}</td>
                            <td className="right mono">{fmtVnd(u.planned)}</td>
                            <td className="right mono">{fmtVnd(u.actual)}</td>
                            <td style={{ minWidth: 120 }}>
                              <span className="map-mini"><i style={{ width: `${Math.min(up, 100)}%`, background: up > 100 ? '#dc2626' : 'var(--primary)' }} /></span>
                              <span className="muted mono" style={{ fontSize: 11 }}>{up}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
