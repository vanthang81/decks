'use client';

import { useEffect, useMemo, useRef, useState, useTransition, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProgressBar } from '@/components/ui';
import { StackedBar, Donut } from '@/components/charts';
import TaskEditModal from '@/components/TaskEditModal';
import SearchSelect from '@/components/SearchSelect';
import UserLink from '@/components/UserLink';
import { unitTreeOptions } from '@/lib/unit-options';
import { fmtDate } from '@/lib/format';
import type { TaskRow } from '@/lib/initiatives';
import type { PersonOpt, UnitOpt, ProjectOpt } from '@/components/ExecutionTabs';

// Nhãn/màu khai lại tại chỗ (KHÔNG import runtime từ initiatives.ts → tránh kéo pg vào bundle).
type Status = 'todo' | 'in_progress' | 'blocked' | 'done' | 'canceled';
type Kind = 'project' | 'subproject' | 'action';
const STATUS_LABEL: Record<Status, string> = {
  todo: 'Chưa làm',
  in_progress: 'Đang làm',
  blocked: 'Vướng',
  done: 'Xong',
  canceled: 'Huỷ',
};
const STATUS_CLS: Record<Status, string> = {
  todo: 'gray',
  in_progress: 'blue',
  blocked: 'red',
  done: 'green',
  canceled: 'gray',
};
const STATUS_COLOR: Record<Status, string> = {
  todo: '#94a3b8',
  in_progress: '#2563eb',
  blocked: '#dc2626',
  done: '#16a34a',
  canceled: '#a8a29e',
};
const COLUMNS: Status[] = ['todo', 'in_progress', 'blocked', 'done', 'canceled'];
const KIND_LABEL: Record<Kind, string> = { project: 'Dự án', subproject: 'Tiểu dự án', action: 'Công việc' };
const KIND_CLS: Record<Kind, string> = { project: 'blue', subproject: 'amber', action: 'gray' };
const PRIO_LABEL: Record<string, string> = { high: 'Cao', medium: 'Trung bình', low: 'Thấp' };
const PRIO_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

// Sắp xếp theo cột (nulls luôn xuống cuối, không đổi theo chiều).
type SortKey = 'code' | 'title' | 'status' | 'priority' | 'progress' | 'owner' | 'unit' | 'objective' | 'project' | 'due' | 'created';
function sortVal(t: TaskRow, k: SortKey): string | number | null {
  switch (k) {
    case 'code': return t.code;
    case 'title': return t.title;
    case 'status': return COLUMNS.indexOf(t.status);
    case 'priority': return PRIO_RANK[t.priority] ?? 9;
    case 'progress': return t.progress;
    case 'owner': return t.owner_name || t.owner_email;
    case 'unit': return t.unit_name;
    case 'objective': return t.objective_code || t.objective_title;
    case 'project': return t.project_name;
    case 'due': return t.due_on;
    case 'created': return t.created_at;
  }
}
// dd/mm/yyyy gọn cho cột "Tạo lúc"
function fmtCreated(s: string | null): string {
  if (!s) return '';
  const d = s.slice(0, 10).split('-');
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : '';
}
const COLS: { key: SortKey; label: string; style?: CSSProperties; hint?: string }[] = [
  { key: 'code', label: 'Mã' },
  { key: 'title', label: 'Công việc' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'priority', label: 'Ưu tiên' },
  { key: 'progress', label: 'Tiến độ', style: { minWidth: 120 } },
  { key: 'owner', label: 'Phụ trách' },
  { key: 'unit', label: 'Đơn vị' },
  { key: 'objective', label: 'OKR' },
  { key: 'project', label: 'Thuộc dự án', hint: 'Dự án xuyên-OKR (mã PRJ) mà việc này được gom vào. Khác với nhãn "Loại: Dự án" (kiểu nút trong cây thực thi).' },
  { key: 'due', label: 'Hạn' },
  { key: 'created', label: 'Tạo lúc', hint: 'Ngày tạo việc — bấm để sắp xếp mới/cũ' },
];

