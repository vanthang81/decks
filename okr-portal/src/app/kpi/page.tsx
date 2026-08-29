import SiteHeader from '@/components/SiteHeader';
import HelpTip from '@/components/HelpTip';
import SearchSelect from '@/components/SearchSelect';
import { ProgressBar } from '@/components/ui';
import { requireUser } from '@/lib/current-user';
import { listUnits, manageScope, buildTree, subtreeIds, type UnitNode } from '@/lib/org';
import { getCurrentPeriod, listPeriods, getPeriod, orderPeriodsHierarchically, PERIOD_KIND_LABEL } from '@/lib/periods';
import { loadAccess, canInputKpi, canManageKpi, hasCap } from '@/lib/access';
import { BSC_PERSPECTIVES, BSC_PERSPECTIVE_LABEL, BSC_PERSPECTIVE_ICON } from '@/lib/okr';
import { TIER_LABEL } from '@/lib/kpis';
import NewKpiModal from '@/components/NewKpiModal';
import {
  listScorecard,
  scorecardScore,
  kpiStatus,
  attainment,
  STATUS_LABEL,
  STATUS_CLS,
  type ScorecardRow,
} from '@/lib/kpi-values';
import { upsertKpiValueAction, createKpiAction } from './actions';

export const dynamic = 'force-dynamic';

const TIER_CLS: Record<string, string> = { result: 'blue', driver: 'amber', enabler: 'gray' };
const fmtN = (n: number | null) =>
  n == null ? '' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(n);

