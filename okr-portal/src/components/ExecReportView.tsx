'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import UserLink from '@/components/UserLink';
import { Donut, Legend, BarList } from '@/components/charts';
import TaskDetailModal from '@/components/TaskDetailModal';
import type { ExecReport, Counts, ReportNode, PersonRow, TaskDetail } from '@/lib/exec-report';

type Status = 'todo' | 'in_progress' | 'blocked' | 'done' | 'canceled';
type Metric = 'total' | 'done' | 'ontime' | 'late' | 'overdue' | 'ontrack' | 'slow';
const METRIC_BUCKETS: Record<Metric, TaskDetail['bucket'][]> = {
  total: ['done_ontime', 'done_late', 'overdue', 'ontrack'],
  done: ['done_ontime', 'done_late'],
  ontime: ['done_ontime'], late: ['done_late'], overdue: ['overdue'], ontrack: ['ontrack'],
  slow: ['done_late', 'overdue'],
};
const METRIC_LABEL: Record<Metric, string> = {
  total: 'Tất cả', done: 'Hoàn thành', ontime: 'Đúng hạn', late: 'Trễ hạn', overdue: 'Quá hạn', ontrack: 'Đang làm', slow: 'Chậm deadline',
};

const pct = (a: number, b: number): string => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—');
const rateColor = (a: number, b: number): string => {
  if (b === 0) return 'var(--muted)';
  const r = a / b; return r >= 0.8 ? '#15803d' : r >= 0.5 ? '#B45309' : '#B42318';
};
const slow = (c: Counts) => c.doneLate + c.overdue;

const C_DONE = '#15803d', C_LATE = '#B42318', C_OVER = '#d97706', C_TRACK = '#94a3b8';