// Cảnh báo hạn (đồng bộ ExecutionTabs): chỉ tính việc CÒN MỞ.
type DlState = 'overdue' | 'today' | 'soon' | 'none';
function deadlineInfo(t: TaskRow): { state: DlState; days: number } {
  if (!t.due_on || t.status === 'done' || t.status === 'canceled') return { state: 'none', days: 0 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = t.due_on.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { state: 'overdue', days };
  if (days === 0) return { state: 'today', days };
  if (days <= 3) return { state: 'soon', days };
  return { state: 'none', days };
}
function DeadlineBadge({ t }: { t: TaskRow }) {
  const { state, days } = deadlineInfo(t);
  if (state === 'overdue') return <span className="dl-badge dl-over">Quá hạn {Math.abs(days)}n</span>;
  if (state === 'today') return <span className="dl-badge dl-today">Hôm nay</span>;
  if (state === 'soon') return <span className="dl-badge dl-soon">Còn {days}n</span>;
  return null;
}

// Nhãn "đang chờ việc trước" (waterfall) — cảnh báo mềm, không khoá thao tác.
function WaitBadge({ titles }: { titles: string[] }) {
  if (titles.length === 0) return null;
  return <span className="dl-badge dl-wait" title={`Phải xong trước: ${titles.join(' · ')}`}>⏳ Chờ {titles.length} việc</span>;
}

export default function TaskExplorer({
  tasks,
  currentEmail,
  seeAll,
  totalAll,
  manageIds,
  users,
  units,
  projects,
  editAction,
  deleteAction,
  move,
  depsMap = {},
}: {
  tasks: TaskRow[];
  depsMap?: Record<string, string[]>;
  currentEmail: string;
  seeAll: boolean;
  totalAll: number;
  manageIds: string[];
  users: PersonOpt[];
  units: UnitOpt[];
  projects: ProjectOpt[];
  editAction: (fd: FormData) => Promise<void>;
  deleteAction: (fd: FormData) => Promise<void>;
  move: (id: string, status: Status) => Promise<void>;
}) {
  const manageSet = useMemo(() => new Set(manageIds), [manageIds]);
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  // Việc "đang chờ" = có việc-phải-xong-trước (predecessor) CHƯA Xong/Huỷ. Trả về tiêu đề các việc đó.
  const waitingTitles = (id: string): string[] => {
    const out: string[] = [];
    for (const p of depsMap[id] ?? []) {
      const pt = taskById.get(p);
      if (pt && pt.status !== 'done' && pt.status !== 'canceled') out.push(pt.code ? `${pt.code} · ${pt.title}` : pt.title);
    }
    return out;
  };
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [view, setView] = useState<'list' | 'kanban' | 'timeline'>('list');
  useEffect(() => {
    const v = typeof window !== 'undefined' ? localStorage.getItem('okrTasksView') : null;
    if (v === 'list' || v === 'kanban' || v === 'timeline') setView(v);
  }, []);
  const pickView = (v: 'list' | 'kanban' | 'timeline') => {
    setView(v);
    if (typeof window !== 'undefined') localStorage.setItem('okrTasksView', v);
  };
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir('asc');
    }
  };

  const [q, setQ] = useState('');
  const [fOwner, setFOwner] = useState('');
  const [fUnit, setFUnit] = useState('');
  const [fObj, setFObj] = useState('');
  const [fProject, setFProject] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fPrio, setFPrio] = useState('');
  const [fKind, setFKind] = useState('');
  const [fPeriod, setFPeriod] = useState('');
  const [fOverdue, setFOverdue] = useState(false);
  const [fMine, setFMine] = useState(false);
  const [hideDone, setHideDone] = useState(true); // mặc định ẩn việc đã xong cho gọn
  const [repOpen, setRepOpen] = useState(true); // hiện báo cáo tổng quan
  const [dim, setDim] = useState<'unit' | 'project' | 'owner' | 'prio'>('unit'); // chiều phân bổ (breakout)

  const emailLc = currentEmail.toLowerCase();

  const owners = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tasks) if (t.owner_email) m.set(t.owner_email, t.owner_name || t.owner_email);
    return [...m.entries()].map(([email, name]) => ({ email, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);
  // Lọc đơn vị theo CÂY tổ chức (thụt cấp) — chỉ hiện đơn vị có việc.
  const unitChoices = useMemo(() => {
    const present = new Set<string>();
    for (const t of tasks) if (t.unit_id) present.add(t.unit_id);
    return unitTreeOptions(units).filter((o) => present.has(o.value));
  }, [tasks, units]);
  const objectives = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tasks) if (t.objective_id && t.objective_title) m.set(t.objective_id, t.objective_title);
    return [...m.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);
  const projectChoices = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tasks) if (t.project_id && t.project_name) m.set(t.project_id, t.project_name);
    return [...m.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);
  const periods = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tasks) if (t.period_id && t.period_name) m.set(t.period_id, t.period_name);
    return [...m.entries()].map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const qlc = q.trim().toLowerCase();
  const fActive = !!(qlc || fOwner || fUnit || fObj || fProject || fStatus || fPrio || fKind || fPeriod || fOverdue || fMine);
  const filtered = useMemo(
    () =>
      tasks.filter((t) => {
        if (fMine && t.owner_email?.toLowerCase() !== emailLc) return false;
        if (fOwner && t.owner_email !== fOwner) return false;
        if (fUnit && t.unit_id !== fUnit) return false;
        if (fObj && t.objective_id !== fObj) return false;
        if (fProject && t.project_id !== fProject) return false;
        if (fStatus && t.status !== fStatus) return false;
        if (hideDone && fStatus !== 'done' && t.status === 'done') return false;
        if (fPrio && t.priority !== fPrio) return false;
        if (fKind && t.kind !== fKind) return false;
        if (fPeriod && t.period_id !== fPeriod) return false;
        if (fOverdue && deadlineInfo(t).state !== 'overdue') return false;
        if (qlc) {
          const hay = `${t.title} ${t.code ?? ''} ${t.owner_name ?? ''} ${t.objective_title ?? ''} ${t.objective_code ?? ''} ${t.project_name ?? ''} ${t.project_code ?? ''}`.toLowerCase();
          if (!hay.includes(qlc)) return false;
        }
        return true;
      }),
    [tasks, fMine, fOwner, fUnit, fObj, fProject, fStatus, fPrio, fKind, fPeriod, fOverdue, hideDone, qlc, emailLc],
  );
  const clearFilter = () => {
    setQ(''); setFOwner(''); setFUnit(''); setFObj(''); setFProject('');
    setFStatus(''); setFPrio(''); setFKind(''); setFPeriod(''); setFOverdue(false); setFMine(false);
  };

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = sortVal(a, sortKey);
      const vb = sortVal(b, sortKey);
      const an = va === null || va === undefined || va === '';
      const bn = vb === null || vb === undefined || vb === '';
      if (an && bn) return 0;
      if (an) return 1; // null luôn xuống cuối
      if (bn) return -1;
      const r = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'vi');
      return r * dir;
    });
  }, [filtered, sortKey, sortDir]);

  // Phân trang danh sách (50 việc/trang) — chỉ ở chế độ Danh sách; Kanban/Gantt vẫn hiện đủ.
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const curPage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(() => sorted.slice(curPage * PAGE_SIZE, curPage * PAGE_SIZE + PAGE_SIZE), [sorted, curPage]);
  // Lọc/sắp xếp đổi → về trang 1.
  useEffect(() => { setPage(0); }, [q, fOwner, fUnit, fObj, fProject, fStatus, fPrio, fKind, fPeriod, fOverdue, fMine, hideDone, sortKey, sortDir]);

  // Tổng quan trạng thái + quá hạn của tập đang lọc.
  const byStatus = useMemo(() => {
    const c: Record<Status, number> = { todo: 0, in_progress: 0, blocked: 0, done: 0, canceled: 0 };
    let overdue = 0;
    for (const t of filtered) {
      c[t.status]++;
      if (deadlineInfo(t).state === 'overdue') overdue++;
    }
    return { c, overdue };
  }, [filtered]);
  const segments = COLUMNS.filter((s) => byStatus.c[s] > 0).map((s) => ({
    value: byStatus.c[s],
    color: STATUS_COLOR[s],
    label: STATUS_LABEL[s],
  }));

  // ── Báo cáo tổng quan trên TOÀN BỘ việc (không phụ thuộc bộ lọc) — bấm để drill-down.
  type Grp = { key: string; label: string; total: number; done: number; openNo: number; overdue: number; canceled: number };
  const report = useMemo(() => {
    const st: Record<Status, number> = { todo: 0, in_progress: 0, blocked: 0, done: 0, canceled: 0 };
    let overdue = 0, done = 0, inProg = 0, open = 0;
    const mk = () => new Map<string, Grp>();
    const g = { unit: mk(), project: mk(), owner: mk(), prio: mk() };
    const bump = (m: Map<string, Grp>, key: string, label: string, t: TaskRow, od: boolean) => {
      let x = m.get(key);
      if (!x) { x = { key, label, total: 0, done: 0, openNo: 0, overdue: 0, canceled: 0 }; m.set(key, x); }
      x.total++;
      if (t.status === 'done') x.done++;
      else if (t.status === 'canceled') x.canceled++;
      else if (od) x.overdue++;
      else x.openNo++;
    };
    for (const t of tasks) {
      st[t.status]++;
      if (t.status === 'done') done++;
      else if (t.status === 'canceled') { /* loại khỏi mở */ }
      else { open++; if (t.status === 'in_progress') inProg++; }
      const od = deadlineInfo(t).state === 'overdue';
      if (od) overdue++;
      bump(g.unit, t.unit_id ?? '', t.unit_name ?? 'Chưa gán đơn vị', t, od);
      if (t.project_id) bump(g.project, t.project_id, `${t.project_code ? t.project_code + ' · ' : ''}${t.project_name ?? 'Dự án'}`, t, od);
      bump(g.owner, t.owner_email ?? '', t.owner_name || t.owner_email || 'Chưa giao', t, od);
      bump(g.prio, t.priority, PRIO_LABEL[t.priority] ?? t.priority, t, od);
    }
    const top = (m: Map<string, Grp>) => [...m.values()].sort((a, b) => b.total - a.total).slice(0, 8);
    return { st, overdue, done, inProg, open, total: tasks.length, unit: top(g.unit), project: top(g.project), owner: top(g.owner), prio: top(g.prio) };
  }, [tasks]);

  const scrollToList = () => {
    if (typeof document !== 'undefined') document.getElementById('task-list-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const pickDim = (key: string) => {
    if (!key) return; // nhóm rỗng (Chưa gán/Chưa giao) không lọc được
    clearFilter();
    if (dim === 'unit') setFUnit(key);
    else if (dim === 'project') setFProject(key);
    else if (dim === 'owner') setFOwner(key);
    else setFPrio(key);
    setHideDone(false);
    scrollToList();
  };
  const statusSegs = COLUMNS.filter((s) => report.st[s] > 0).map((s) => ({ value: report.st[s], color: STATUS_COLOR[s], label: STATUS_LABEL[s] }));
  const donePct = report.total ? Math.round((report.done / report.total) * 100) : 0;
  const dimRows = report[dim];
  const dimMax = Math.max(1, ...dimRows.map((r) => r.total));
  const DIMS: { k: typeof dim; label: string }[] = [
    { k: 'unit', label: 'Bộ phận' }, { k: 'project', label: 'Dự án' },
    { k: 'owner', label: 'Người phụ trách' }, { k: 'prio', label: 'Ưu tiên' },
  ];

  return (
    <div>
      {tasks.length > 0 && (
        <div className="card rep-card">
          <div className="flexbtw" style={{ alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Báo cáo tổng quan công việc</h3>
            <button type="button" className="btn ghost sm" onClick={() => setRepOpen((v) => !v)}>
              {repOpen ? 'Thu gọn ▲' : 'Mở rộng ▼'}
            </button>
          </div>

          {repOpen && (
            <>
              <div className="rep-tiles">
                <button type="button" className="rep-tile" onClick={() => { clearFilter(); scrollToList(); }}>
                  <span className="rep-tile-n">{report.total}</span><span className="rep-tile-l">Tổng công việc</span>
                </button>
                <button type="button" className="rep-tile" onClick={() => { clearFilter(); setFStatus('in_progress'); scrollToList(); }}>
                  <span className="rep-tile-n" style={{ color: '#2563eb' }}>{report.inProg}</span><span className="rep-tile-l">Đang làm</span>
                </button>
                <button type="button" className="rep-tile" onClick={() => { clearFilter(); setFOverdue(true); scrollToList(); }}>
                  <span className="rep-tile-n" style={{ color: '#dc2626' }}>{report.overdue}</span><span className="rep-tile-l">Quá hạn</span>
                </button>
                <button type="button" className="rep-tile" onClick={() => { clearFilter(); setFStatus('done'); setHideDone(false); scrollToList(); }}>
                  <span className="rep-tile-n" style={{ color: '#16a34a' }}>{report.done}</span><span className="rep-tile-l">Hoàn thành · {donePct}%</span>
                </button>
              </div>

              <div className="rep-grid">
                <div className="rep-box">
                  <h4 className="rep-h">Theo trạng thái</h4>
                  <div className="rep-donut">
                    <Donut segments={statusSegs} size={128} thickness={16} centerTop={report.total} centerSub="việc" />
                    <div className="rep-legend">
                      {COLUMNS.filter((s) => report.st[s] > 0).map((s) => (
                        <button key={s} type="button" className="rep-lg" onClick={() => { clearFilter(); setFStatus(s); if (s === 'done') setHideDone(false); scrollToList(); }}>
                          <span className="rep-lg-dot" style={{ background: STATUS_COLOR[s] }} />
                          <span className="rep-lg-lbl">{STATUS_LABEL[s]}</span>
                          <b>{report.st[s]}</b>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rep-box">
                  <div className="flexbtw" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <h4 className="rep-h" style={{ margin: 0 }}>Phân bổ theo</h4>
                    <div className="rep-seg">
                      {DIMS.map((d) => (
                        <button key={d.k} type="button" className={`rep-seg-b${dim === d.k ? ' on' : ''}`} onClick={() => setDim(d.k)}>{d.label}</button>
                      ))}
                    </div>
                  </div>
                  {dimRows.length === 0 ? (
                    <p className="muted" style={{ margin: '10px 0 0', fontSize: 13 }}>Chưa có dữ liệu.</p>
                  ) : (
                    <div className="rep-bars">
                      {dimRows.map((r) => (
                        <button key={r.key} type="button" className={`rep-bar${r.key ? '' : ' rep-bar-off'}`} onClick={() => pickDim(r.key)} title={r.key ? `Lọc: ${r.label}` : undefined}>
                          <span className="rep-bar-lbl" title={r.label}>{r.label}</span>
                          <span className="rep-bar-track">
                            <span className="rep-bar-fill" style={{ width: `${(r.total / dimMax) * 100}%` }}>
                              {r.done > 0 && <i style={{ flex: r.done, background: '#16a34a' }} />}
                              {r.openNo > 0 && <i style={{ flex: r.openNo, background: '#2563eb' }} />}
                              {r.overdue > 0 && <i style={{ flex: r.overdue, background: '#dc2626' }} />}
                              {r.canceled > 0 && <i style={{ flex: r.canceled, background: '#cbd5e1' }} />}
                            </span>
                          </span>
                          <span className="rep-bar-val">{r.total}{r.overdue > 0 && <em className="rep-bar-od"> ⚠{r.overdue}</em>}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="rep-foot">
                    <span><i className="rep-sw" style={{ background: '#16a34a' }} />Xong</span>
                    <span><i className="rep-sw" style={{ background: '#2563eb' }} />Đang mở</span>
                    <span><i className="rep-sw" style={{ background: '#dc2626' }} />Quá hạn</span>
                    <span className="muted">Bấm một mục để lọc danh sách bên dưới</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="card task-summary" id="task-list-top" style={{ marginBottom: 14 }}>
        <div className="flexbtw" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <h3 style={{ margin: 0 }}>Tổng quan ({filtered.length} việc)</h3>
          {byStatus.overdue > 0 && (
            <span className="dl-badge dl-over">⚠ {byStatus.overdue} việc quá hạn</span>
          )}
        </div>
        {segments.length > 0 && <div style={{ marginTop: 10 }}><StackedBar segments={segments} /></div>}
        <div className="ts-legend">
          {COLUMNS.filter((s) => byStatus.c[s] > 0).map((s) => (
            <span key={s} className="ts-chip">
              <span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLOR[s], display: 'inline-block' }} />
              {STATUS_LABEL[s]}: <b>{byStatus.c[s]}</b>
            </span>
          ))}
        </div>
      </div>

      <div className="filterbar">
        <input className="i fb-search" placeholder="🔍 Tìm việc / OKR / dự án…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="i fb-sel" value={fOwner} onChange={(e) => setFOwner(e.target.value)}>
          <option value="">Phụ trách: tất cả</option>
          {owners.map((o) => <option key={o.email} value={o.email}>{o.name}</option>)}
        </select>
        <div className="fb-sel fb-ss">
          <SearchSelect name="_fUnit" value={fUnit} onChange={setFUnit} emptyLabel="Đơn vị: tất cả" placeholder="Đơn vị: tất cả" options={unitChoices} />
        </div>
        <select className="i fb-sel" value={fObj} onChange={(e) => setFObj(e.target.value)}>
          <option value="">OKR: tất cả</option>
          {objectives.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select className="i fb-sel" value={fProject} onChange={(e) => setFProject(e.target.value)}>
          <option value="">Thuộc dự án: tất cả</option>
          {projectChoices.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="i fb-sel" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">Trạng thái: tất cả</option>
          {COLUMNS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select className="i fb-sel" value={fPrio} onChange={(e) => setFPrio(e.target.value)}>
          <option value="">Ưu tiên: tất cả</option>
          <option value="high">Cao</option>
          <option value="medium">Trung bình</option>
          <option value="low">Thấp</option>
        </select>
        <select className="i fb-sel" value={fKind} onChange={(e) => setFKind(e.target.value)}>
          <option value="">Loại: tất cả</option>
          <option value="project">Dự án</option>
          <option value="subproject">Tiểu dự án</option>
          <option value="action">Công việc</option>
        </select>
        <select
          className="i fb-sel"
          title="Sắp xếp danh sách"
          value={sortKey ? `${sortKey}|${sortDir}` : ''}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) { setSortKey(null); return; }
            const [k, d] = v.split('|');
            setSortKey(k as SortKey);
            setSortDir(d as 'asc' | 'desc');
          }}
        >
          <option value="">Sắp xếp: Mặc định</option>
          <option value="created|desc">Mới tạo trước</option>
          <option value="created|asc">Cũ nhất trước</option>
          <option value="due|asc">Hạn gần nhất</option>
          <option value="progress|desc">Tiến độ cao → thấp</option>
        </select>
        {periods.length > 1 && (
          <select className="i fb-sel" value={fPeriod} onChange={(e) => setFPeriod(e.target.value)}>
            <option value="">Kỳ: tất cả</option>
            {periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <label className="fb-chk">
          <input type="checkbox" checked={fOverdue} onChange={(e) => setFOverdue(e.target.checked)} /> ⚠ Quá hạn
        </label>
        <label className="fb-chk">
          <input type="checkbox" checked={fMine} onChange={(e) => setFMine(e.target.checked)} /> 👤 Việc của tôi
        </label>
        <label className="fb-chk">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> Ẩn việc đã xong
        </label>
        {fActive && (
          <button type="button" className="btn ghost sm" onClick={clearFilter}>✕ Xoá lọc ({filtered.length})</button>
        )}
      </div>

      <div className="exec-tabs" style={{ marginTop: 2 }}>
        {([['list', '📋', 'Danh sách'], ['kanban', '🗂️', 'Kanban'], ['timeline', '📅', 'Dòng thời gian']] as const).map(([k, ic, lb]) => (
          <button key={k} type="button" className={`exec-tab ${view === k ? 'active' : ''}`} onClick={() => pickView(k)}>
            <span aria-hidden>{ic}</span> {lb}
          </button>
        ))}
      </div>

      {view === 'kanban' && (
        <TasksKanban tasks={sorted} canEditT={(t) => manageSet.has(t.id) || t.owner_email?.toLowerCase() === emailLc} move={move} onOpen={(t) => setEditing(t)} waiting={waitingTitles} />
      )}
      {view === 'timeline' && (
        <TasksGantt tasks={sorted} onOpen={(t) => setEditing(t)} waiting={waitingTitles} />
      )}

      {view === 'list' && <>
      <div className="table-sticky">
        <table className="t task-table">
          <thead>
            <tr>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  className={`sortable${sortKey === c.key ? ' active' : ''}`}
                  style={c.style}
                  onClick={() => toggleSort(c.key)}
                  title={c.hint ? `${c.hint}\n(Bấm để sắp xếp)` : 'Bấm để sắp xếp'}
                >
                  {c.label}
                  {sortKey === c.key && <span className="sort-ar">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((t) => (
              <tr key={t.id} className="te-row" onClick={() => setEditing(t)} title="Bấm để cập nhật / sửa / xoá">
                <td>{t.code && <span className="okr-code">{t.code}</span>}</td>
                <td>
                  {/* CHỈ hiện nhãn khi là NHÓM (Dự án/Tiểu dự án có việc con) — việc lẻ không cần
                      nhãn "Công việc" (thừa). Nhãn inline để tiêu đề dài chảy tự nhiên, không xuống dòng lệch. */}
                  {effKindT(t) !== 'action' && (
                    <span className={`badge ${KIND_CLS[effKindT(t)]}`} style={{ fontSize: 10.5, marginRight: 6 }}>{KIND_LABEL[effKindT(t)]}</span>
                  )}
                  <b>{t.title}</b>
                  {' '}<WaitBadge titles={waitingTitles(t.id)} />
                </td>
                <td><span className={`badge ${STATUS_CLS[t.status]}`}>{STATUS_LABEL[t.status]}</span></td>
                <td>
                  {t.priority === 'high'
                    ? <span className="badge red" style={{ fontSize: 10.5 }}>Cao</span>
                    : <span className="muted" style={{ fontSize: 12.5 }}>{PRIO_LABEL[t.priority]}</span>}
                </td>
                <td>
                  <ProgressBar value={t.progress} />
                  <div className="right muted mono" style={{ fontSize: 11.5 }}>{t.progress.toFixed(0)}%</div>
                </td>
                <td>
                  {t.owner_email ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                      {t.owner_avatar && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={t.owner_avatar} alt="" referrerPolicy="no-referrer"
                          style={{ width: 20, height: 20, borderRadius: '50%' }} />
                      )}
                      <UserLink email={t.owner_email} name={t.owner_name} stop />
                    </span>
                  ) : <span className="muted" style={{ fontSize: 12.5 }}>—</span>}
                </td>
                <td style={{ fontSize: 12.5 }}>{t.unit_name || <span className="muted">—</span>}</td>
                <td>
                  {t.objective_id ? (
                    <Link href={`/objectives/${t.objective_id}`} style={{ fontSize: 12.5 }} onClick={(e) => e.stopPropagation()}>
                      {t.objective_code ? <span className="okr-code">{t.objective_code}</span> : 'Mở OKR'}
                    </Link>
                  ) : t.meeting_id ? (
                    <Link href={`/meetings/${t.meeting_id}`} className="ctx-chip ctx-mtg" style={{ fontSize: 11 }} onClick={(e) => e.stopPropagation()} title="Việc thuần của cuộc họp">
                      🗓 {t.meeting_code || t.meeting_title}
                    </Link>
                  ) : <span className="muted">—</span>}
                </td>
                <td>
                  {t.project_id ? (
                    <Link href={`/projects/${t.project_id}`} style={{ fontSize: 12.5 }} onClick={(e) => e.stopPropagation()}>
                      🗂 {t.project_code || t.project_name}
                    </Link>
                  ) : <span className="muted">—</span>}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {t.due_on ? (
                    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 12.5 }}>{fmtDate(t.due_on)}</span>
                      <DeadlineBadge t={t} />
                    </span>
                  ) : <span className="muted">—</span>}
                </td>
                <td style={{ whiteSpace: 'nowrap', fontSize: 12.5 }}>
                  {t.created_at ? fmtCreated(t.created_at) : <span className="muted">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <div className="card"><p className="muted" style={{ margin: 0 }}>Không có công việc nào khớp bộ lọc.</p></div>
      )}
      {sorted.length > PAGE_SIZE && (
        <div className="pager">
          <button type="button" className="btn ghost sm" disabled={curPage === 0} onClick={() => setPage(curPage - 1)}>← Trước</button>
          <span className="pager-info">
            {curPage * PAGE_SIZE + 1}–{Math.min((curPage + 1) * PAGE_SIZE, sorted.length)} / {sorted.length} việc · Trang {curPage + 1}/{pageCount}
          </span>
          <button type="button" className="btn ghost sm" disabled={curPage >= pageCount - 1} onClick={() => setPage(curPage + 1)}>Sau →</button>
        </div>
      )}
      </>}
      {!seeAll && (
        <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
          Bạn đang xem {tasks.length} việc liên quan đến bạn (được giao / bạn giao / OKR bạn chủ trì /
          dự án bạn tham gia / phạm vi đơn vị bạn quản). Người có quyền “Toàn phạm vi” xem toàn bộ {totalAll} việc.
        </p>
      )}

      {editing && (
        <TaskEditModal
          task={editing}
          canManage={manageSet.has(editing.id)}
          isAssignee={!!editing.owner_email && editing.owner_email.toLowerCase() === emailLc}
          users={users}
          units={units}
          projects={projects}
          editAction={editAction}
          deleteAction={deleteAction}
          onClose={() => setEditing(null)}
          depInitial={depsMap[editing.id] ?? []}
          depOptions={tasks
            .filter((t) => t.id !== editing.id && t.objective_id && t.objective_id === editing.objective_id)
            .map((t) => ({ value: t.id, label: `${t.code ? t.code + ' · ' : ''}${t.title}` }))}
        />
      )}
    </div>
  );
}

// ───────── Kanban cho /tasks (kéo–thả đổi trạng thái, bấm mở popup) ─────────
function effKindT(t: TaskRow): 'project' | 'subproject' | 'action' {
  return t.kind !== 'action' && !t.has_children ? 'action' : t.kind;
}
function TasksKanban({
  tasks, canEditT, move, onOpen, waiting,
}: {
  tasks: TaskRow[];
  canEditT: (t: TaskRow) => boolean;
  move: (id: string, status: Status) => Promise<void>;
  onOpen: (t: TaskRow) => void;
  waiting: (id: string) => string[];
}) {
  const router = useRouter();
  const [cards, setCards] = useState<TaskRow[]>(tasks);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<Status | null>(null);
  const [, startTransition] = useTransition();
  const lastDragEnd = useRef<number>(0);
  useEffect(() => setCards(tasks), [tasks]);

  const drop = (status: Status) => {
    const id = dragId;
    setOverCol(null);
    setDragId(null);
    if (!id) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.status === status || !canEditT(card)) return;
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, status, progress: status === 'done' ? 100 : c.progress } : c)));
    startTransition(async () => {
      try { await move(id, status); router.refresh(); }
      catch (e) { setCards(tasks); alert('Không cập nhật được: ' + (e instanceof Error ? e.message : String(e))); }
    });
  };

  if (tasks.length === 0) return <p className="muted">Không có công việc nào khớp bộ lọc.</p>;
  return (
    <>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
        Bấm thẻ để mở &amp; sửa. Kéo–thả giữa các cột để đổi trạng thái (chỉ việc bạn quản lý hoặc được giao).
      </p>
      <div className="kb-board">
        {COLUMNS.map((col) => {
          const list = cards.filter((c) => c.status === col);
          return (
            <div key={col} className={`kb-col ${overCol === col ? 'over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); if (overCol !== col) setOverCol(col); }}
              onDragLeave={() => setOverCol((o) => (o === col ? null : o))}
              onDrop={() => drop(col)}>
              <div className="kb-col-h" style={{ borderTopColor: STATUS_COLOR[col] }}>
                {STATUS_LABEL[col]} <span className="kb-count">{list.length}</span>
              </div>
              <div className="kb-col-body">
                {list.map((c) => {
                  const editable = canEditT(c);
                  const dl = deadlineInfo(c).state;
                  const ek = effKindT(c);
                  return (
                    <div key={c.id}
                      className={`kb-card ${dragId === c.id ? 'dragging' : ''} ${editable ? '' : 'locked'} ${dl === 'overdue' ? 'kb-over' : dl === 'today' || dl === 'soon' ? 'kb-soon' : ''}`}
                      draggable={editable}
                      onDragStart={(e) => { setDragId(c.id); e.dataTransfer.effectAllowed = 'move'; }}
                      onDragEnd={() => { lastDragEnd.current = Date.now(); setDragId(null); }}
                      onClick={() => { if (Date.now() - lastDragEnd.current < 250) return; onOpen(c); }}
                      title={editable ? 'Bấm để sửa · kéo để đổi trạng thái' : 'Bấm để xem'}>
                      {(ek !== 'action' || c.priority === 'high') && (
                        <div className="kb-card-top">
                          {ek !== 'action' && <span className={`badge ${KIND_CLS[ek]}`} style={{ fontSize: 10 }}>{KIND_LABEL[ek]}</span>}
                          {c.priority === 'high' && <span className="badge red" style={{ fontSize: 10 }}>Ưu tiên</span>}
                        </div>
                      )}
                      <div className="kb-card-title">
                        {c.code && <span className="okr-code" style={{ fontSize: 10, marginRight: 4 }}>{c.code}</span>}{c.title}
                      </div>
                      {waiting(c.id).length > 0 && <div className="kb-card-wait"><WaitBadge titles={waiting(c.id)} /></div>}
                      {c.unit_name && <div className="kb-card-unit">🏢 {c.unit_name}</div>}
                      <div className="kb-card-ctx">
                        {c.objective_code && <span className="ctx-chip ctx-o">🎯 {c.objective_code}</span>}
                        {c.project_id && <span className="ctx-chip ctx-proj">🗂 {c.project_code || c.project_name}</span>}
                        {!c.objective_id && c.meeting_id && <span className="ctx-chip ctx-mtg">🗓 {c.meeting_code || c.meeting_title}</span>}
                      </div>
                      <div className="kb-card-foot">
                        <span>{c.owner_name || 'Chưa giao'}</span>
                        {c.due_on && <span>· {fmtDate(c.due_on)}</span>}
                        <span className="kb-card-prog">{c.progress.toFixed(0)}%</span>
                      </div>
                      {dl !== 'none' && <div className="kb-card-dl"><DeadlineBadge t={c} /></div>}
                      <div className="kb-mini"><span style={{ width: `${Math.max(0, Math.min(100, c.progress))}%` }} /></div>
                    </div>
                  );
                })}
                {list.length === 0 && <div className="kb-empty">—</div>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ───────── Gantt cho /tasks (read-only, bấm mở popup) ─────────
function TasksGantt({ tasks, onOpen, waiting }: { tasks: TaskRow[]; onOpen: (t: TaskRow) => void; waiting: (id: string) => string[] }) {
  const parseD = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const dayDiff = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);
  const dated = tasks.filter((c) => c.start_on || c.due_on);
  const undated = tasks.filter((c) => !c.start_on && !c.due_on);
  if (dated.length === 0)
    return <p className="muted" style={{ marginTop: 4 }}>Chưa có việc nào đặt lịch (ngày bắt đầu/hạn). Thêm hạn để hiện trên dòng thời gian.</p>;

  const ds: Date[] = [];
  dated.forEach((c) => { if (c.start_on) ds.push(parseD(c.start_on)); if (c.due_on) ds.push(parseD(c.due_on)); });
  let min = ds[0], max = ds[0];
  ds.forEach((d) => { if (d < min) min = d; if (d > max) max = d; });
  min = new Date(min.getTime() - 2 * 86400000);
  max = new Date(max.getTime() + 2 * 86400000);
  const total = Math.max(1, dayDiff(min, max));
  const ticks: { left: number; label: string }[] = [];
  const t = new Date(min.getFullYear(), min.getMonth(), 1);
  while (t <= max) {
    const off = dayDiff(min, t);
    if (off >= 0) ticks.push({ left: (off / total) * 100, label: `T${t.getMonth() + 1}/${t.getFullYear() % 100}` });
    t.setMonth(t.getMonth() + 1);
  }
  const today = new Date();
  const todayLeft = today >= min && today <= max ? (dayDiff(min, today) / total) * 100 : null;

  return (
    <div className="gantt-wrap">
      <div className="gantt">
        <div className="gantt-axis">
          <div className="gantt-labelcol" />
          <div className="gantt-track gantt-axis-track">
            {ticks.map((tk, i) => <span key={i} className="gantt-tick" style={{ left: `${tk.left}%` }}>{tk.label}</span>)}
            {todayLeft !== null && <span className="gantt-today" style={{ left: `${todayLeft}%` }} title="Hôm nay" />}
          </div>
        </div>
        {dated.map((c) => {
          const s = c.start_on ? parseD(c.start_on) : parseD(c.due_on!);
          const e = c.due_on ? parseD(c.due_on) : parseD(c.start_on!);
          const left = (dayDiff(min, s) / total) * 100;
          const width = Math.max(1.5, (Math.max(0, dayDiff(s, e)) / total) * 100);
          const dl = deadlineInfo(c).state;
          const ek = effKindT(c);
          return (
            <div key={c.id} className="gantt-row" onClick={() => onOpen(c)} style={{ cursor: 'pointer' }} title="Bấm để mở">
              <div className="gantt-labelcol" title={c.title}>
                {ek !== 'action' && <><span className={`badge ${KIND_CLS[ek]}`} style={{ fontSize: 10 }}>{KIND_LABEL[ek]}</span>{' '}</>}
                {c.code && <span className="okr-code" style={{ fontSize: 9.5, marginRight: 3 }}>{c.code}</span>}
                {dl !== 'none' && <><DeadlineBadge t={c} /> </>}
                {waiting(c.id).length > 0 && <><span className="dl-badge dl-wait" style={{ fontSize: 9.5 }} title={`Phải xong trước: ${waiting(c.id).join(' · ')}`}>⏳{waiting(c.id).length}</span> </>}
                <span className="gantt-name">{c.title}</span>
              </div>
              <div className="gantt-track">
                {todayLeft !== null && <span className="gantt-today" style={{ left: `${todayLeft}%` }} />}
                <span className={`gantt-bar ${dl === 'overdue' ? 'gantt-over' : dl === 'today' || dl === 'soon' ? 'gantt-soon' : ''}`}
                  style={{ left: `${left}%`, width: `${width}%`, background: STATUS_COLOR[c.status] }}>
                  <span className="gantt-bar-fill" style={{ width: `${Math.max(0, Math.min(100, c.progress))}%` }} />
                  <span className="gantt-bar-txt">{c.progress.toFixed(0)}%</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {undated.length > 0 && (
        <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>Chưa đặt lịch ({undated.length}): {undated.map((c) => c.title).join(' · ')}</p>
      )}
    </div>
  );
}