export default async function KpiScorecardPage({
  searchParams,
}: {
  searchParams: { period?: string; unit?: string; bsc?: string };
}) {
  const user = await requireUser();
  const access = await loadAccess();
  const units = await listUnits();
  const periods = await listPeriods();
  const period = searchParams.period ? await getPeriod(searchParams.period) : (await getCurrentPeriod()) ?? periods[0] ?? null;

  const company = units.find((u) => u.type === 'company') ?? null;
  const unitId = searchParams.unit || company?.id || units[0]?.id || '';
  const unit = units.find((u) => u.id === unitId) ?? null;

  const scope = manageScope(user, units);
  const canInput = !!unit && canInputKpi(user, access) && (hasCap(user, 'scope.all', access) || scope === null || scope.has(unitId));
  const canMakeKpi = canManageKpi(user, access);

  // Lọc KPI theo ĐƠN VỊ: hiện KPI có đơn vị chủ ∈ subtree(đơn vị đang chọn) + KPI dùng chung.
  // Chọn Công ty (gốc) → subtree = toàn bộ đơn vị → hiện MỌI KPI (không đổi mặc định cũ);
  // chọn Khối/Phòng → chỉ KPI của khối/phòng đó (và cấp dưới) + KPI dùng chung.
  const scopeIds = unit ? Array.from(subtreeIds(units, unit.id)) : null;
  let rows: ScorecardRow[] = period && unit ? await listScorecard(period.id, unit.id, scopeIds) : [];
  const fbsc = searchParams.bsc || '';
  if (fbsc) rows = rows.filter((r) => r.bsc_perspective === fbsc);

  const { score, weighted, scored } = scorecardScore(rows);
  const scorePct = weighted ? (score / weighted) * 100 : 0;

  // Đơn vị cho dropdown: đi theo CÂY tổ chức — Công ty → mỗi Khối → các Phòng THUỘC khối đó
  // (thụt cấp), thay vì gom phẳng tất cả Phòng xuống cuối. Kèm ô tìm kiếm (SearchSelect).
  const TYPE_LABEL: Record<string, string> = { company: 'Công ty', division: 'Khối', department: 'Phòng' };
  const unitOptions: { value: string; label: string }[] = [];
  const walkUnits = (nodes: UnitNode[], depth: number) => {
    for (const n of nodes) {
      const indent = '  '.repeat(depth) + (depth > 0 ? '↳ ' : '');
      unitOptions.push({ value: n.id, label: `${indent}${n.name} (${TYPE_LABEL[n.type] ?? n.type})` });
      if (n.children.length) walkUnits(n.children, depth + 1);
    }
  };
  walkUnits(buildTree(units), 0);

  return (
    <>
      <SiteHeader active="kpi" />
      <div className="wrap">
        <div className="flexbtw">
          <div className="pagetitle">Scorecard KPI<HelpTip k="kpi-scorecard" /></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <a
              className="btn ghost"
              href={`/api/scorecard/export?period=${period?.id ?? ''}&unit=${unitId}${fbsc ? `&bsc=${fbsc}` : ''}`}
            >
              ⬇ Xuất Excel
            </a>
            {canMakeKpi && (
              <NewKpiModal
                action={createKpiAction}
                defaultBsc={fbsc}
                bscOptions={BSC_PERSPECTIVES.map((b) => ({ value: b, label: `${BSC_PERSPECTIVE_ICON[b]} ${BSC_PERSPECTIVE_LABEL[b]}` }))}
              />
            )}
          </div>
        </div>
        <p className="subtitle">
          Đo chỉ số theo <b>{unit?.name ?? '—'}</b> · kỳ <b>{period?.name ?? '—'}</b>. Mục tiêu &amp; thực hiện,
          ngưỡng Watch/Alert/Escalate, chấm điểm theo trọng số 3 tầng.
        </p>

        {/* Bộ lọc kỳ · đơn vị · viễn cảnh */}
        <form method="get" className="filterbar" style={{ marginBottom: 14 }}>
          <select className="i fb-sel" name="period" defaultValue={period?.id ?? ''}>
            {orderPeriodsHierarchically(periods).map(({ period: p, depth }) => (
              <option key={p.id} value={p.id}>{'· '.repeat(depth)}{PERIOD_KIND_LABEL[p.kind]}: {p.name}</option>
            ))}
          </select>
          <div className="fb-sel fb-ss">
            <SearchSelect name="unit" defaultValue={unitId} options={unitOptions} placeholder="Chọn đơn vị…" />
          </div>
          <select className="i fb-sel" name="bsc" defaultValue={fbsc}>
            <option value="">Viễn cảnh: tất cả</option>
            {BSC_PERSPECTIVES.map((b) => (
              <option key={b} value={b}>{BSC_PERSPECTIVE_ICON[b]} {BSC_PERSPECTIVE_LABEL[b]}</option>
            ))}
          </select>
          <button className="btn sm" type="submit">Áp dụng</button>
        </form>

        {/* Điểm scorecard */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="flexbtw" style={{ gap: 14, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <h3 style={{ margin: 0 }}>
              Điểm scorecard: <span style={{ color: 'var(--primary)' }}>{score}</span> / {weighted || 0}
            </h3>
            <span className="muted" style={{ fontSize: 12.5 }}>
              Chấm trên {scored}/{weighted || 0} trọng số đã đủ mục tiêu + thực hiện · {rows.length} KPI
            </span>
          </div>
          <div style={{ marginTop: 10 }}><ProgressBar value={scorePct} lg /></div>
        </div>

        {!canInput && (
          <p className="muted" style={{ fontSize: 12.5, marginTop: 0, marginBottom: 10 }}>
            Bạn đang xem (chỉ đọc). Cần năng lực “Nhập số KPI” trong phạm vi đơn vị này để nhập mục tiêu/thực hiện.
          </p>
        )}

        <div className="card">
          <div className="table-scroll wide-x">
            <table className="t task-table">
              <thead>
                <tr>
                  <th>Mã</th><th>KPI</th><th>Viễn cảnh</th><th>Tầng</th><th className="right">Trọng số</th>
                  <th>Đơn vị đo</th><th>Mục tiêu</th><th>Thực hiện</th><th className="right">% đạt</th><th>Trạng thái</th>
                  {canInput && <th></th>}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={canInput ? 11 : 10} className="muted">Chưa có KPI phù hợp. Khai báo ở Quản trị → Thư viện KPI.</td></tr>
                )}
                {rows.map((r) => {
                  const st = kpiStatus(r, r.actual, r.target);
                  const at = attainment(r.direction, r.target, r.actual);
                  return (
                    <tr key={r.id}>
                      <td>{r.code && <span className="okr-code">{r.code}</span>}</td>
                      <td>
                        <b>{r.name}</b>
                        {r.module && <div className="muted" style={{ fontSize: 11 }}>{r.module}</div>}
                      </td>
                      <td>{r.bsc_perspective ? <span className="badge bsc" style={{ fontSize: 10.5 }}>{BSC_PERSPECTIVE_ICON[r.bsc_perspective]} {BSC_PERSPECTIVE_LABEL[r.bsc_perspective]}</span> : <span className="muted">—</span>}</td>
                      <td>{r.tier ? <span className={`badge ${TIER_CLS[r.tier]}`} style={{ fontSize: 10.5 }}>{TIER_LABEL[r.tier]}</span> : <span className="muted">—</span>}</td>
                      <td className="right mono">{r.weight || 0}</td>
                      <td style={{ fontSize: 12.5 }}>{r.unit_label || <span className="muted">—</span>}</td>
                      {canInput ? (
                        <>
                          <td><input form={`kf-${r.id}`} className="i sc-in" name="target" defaultValue={r.target ?? ''} /></td>
                          <td><input form={`kf-${r.id}`} className="i sc-in" name="actual" defaultValue={r.actual ?? ''} /></td>
                        </>
                      ) : (
                        <>
                          <td className="mono">{fmtN(r.target) || <span className="muted">—</span>}</td>
                          <td className="mono">{fmtN(r.actual) || <span className="muted">—</span>}</td>
                        </>
                      )}
                      <td className="right mono">{at == null ? <span className="muted">—</span> : `${Math.round(at * 100)}%`}</td>
                      <td>{st ? <span className={`badge ${STATUS_CLS[st]}`}>{STATUS_LABEL[st]}</span> : <span className="muted">—</span>}</td>
                      {canInput && (
                        <td>
                          <form action={upsertKpiValueAction} id={`kf-${r.id}`}>
                            <input type="hidden" name="kpi_id" value={r.id} />
                            <input type="hidden" name="period_id" value={period?.id ?? ''} />
                            <input type="hidden" name="unit_id" value={unitId} />
                            <button className="btn ghost sm" type="submit">Lưu</button>
                          </form>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