export default function ExecReportView({
  report, navBase, isSuper, moveAction,
}: {
  report: ExecReport; navBase: string; isSuper: boolean;
  moveAction: (id: string, status: Status) => Promise<void>;
}) {
  const t = report.totals;
  const [view, setView] = useState<'tree' | 'list'>('tree');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(report.tree.map((n) => n.unitId ?? '__none')));
  const [q, setQ] = useState('');
  const [onlySlow, setOnlySlow] = useState(false);
  const [sortKey, setSortKey] = useState<Metric | 'name' | 'rateHT' | 'rateOT'>('total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [modal, setModal] = useState<{ title: string; tasks: TaskDetail[] } | null>(null);

  const link = (params: Record<string, string>) => {
    const sp = new URLSearchParams({ period: report.period, d: report.anchor, ...params });
    return `${navBase}?${sp.toString()}`;
  };

  const openCell = (scope: { kind: 'unit'; unitIds: string[]; name: string } | { kind: 'person'; email: string; name: string }, metric: Metric) => {
    const buckets = new Set(METRIC_BUCKETS[metric]);
    const uidSet = scope.kind === 'unit' ? new Set(scope.unitIds) : null;
    const tasks = report.tasks.filter((tk) => {
      if (!buckets.has(tk.bucket)) return false;
      if (scope.kind === 'unit') return uidSet!.has(tk.unit_id ?? '__none');
      return tk.owner_email === scope.email;
    });
    setModal({ title: `${scope.name} · ${METRIC_LABEL[metric]}`, tasks });
  };

  // Flatten cây → danh sách người (cho view Danh sách + ranking) + danh sách đơn vị (ranking đội).
  const flatUnits = useMemo(() => {
    const out: ReportNode[] = [];
    const walk = (ns: ReportNode[]) => ns.forEach((n) => { out.push(n); walk(n.children); });
    walk(report.tree);
    return out;
  }, [report.tree]);

  const nm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const listPeople = useMemo(() => {
    let ps = report.people.slice();
    if (q.trim()) { const ql = nm(q.trim()); ps = ps.filter((p) => nm(p.name).includes(ql)); }
    if (onlySlow) ps = ps.filter((p) => slow(p.counts) > 0);
    const val = (p: PersonRow): number | string => {
      if (sortKey === 'name') return nm(p.name);
      if (sortKey === 'rateHT') return p.counts.total ? p.counts.done / p.counts.total : -1;
      if (sortKey === 'rateOT') return p.counts.done ? p.counts.doneOntime / p.counts.done : -1;
      if (sortKey === 'slow') return slow(p.counts);
      const c = p.counts; return sortKey === 'total' ? c.total : sortKey === 'done' ? c.done : sortKey === 'ontime' ? c.doneOntime : sortKey === 'late' ? c.doneLate : sortKey === 'overdue' ? c.overdue : c.ontrack;
    };
    ps.sort((a, b) => { const va = val(a), vb = val(b); const r = va < vb ? -1 : va > vb ? 1 : 0; return sortDir === 'asc' ? r : -r; });
    return ps;
  }, [report.people, q, onlySlow, sortKey, sortDir]);

  const unitNameOf = useMemo(() => new Map(flatUnits.map((u) => [u.unitId ?? '__none', u.unitName])), [flatUnits]);

  // Ranking vinh danh.
  const topPeople = useMemo(() =>
    report.people.filter((p) => p.counts.done > 0)
      .sort((a, b) => b.counts.doneOntime - a.counts.doneOntime || (b.counts.done ? b.counts.doneOntime / b.counts.done : 0) - (a.counts.done ? a.counts.doneOntime / a.counts.done : 0))
      .slice(0, 5), [report.people]);
  const topUnits = useMemo(() =>
    flatUnits.filter((u) => u.roll.done >= 2)
      .sort((a, b) => (b.roll.doneOntime / b.roll.done) - (a.roll.doneOntime / a.roll.done) || b.roll.doneOntime - a.roll.doneOntime)
      .slice(0, 5), [flatUnits]);

  const toggle = (id: string) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const expandAll = () => setExpanded(new Set(flatUnits.map((u) => u.unitId ?? '__none')));
  const collapseAll = () => setExpanded(new Set());
  const setSort = (k: typeof sortKey) => { if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); else { setSortKey(k); setSortDir(k === 'name' ? 'asc' : 'desc'); } };

  return (
    <div>
      {/* Bộ chọn kỳ + điều hướng */}
      <div className="er-bar" data-tour="er-period">
        <div className="er-seg">
          <Link href={link({ period: 'week', d: report.anchor })} className={`er-seg-btn${report.period === 'week' ? ' on' : ''}`}>Tuần</Link>
          <Link href={link({ period: 'month', d: report.anchor })} className={`er-seg-btn${report.period === 'month' ? ' on' : ''}`}>Tháng</Link>
        </div>
        <div className="er-nav">
          <Link href={link({ d: report.prevAnchor })} className="btn ghost sm" aria-label="Kỳ trước">‹</Link>
          <span className="er-period-label">{report.label}</span>
          <Link href={link({ d: report.nextAnchor })} className="btn ghost sm" aria-label="Kỳ sau">›</Link>
        </div>
        <span className="muted" style={{ fontSize: 12.5 }}>Phạm vi: <b>{report.scopeLabel}</b></span>
      </div>

      {/* Tiles tổng (bấm để xem chi tiết) */}
      <div className="er-tiles" data-tour="er-tiles">
        <TileBtn n={t.total} label="Tổng việc" onClick={() => openCell({ kind: 'unit', unitIds: allUnitIds(report.tree), name: 'Toàn bộ' }, 'total')} />
        <TileBtn n={t.done} label="Hoàn thành" color={C_DONE} onClick={() => openCell({ kind: 'unit', unitIds: allUnitIds(report.tree), name: 'Toàn bộ' }, 'done')} />
        <TileBtn n={t.doneOntime} label="Đúng hạn" color={C_DONE} onClick={() => openCell({ kind: 'unit', unitIds: allUnitIds(report.tree), name: 'Toàn bộ' }, 'ontime')} />
        <TileBtn n={t.doneLate} label="Trễ hạn" color={t.doneLate ? C_LATE : undefined} onClick={() => openCell({ kind: 'unit', unitIds: allUnitIds(report.tree), name: 'Toàn bộ' }, 'late')} />
        <TileBtn n={t.overdue} label="Quá hạn" color={t.overdue ? C_LATE : undefined} onClick={() => openCell({ kind: 'unit', unitIds: allUnitIds(report.tree), name: 'Toàn bộ' }, 'overdue')} />
        <TileBtn n={t.ontrack} label="Đang làm" onClick={() => openCell({ kind: 'unit', unitIds: allUnitIds(report.tree), name: 'Toàn bộ' }, 'ontrack')} />
        <TileBtn n={pct(t.done, t.total)} label="% Hoàn thành" color={rateColor(t.done, t.total)} />
        <TileBtn n={slow(t)} label="⚠ Chậm deadline" color={slow(t) ? C_LATE : C_DONE} onClick={() => openCell({ kind: 'unit', unitIds: allUnitIds(report.tree), name: 'Toàn bộ' }, 'slow')} />
      </div>

      {/* Biểu đồ */}
      {t.total > 0 && (
        <div className="er-charts" data-tour="er-charts">
          <div className="card er-chart">
            <div className="er-chart-h">Cơ cấu thực hiện</div>
            <div className="er-donut">
              <Donut size={140} thickness={18} centerTop={pct(t.done, t.total)} centerSub="hoàn thành"
                segments={[{ value: t.doneOntime, color: C_DONE }, { value: t.doneLate, color: C_LATE }, { value: t.overdue, color: C_OVER }, { value: t.ontrack, color: C_TRACK }]} />
              <Legend items={[
                { color: C_DONE, label: 'Đúng hạn', value: t.doneOntime },
                { color: C_LATE, label: 'Trễ hạn', value: t.doneLate },
                { color: C_OVER, label: 'Quá hạn', value: t.overdue },
                { color: C_TRACK, label: 'Đang làm', value: t.ontrack },
              ]} />
            </div>
          </div>
          <div className="card er-chart">
            <div className="er-chart-h">% Hoàn thành theo đơn vị (cấp cao nhất)</div>
            <BarList suffix="%" items={report.tree.map((n) => ({
              label: n.unitName, value: n.roll.total ? Math.round((n.roll.done / n.roll.total) * 100) : 0,
              color: n.roll.total && n.roll.done / n.roll.total >= 0.8 ? C_DONE : n.roll.total && n.roll.done / n.roll.total >= 0.5 ? C_OVER : C_LATE,
              sub: `${n.roll.done}/${n.roll.total}`,
            }))} />
          </div>
        </div>
      )}

      {/* Ranking vinh danh */}
      {(topPeople.length > 0 || topUnits.length > 0) && (
        <div className="er-rank" data-tour="er-rank">
          <div className="card er-rank-card">
            <div className="er-chart-h">🏆 Cá nhân xuất sắc (hoàn thành đúng hạn)</div>
            {topPeople.length === 0 ? <p className="muted" style={{ margin: 0, fontSize: 13 }}>Chưa có dữ liệu.</p> : topPeople.map((p, i) => (
              <div className="er-rank-row" key={p.email}>
                <span className={`er-medal m${i}`}>{['🥇', '🥈', '🥉', '4', '5'][i]}</span>
                <UserLink email={p.email} name={p.name} className="er-rank-name" />
                <span className="er-rank-sub muted">{unitNameOf.get(p.unitId ?? '__none') ?? ''}</span>
                <span className="er-rank-val"><b style={{ color: C_DONE }}>{p.counts.doneOntime}</b> đúng hạn · {pct(p.counts.doneOntime, p.counts.done)} </span>
              </div>
            ))}
          </div>
          <div className="card er-rank-card">
            <div className="er-chart-h">🏅 Đội nhóm xuất sắc (% đúng hạn, ≥2 việc xong)</div>
            {topUnits.length === 0 ? <p className="muted" style={{ margin: 0, fontSize: 13 }}>Chưa đủ dữ liệu.</p> : topUnits.map((u, i) => (
              <div className="er-rank-row" key={u.unitId ?? i}>
                <span className={`er-medal m${i}`}>{['🥇', '🥈', '🥉', '4', '5'][i]}</span>
                <span className="er-rank-name">{u.unitName}</span>
                <span className="er-rank-val"><b style={{ color: C_DONE }}>{pct(u.roll.doneOntime, u.roll.done)}</b> đúng hạn · {u.roll.done} xong</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thanh công cụ bảng */}
      <div className="er-toolbar" data-tour="er-toolbar">
        <div className="er-seg">
          <button type="button" className={`er-seg-btn${view === 'tree' ? ' on' : ''}`} onClick={() => setView('tree')}>Cây tổ chức</button>
          <button type="button" className={`er-seg-btn${view === 'list' ? ' on' : ''}`} onClick={() => setView('list')}>Danh sách</button>
        </div>
        {view === 'tree' ? (
          <div className="er-nav">
            <button type="button" className="btn ghost sm" onClick={expandAll}>Mở tất cả</button>
            <button type="button" className="btn ghost sm" onClick={collapseAll}>Thu gọn</button>
          </div>
        ) : (
          <input className="i" placeholder="Tìm theo tên người…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 240 }} />
        )}
        <label className="er-check"><input type="checkbox" checked={onlySlow} onChange={(e) => setOnlySlow(e.target.checked)} /> Chỉ hiện có chậm deadline</label>
      </div>

      {report.tree.length === 0 ? (
        <div className="card"><p className="muted" style={{ margin: 0 }}>Không có công việc nào trong kỳ này (theo phạm vi của bạn).</p></div>
      ) : (
        <div className="card" style={{ padding: 0 }} data-tour="er-table">
          <div className="er-scroll">
            <table className="t er-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', minWidth: 240 }} className={view === 'list' ? 'sortable' : undefined} onClick={view === 'list' ? () => setSort('name') : undefined}>
                    {view === 'tree' ? 'Đơn vị / Cá nhân' : 'Cá nhân'}
                  </th>
                  <ColHead label="Tổng" k="total" {...{ view, sortKey, sortDir, setSort }} />
                  <ColHead label="Hoàn thành" k="done" {...{ view, sortKey, sortDir, setSort }} />
                  <ColHead label="Đúng hạn" k="ontime" {...{ view, sortKey, sortDir, setSort }} />
                  <ColHead label="Trễ hạn" k="late" {...{ view, sortKey, sortDir, setSort }} />
                  <ColHead label="Quá hạn" k="overdue" {...{ view, sortKey, sortDir, setSort }} />
                  <ColHead label="Đang làm" k="ontrack" {...{ view, sortKey, sortDir, setSort }} />
                  <ColHead label="% HT" k="rateHT" {...{ view, sortKey, sortDir, setSort }} />
                  <ColHead label="% Đúng hạn" k="rateOT" {...{ view, sortKey, sortDir, setSort }} />
                  <ColHead label="⚠ Chậm" k="slow" {...{ view, sortKey, sortDir, setSort }} />
                </tr>
              </thead>
              <tbody>
                {view === 'tree'
                  ? report.tree.map((n) => <TreeRows key={n.unitId ?? '__none'} node={n} expanded={expanded} toggle={toggle} openCell={openCell} onlySlow={onlySlow} />)
                  : listPeople.map((p) => (
                    <tr key={p.email} className="er-person">
                      <td><UserLink email={p.email} name={p.name} /><span className="muted" style={{ fontSize: 11.5, marginLeft: 6 }}>{unitNameOf.get(p.unitId ?? '__none') ?? ''}</span></td>
                      <PersonCells p={p} openCell={openCell} />
                    </tr>
                  ))}
                <tr className="er-total">
                  <td><b>TỔNG CỘNG</b></td>
                  <NumCells c={t} onCell={(m) => openCell({ kind: 'unit', unitIds: allUnitIds(report.tree), name: 'Toàn bộ' }, m)} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
        Bấm vào <b>bất kỳ con số</b> để xem chi tiết danh sách việc + <b>nhật ký thay đổi</b> (evidence). “Chậm deadline” =
        hoàn thành trễ (sau hạn + {report.graceDays} ngày ân hạn) + quá hạn chưa xong; deadline rơi <b>Chủ nhật</b> tự +1 ngày.
      </p>

      {modal && <TaskDetailModal title={modal.title} tasks={modal.tasks} isSuper={isSuper} moveAction={moveAction} onClose={() => setModal(null)} />}
    </div>
  );
}

function allUnitIds(tree: ReportNode[]): string[] {
  const out: string[] = [];
  const walk = (ns: ReportNode[]) => ns.forEach((n) => { out.push(...n.unitIds); walk(n.children); });
  walk(tree);
  return out;
}

function TileBtn({ n, label, color, onClick }: { n: number | string; label: string; color?: string; onClick?: () => void }) {
  return (
    <button type="button" className={`er-tile${onClick ? ' er-tile-btn' : ''}`} onClick={onClick} disabled={!onClick}>
      <div className="er-tile-n" style={color ? { color } : undefined}>{n}</div>
      <div className="er-tile-l">{label}</div>
    </button>
  );
}

function ColHead({ label, k, view, sortKey, sortDir, setSort }: {
  label: string; k: 'total' | 'done' | 'ontime' | 'late' | 'overdue' | 'ontrack' | 'rateHT' | 'rateOT' | 'slow';
  view: 'tree' | 'list'; sortKey: string; sortDir: 'asc' | 'desc'; setSort: (k: never) => void;
}) {
  const sortable = view === 'list';
  return (
    <th className={`right${sortable ? ' sortable' : ''}${sortKey === k ? ' active' : ''}`} onClick={sortable ? () => setSort(k as never) : undefined}>
      {label}{sortable && sortKey === k ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  );
}

// Ô số của 1 hàng — bấm mở popup theo metric. onCell(metric) do hàng cha cung cấp (unit branch / person).
function NumCells({ c, onCell }: { c: Counts; onCell: (m: Metric) => void }) {
  const cell = (v: number, m: Metric, color?: string) => (
    <td className="right mono">
      {v > 0 ? <button type="button" className="er-num" style={color ? { color } : undefined} onClick={() => onCell(m)}>{v}</button> : <span className="muted">0</span>}
    </td>
  );
  const s = slow(c);
  return (
    <>
      {cell(c.total, 'total')}
      {cell(c.done, 'done', C_DONE)}
      {cell(c.doneOntime, 'ontime', C_DONE)}
      {cell(c.doneLate, 'late', C_LATE)}
      {cell(c.overdue, 'overdue', C_LATE)}
      {cell(c.ontrack, 'ontrack')}
      <td className="right"><b style={{ color: rateColor(c.done, c.total) }}>{pct(c.done, c.total)}</b></td>
      <td className="right"><b style={{ color: rateColor(c.doneOntime, c.done) }}>{pct(c.doneOntime, c.done)}</b></td>
      <td className="right">{s > 0 ? <button type="button" className="er-num" style={{ color: C_LATE }} onClick={() => onCell('slow')}><b>{s}</b></button> : <span style={{ color: C_DONE }}><b>0</b></span>}</td>
    </>
  );
}

function PersonCells({ p, openCell }: { p: PersonRow; openCell: (scope: { kind: 'person'; email: string; name: string }, m: Metric) => void }) {
  return <NumCells c={p.counts} onCell={(m) => openCell({ kind: 'person', email: p.email, name: p.name }, m)} />;
}

function TreeRows({ node, expanded, toggle, openCell, onlySlow }: {
  node: ReportNode; expanded: Set<string>; toggle: (id: string) => void; onlySlow: boolean;
  openCell: (scope: { kind: 'unit'; unitIds: string[]; name: string } | { kind: 'person'; email: string; name: string }, m: Metric) => void;
}) {
  if (onlySlow && slow(node.roll) === 0) return null;
  const id = node.unitId ?? '__none';
  const isOpen = expanded.has(id);
  const hasKids = node.children.length > 0 || node.people.length > 0;
  return (
    <>
      <tr className="er-unit" style={{ ['--d' as string]: node.depth }}>
        <td>
          <button type="button" className="er-unit-toggle" onClick={() => toggle(id)}>
            <span className={`er-caret${isOpen ? ' open' : ''}`}>{hasKids ? '▸' : '·'}</span>
            <b>{node.unitName}</b>
          </button>
          <span className="muted" style={{ fontSize: 11.5, marginLeft: 6 }}>{node.roll.total} việc</span>
        </td>
        <NumCells c={node.roll} onCell={(m) => openCell({ kind: 'unit', unitIds: node.unitIds, name: node.unitName }, m)} />
      </tr>
      {isOpen && node.children.map((c) => <TreeRows key={c.unitId ?? '__none'} node={c} expanded={expanded} toggle={toggle} openCell={openCell} onlySlow={onlySlow} />)}
      {isOpen && node.people.filter((p) => !onlySlow || slow(p.counts) > 0).map((p) => (
        <tr key={p.email} className="er-person" style={{ ['--d' as string]: node.depth + 1 }}>
          <td className="er-person-cell"><UserLink email={p.email} name={p.name} /></td>
          <NumCells c={p.counts} onCell={(m) => openCell({ kind: 'person', email: p.email, name: p.name }, m)} />
        </tr>
      ))}
    </>
  );
}
