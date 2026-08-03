'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { ProgressBar } from '@/components/ui';
import { StackedBar } from '@/components/charts';
import TaskEditModal from '@/components/TaskEditModal';
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
type SortKey = 'code' | 'title' | 'status' | 'priority' | 'progress' | 'owner' | 'unit' | 'objective' | 'project' | 'due';
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
  }
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
}: {
  tasks: TaskRow[];
  currentEmail: string;
  seeAll: boolean;
  totalAll: number;
  manageIds: string[];
  users: PersonOpt[];
  units: UnitOpt[];
  projects: ProjectOpt[];
  editAction: (fd: FormData) => Promise<void>;
  deleteAction: (fd: FormData) => Promise<void>;
}) {
  const manageSet = useMemo(() => new Set(manageIds), [manageIds]);
  const [editing, setEditing] = useState<TaskRow | null>(null);
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

  const emailLc = currentEmail.toLowerCase();

  const owners = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tasks) if (t.owner_email) m.set(t.owner_email, t.owner_name || t.owner_email);
    return [...m.entries()].map(([email, name]) => ({ email, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);
  const unitChoices = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tasks) if (t.unit_id && t.unit_name) m.set(t.unit_id, t.unit_name);
    return [...m.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);
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
    [tasks, fMine, fOwner, fUnit, fObj, fProject, fStatus, fPrio, fKind, fPeriod, fOverdue, qlc, emailLc],
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

  return (
    <div>
      <div className="card task-summary" style={{ marginBottom: 14 }}>
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
        <select className="i fb-sel" value={fUnit} onChange={(e) => setFUnit(e.target.value)}>
          <option value="">Đơn vị: tất cả</option>
          {unitChoices.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
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
        {fActive && (
          <button type="button" className="btn ghost sm" onClick={clearFilter}>✕ Xoá lọc ({filtered.length})</button>
        )}
      </div>

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
            {sorted.map((t) => (
              <tr key={t.id} className="te-row" onClick={() => setEditing(t)} title="Bấm để cập nhật / sửa / xoá">
                <td>{t.code && <span className="okr-code">{t.code}</span>}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span className={`badge ${KIND_CLS[t.kind]}`} style={{ fontSize: 10.5 }}>{KIND_LABEL[t.kind]}</span>
                    <b>{t.title}</b>
                  </div>
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
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {t.owner_avatar && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={t.owner_avatar} alt="" referrerPolicy="no-referrer"
                          style={{ width: 20, height: 20, borderRadius: '50%' }} />
                      )}
                      <span style={{ fontSize: 12.5 }}>{t.owner_name || t.owner_email}</span>
                    </span>
                  ) : <span className="muted" style={{ fontSize: 12.5 }}>—</span>}
                </td>
                <td style={{ fontSize: 12.5 }}>{t.unit_name || <span className="muted">—</span>}</td>
                <td>
                  {t.objective_id ? (
                    <Link href={`/objectives/${t.objective_id}`} style={{ fontSize: 12.5 }} onClick={(e) => e.stopPropagation()}>
                      {t.objective_code ? <span className="okr-code">{t.objective_code}</span> : 'Mở OKR'}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <div className="card"><p className="muted" style={{ margin: 0 }}>Không có công việc nào khớp bộ lọc.</p></div>
      )}
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
        />
      )}
    </div>
  );
}
