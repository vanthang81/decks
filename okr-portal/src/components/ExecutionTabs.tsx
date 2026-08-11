'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CommentThread from '@/components/CommentThread';
import ConfirmButton from '@/components/ConfirmButton';
import SearchSelect from '@/components/SearchSelect';
import { unitTreeOptions } from '@/lib/unit-options';
import NumberInput from '@/components/NumberInput';
import UserLink from '@/components/UserLink';
import { ProgressBar } from '@/components/ui';
import { fmtVnd, fmtDate } from '@/lib/format';

// Hằng số lặp lại từ lib (KHÔNG import initiatives.ts để tránh kéo pg vào client bundle).
type Status = 'todo' | 'in_progress' | 'blocked' | 'done' | 'canceled';
type Kind = 'project' | 'subproject' | 'action';

const STATUS_LABEL: Record<Status, string> = {
  todo: 'Chưa làm',
  in_progress: 'Đang làm',
  blocked: 'Vướng',
  done: 'Xong',
  canceled: 'Huỷ',
};
const KIND_LABEL: Record<Kind, string> = {
  project: 'Dự án',
  subproject: 'Tiểu dự án',
  action: 'Công việc',
};
const KIND_CLS: Record<Kind, string> = { project: 'blue', subproject: 'amber', action: 'gray' };
const PRIO_LABEL: Record<'low' | 'medium' | 'high', string> = { high: 'Cao', medium: 'Trung bình', low: 'Thấp' };
// Nút 'Dự án'/'Tiểu dự án' KHÔNG có con = thực chất là 1 công việc → hiển thị "Công việc"
// (tránh nhầm với "Thuộc dự án" = gói PRJ). childParents = tập id các nút có con.
function effKind(c: { id: string; kind: Kind }, childParents: Set<string>): Kind {
  return c.kind !== 'action' && !childParents.has(c.id) ? 'action' : c.kind;
}
// Loại con hợp lệ (đồng bộ CHILD_KIND ở lib) — khai lại để không kéo pg vào client.
const CHILD_KIND: Record<Kind, Kind[]> = {
  project: ['subproject', 'action'],
  subproject: ['action'],
  action: [],
};
const STATUS_CLS: Record<Status, string> = {
  todo: 'gray',
  in_progress: 'blue',
  blocked: 'red',
  done: 'green',
  canceled: 'gray',
};
const COLUMNS: Status[] = ['todo', 'in_progress', 'blocked', 'done', 'canceled'];
const STATUS_COLOR: Record<Status, string> = {
  todo: '#94a3b8',
  in_progress: '#2563eb',
  blocked: '#dc2626',
  done: '#16a34a',
  canceled: '#a8a29e',
};

export type Card = {
  id: string;
  code: string | null;
  parent_id: string | null;
  kind: Kind;
  title: string;
  description: string | null;
  owner_email: string | null;
  owner_name: string | null;
  unit_id: string | null;
  unit_name: string | null;
  project_id: string | null;
  project_name: string | null;
  project_code: string | null;
  meeting_id: string | null;
  meeting_code: string | null;
  meeting_title: string | null;
  objective_id?: string | null;
  objective_code?: string | null;
  key_result_id?: string | null;
  key_result_code?: string | null;
  status: Status;
  priority: 'low' | 'medium' | 'high';
  progress: number;
  start_on: string | null;
  due_on: string | null;
  done_on?: string | null;
  budget_planned: number;
  budget_actual: number;
  evidence_url?: string | null;
};

export type PersonOpt = { email: string; name: string; avatar?: string | null; unit_id?: string | null; title?: string | null };
export type UnitOpt = { id: string; name: string; type: 'company' | 'division' | 'department'; parent_id?: string | null; sort?: number | null };
export type ProjectOpt = { id: string; code: string | null; name: string };
export type MeetingOpt = { id: string; code: string | null; title: string };
export type ObjOpt = {
  id: string; code: string | null; title: string; unit_name: string | null;
  krs: { id: string; code: string | null; title: string }[];
};

type View = 'list' | 'kanban' | 'timeline';

function fmtD(s: string | null): string {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}`;
}
function parseD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function dayDiff(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

// Cảnh báo hạn công việc: quá hạn / đến hạn hôm nay / sắp đến hạn (≤3 ngày).
// Việc đã Xong hoặc Huỷ thì KHÔNG cảnh báo.
type DlState = 'overdue' | 'today' | 'soon' | 'none';
function deadlineInfo(c: Card): { state: DlState; days: number } {
  if (!c.due_on || c.status === 'done' || c.status === 'canceled') return { state: 'none', days: 0 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = dayDiff(today, parseD(c.due_on)); // >0 tương lai · 0 hôm nay · <0 quá khứ
  if (days < 0) return { state: 'overdue', days };
  if (days === 0) return { state: 'today', days };
  if (days <= 3) return { state: 'soon', days };
  return { state: 'none', days };
}
function DeadlineBadge({ c }: { c: Card }) {
  const { state, days } = deadlineInfo(c);
  if (state === 'overdue')
    return (
      <span className="dl-badge dl-over" title={`Quá hạn ${-days} ngày (hạn ${fmtD(c.due_on)})`}>
        ⚠ Quá hạn {-days}n
      </span>
    );
  if (state === 'today')
    return (
      <span className="dl-badge dl-today" title={`Đến hạn hôm nay (${fmtD(c.due_on)})`}>
        ⏰ Đến hạn hôm nay
      </span>
    );
  if (state === 'soon')
    return (
      <span className="dl-badge dl-soon" title={`Còn ${days} ngày tới hạn (${fmtD(c.due_on)})`}>
        ⏰ Còn {days}n
      </span>
    );
  return null;
}

type Ctx = 'objective' | 'project' | 'meeting';

// Chip ngữ cảnh: hiện thông tin CÓ Ý NGHĨA theo nơi đang xem, ẩn cái hiển nhiên.
// - Trong DỰ ÁN: hiện Objective + Key Result gốc (link) — ẩn tên dự án (đang ở trong nó).
// - Trong OKR: Objective là hiển nhiên → ẩn; hiện Key Result gắn việc + Dự án (link).
function ContextChips({ c, context }: { c: Card; context: Ctx }) {
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const oLink = c.objective_id ? `/objectives/${c.objective_id}` : null;
  if (context === 'project' || context === 'meeting') {
    // Trong DỰ ÁN / CUỘC HỌP: hiện OKR + KR gốc (link); dự án hiện khi đang ở cuộc họp; ẩn chip
    // của chính nơi đang xem (dự án khi ở dự án, cuộc họp khi ở cuộc họp).
    return (
      <>
        {oLink && c.objective_code && (
          <Link href={oLink} className="ctx-chip ctx-o" onClick={stop} target="_blank" rel="noopener" title="Mở Objective gốc (tab mới)">
            🎯 {c.objective_code}
          </Link>
        )}
        {oLink && c.key_result_code && (
          <Link href={`${oLink}#kr-${c.key_result_id ?? ''}`} className="ctx-chip ctx-kr" onClick={stop} target="_blank" rel="noopener" title="Mở Key Result gốc (tab mới)">
            🔑 {c.key_result_code}
          </Link>
        )}
        {context === 'meeting' && c.project_id && c.project_name && (
          <Link href={`/projects/${c.project_id}`} className="ctx-chip ctx-proj" onClick={stop} target="_blank" rel="noopener" title="Mở dự án (tab mới)">
            🗂 {c.project_name}
          </Link>
        )}
        {context === 'project' && c.meeting_id && (
          <Link href={`/meetings/${c.meeting_id}`} className="ctx-chip ctx-mtg" onClick={stop} target="_blank" rel="noopener" title="Mở cuộc họp (tab mới)">
            🗓 {c.meeting_code || c.meeting_title}
          </Link>
        )}
      </>
    );
  }
  return (
    <>
      {c.key_result_code && (
        <span className="ctx-chip ctx-kr" title="Key Result gắn việc">🔑 {c.key_result_code}</span>
      )}
      {c.project_id && c.project_name && (
        <Link href={`/projects/${c.project_id}`} className="ctx-chip ctx-proj" onClick={stop} target="_blank" rel="noopener" title="Mở dự án (tab mới)">
          🗂 {c.project_name}
        </Link>
      )}
      {c.meeting_id && (
        <Link href={`/meetings/${c.meeting_id}`} className="ctx-chip ctx-mtg" onClick={stop} target="_blank" rel="noopener" title="Mở cuộc họp (tab mới)">
          🗓 {c.meeting_code || c.meeting_title}
        </Link>
      )}
    </>
  );
}

export default function ExecutionTabs({
  initiatives,
  canManage,
  currentEmail,
  move,
  save,
  del,
  createChild,
  createProjectForInit,
  objectiveId,
  users,
  units,
  projects,
  meetings = [],
  objectives = [],
  manageStructure = true,
  context = 'objective',
  children,
}: {
  initiatives: Card[];
  canManage: boolean;
  currentEmail: string;
  move: (id: string, status: Status) => Promise<void>;
  save: (fd: FormData) => Promise<void>;
  del: (fd: FormData) => Promise<void>;
  createChild: (fd: FormData) => Promise<void>;
  createProjectForInit: (fd: FormData) => Promise<void>;
  objectiveId: string;
  users: PersonOpt[];
  units: UnitOpt[];
  projects: ProjectOpt[];
  meetings?: MeetingOpt[];
  objectives?: ObjOpt[];
  manageStructure?: boolean;
  context?: Ctx;
  children: React.ReactNode;
}) {
  const [view, setView] = useState<View>('list');
  const [editing, setEditing] = useState<Card | null>(null);
  useEffect(() => {
    const v = (typeof window !== 'undefined' && localStorage.getItem('okrExecView')) as View | null;
    if (v === 'list' || v === 'kanban' || v === 'timeline') setView(v);
  }, []);
  const pick = (v: View) => {
    setView(v);
    if (typeof window !== 'undefined') localStorage.setItem('okrExecView', v);
  };

  const emailLc = currentEmail.toLowerCase();
  const canEdit = (c: Card) =>
    canManage || (!!c.owner_email && c.owner_email.toLowerCase() === emailLc);

  const tabs: { key: View; label: string; icon: string }[] = [
    { key: 'list', label: 'Danh sách', icon: '📋' },
    { key: 'kanban', label: 'Kanban', icon: '🗂️' },
    { key: 'timeline', label: 'Dòng thời gian', icon: '📅' },
  ];

  // Tập id các nút CÓ con (từ danh sách ĐẦY ĐỦ, không phải đã lọc) → để relabel nút lá.
  const childParents = useMemo(
    () => new Set(initiatives.map((i) => i.parent_id).filter(Boolean) as string[]),
    [initiatives],
  );

  // ----- Bộ lọc việc (áp cho cả 3 view) -----
  const [q, setQ] = useState('');
  const [fOwner, setFOwner] = useState('');
  const [fUnit, setFUnit] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fPrio, setFPrio] = useState('');
  const [fOverdue, setFOverdue] = useState(false);
  const [fMine, setFMine] = useState(false);
  const [hideDone, setHideDone] = useState(true); // mặc định ẩn việc đã xong cho gọn

  const owners = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of initiatives) if (c.owner_email) m.set(c.owner_email, c.owner_name || c.owner_email);
    return [...m.entries()].map(([email, name]) => ({ email, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [initiatives]);
  const unitList = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of initiatives) if (c.unit_id && c.unit_name) m.set(c.unit_id, c.unit_name);
    return [...m.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [initiatives]);

  const qlc = q.trim().toLowerCase();
  const fActive = !!(qlc || fOwner || fUnit || fStatus || fPrio || fOverdue || fMine);
  const filtered = useMemo(
    () =>
      initiatives.filter((c) => {
        if (fMine && c.owner_email?.toLowerCase() !== emailLc) return false;
        if (fOwner && c.owner_email !== fOwner) return false;
        if (fUnit && c.unit_id !== fUnit) return false;
        if (fStatus && c.status !== fStatus) return false;
        if (hideDone && fStatus !== 'done' && c.status === 'done') return false;
        if (fPrio && c.priority !== fPrio) return false;
        if (fOverdue && deadlineInfo(c).state !== 'overdue') return false;
        if (qlc) {
          const hay = `${c.title} ${c.code ?? ''} ${c.owner_name ?? ''}`.toLowerCase();
          if (!hay.includes(qlc)) return false;
        }
        return true;
      }),
    [initiatives, fMine, fOwner, fUnit, fStatus, fPrio, fOverdue, hideDone, qlc, emailLc],
  );
  const clearFilter = () => {
    setQ('');
    setFOwner('');
    setFUnit('');
    setFStatus('');
    setFPrio('');
    setFOverdue(false);
    setFMine(false);
  };

  return (
    <div>
      <div className="exec-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`exec-tab ${view === t.key ? 'active' : ''}`}
            onClick={() => pick(t.key)}
          >
            <span aria-hidden>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div className="filterbar" style={{ marginTop: 2 }}>
        <input className="i fb-search" placeholder="🔍 Tìm việc…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="i fb-sel" value={fOwner} onChange={(e) => setFOwner(e.target.value)}>
          <option value="">Phụ trách: tất cả</option>
          {owners.map((o) => (
            <option key={o.email} value={o.email}>{o.name}</option>
          ))}
        </select>
        <select className="i fb-sel" value={fUnit} onChange={(e) => setFUnit(e.target.value)}>
          <option value="">Đơn vị: tất cả</option>
          {unitList.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <select className="i fb-sel" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">Trạng thái: tất cả</option>
          {COLUMNS.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select className="i fb-sel" value={fPrio} onChange={(e) => setFPrio(e.target.value)}>
          <option value="">Ưu tiên: tất cả</option>
          <option value="high">Cao</option>
          <option value="medium">Trung bình</option>
          <option value="low">Thấp</option>
        </select>
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
          <button type="button" className="btn ghost sm" onClick={clearFilter}>
            ✕ Xoá lọc ({filtered.length})
          </button>
        )}
      </div>

      {view === 'list' && (
        <div>
          <ListView initiatives={filtered} childParents={childParents} canEdit={canEdit} context={context} onOpen={(c) => setEditing(c)} />
          {children}
        </div>
      )}
      {view === 'kanban' && (
        <KanbanView
          initiatives={filtered}
          childParents={childParents}
          canEdit={canEdit}
          context={context}
          move={move}
          onOpen={(c) => setEditing(c)}
        />
      )}
      {view === 'timeline' && (
        <TimelineView initiatives={filtered} childParents={childParents} canEdit={canEdit} onOpen={(c) => setEditing(c)} />
      )}

      {editing && (
        <EditModal
          card={editing}
          canManage={canManage}
          canEdit={canEdit(editing)}
          hasChildren={initiatives.some((i) => i.parent_id === editing.id)}
          users={users}
          units={units}
          projects={projects}
          meetings={meetings}
          objectives={objectives}
          save={save}
          del={del}
          createChild={createChild}
          createProjectForInit={createProjectForInit}
          objectiveId={objectiveId}
          manageStructure={manageStructure}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ---------------- Popup sửa 1 dự án/công việc ----------------
function EditModal({
  card,
  canManage,
  canEdit,
  hasChildren,
  users,
  units,
  projects,
  meetings,
  objectives,
  save,
  del,
  createChild,
  createProjectForInit,
  objectiveId,
  manageStructure,
  onClose,
}: {
  card: Card;
  canManage: boolean;
  canEdit: boolean;
  hasChildren: boolean;
  users: PersonOpt[];
  units: UnitOpt[];
  projects: ProjectOpt[];
  meetings: MeetingOpt[];
  objectives: ObjOpt[];
  save: (fd: FormData) => Promise<void>;
  del: (fd: FormData) => Promise<void>;
  createChild: (fd: FormData) => Promise<void>;
  createProjectForInit: (fd: FormData) => Promise<void>;
  objectiveId: string;
  manageStructure: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  // Bấm vào việc → mở CHI TIẾT (chỉ xem) trước; bấm "Sửa" mới sang form (CFO 06/08, đồng bộ TaskEditModal).
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [addKid, setAddKid] = useState(false);
  const [inProject, setInProject] = useState<boolean>(!!card.project_id);
  const [newProj, setNewProj] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [selProject, setSelProject] = useState<string>(card.project_id ?? '');
  const [inMeeting, setInMeeting] = useState<boolean>(!!card.meeting_id);
  const [selMeeting, setSelMeeting] = useState<string>(card.meeting_id ?? '');
  const [inOkr, setInOkr] = useState<boolean>(!!card.objective_id);
  const [selObjective, setSelObjective] = useState<string>(card.objective_id ?? '');
  const [selKr, setSelKr] = useState<string>(card.key_result_id ?? '');
  const krOptions = objectives.find((o) => o.id === selObjective)?.krs ?? [];
  const childKinds = CHILD_KIND[card.kind];
  // Nút không có con = hiển thị như "Công việc" (khớp cách hiện ở list/kanban/gantt).
  const mKind: Kind = card.kind !== 'action' && !hasChildren ? 'action' : card.kind;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);


  const run = (fn: () => Promise<void>) => {
    setErr(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
        onClose();
      } catch (e2) {
        setErr(e2 instanceof Error ? e2.message : String(e2));
      }
    });
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('id', card.id);
    run(() => save(fd));
  };

  const submitChild = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('objective_id', objectiveId);
    fd.set('parent_id', card.id);
    if (card.unit_id) fd.set('unit_id', card.unit_id);
    run(() => createChild(fd));
  };

  const doDelete = () => {
    const fd = new FormData();
    fd.set('id', card.id);
    fd.set('objective_id', objectiveId);
    run(() => del(fd));
  };

  const createNewProject = () => {
    const fd = new FormData();
    fd.set('init_id', card.id);
    fd.set('name', newProjName.trim());
    run(() => createProjectForInit(fd));
  };

  return (
    <div className="okr-modal-backdrop" onMouseDown={onClose}>
      <div className="okr-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="okr-modal-head">
          <div>
            {mKind !== 'action' && (
              <><span className={`badge ${KIND_CLS[mKind]}`} style={{ fontSize: 11 }}>
                {KIND_LABEL[mKind]}
              </span>{' '}</>
            )}
            {card.code && <span className="okr-code">{card.code}</span>}
          </div>
          <button type="button" className="okr-modal-x" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        {mode === 'view' ? (
          <div className="te-viewbody">
            <div className="te-links">
              {card.objective_id && (
                <Link href={`/objectives/${card.objective_id}`} className="badge gray" onClick={onClose}>
                  🎯 OKR {card.objective_code || ''}
                </Link>
              )}
              {card.project_id && (
                <Link href={`/projects/${card.project_id}`} className="badge gray" onClick={onClose}>
                  🗂 {card.project_code || card.project_name}
                </Link>
              )}
              {card.meeting_id && (
                <Link href={`/meetings/${card.meeting_id}`} className="badge gray" onClick={onClose}>
                  🗓 {card.meeting_code || card.meeting_title}
                </Link>
              )}
            </div>
            <div className="te-title">{card.title}</div>
            <div className="te-vbadges">
              <span className={`badge ${STATUS_CLS[card.status]}`}>{STATUS_LABEL[card.status]}</span>
              {card.priority === 'high' && <span className="badge red">Ưu tiên cao</span>}
              {mKind !== 'action' && <span className={`badge ${KIND_CLS[mKind]}`}>{KIND_LABEL[mKind]}</span>}
            </div>
            {card.description && <p className="te-desc">{card.description}</p>}
            <table className="t te-detail" style={{ marginTop: 10 }}>
              <tbody>
                <tr><td className="muted">Tiến độ</td><td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 150, display: 'inline-block' }}><ProgressBar value={card.progress} /></span>
                    <b className="mono">{Number(card.progress).toFixed(0)}%</b>
                  </span>
                </td></tr>
                <tr><td className="muted">Phụ trách</td><td>
                  {card.owner_email || card.owner_name ? <UserLink email={card.owner_email} name={card.owner_name} title={users.find((u) => u.email.toLowerCase() === (card.owner_email ?? '').toLowerCase())?.title ?? undefined} /> : <span className="muted">Chưa giao</span>}
                </td></tr>
                <tr><td className="muted">Đơn vị</td><td>{card.unit_name || <span className="muted">—</span>}</td></tr>
                <tr><td className="muted">Ưu tiên</td><td>{PRIO_LABEL[card.priority] ?? card.priority}</td></tr>
                <tr><td className="muted">Bắt đầu</td><td>{card.start_on ? fmtDate(card.start_on) : <span className="muted">—</span>}</td></tr>
                <tr><td className="muted">Hạn</td><td>{card.due_on ? fmtDate(card.due_on) : <span className="muted">—</span>}</td></tr>
                <tr><td className="muted">NS kế hoạch</td><td className="mono">{fmtVnd(card.budget_planned)}</td></tr>
                <tr><td className="muted">Đã chi</td><td className="mono">{fmtVnd(card.budget_actual)}</td></tr>
                <tr><td className="muted">Minh chứng</td><td>{card.evidence_url
                  ? <a className="ci-evi" href={card.evidence_url} target="_blank" rel="noopener noreferrer" title={card.evidence_url}>🔗 Mở minh chứng</a>
                  : <span className="muted">—</span>}</td></tr>
              </tbody>
            </table>
            {!canEdit && <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>Bạn chỉ có quyền xem việc này (chỉ người quản lý OKR hoặc người được giao mới sửa được).</p>}
            <div className="te-actions">
              <div></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn ghost sm" onClick={onClose}>Đóng</button>
                {canEdit && <button type="button" className="btn sm" onClick={() => { setErr(null); setMode('edit'); }}>✏️ Sửa</button>}
              </div>
            </div>
          </div>
        ) : (
          <>
          <form onSubmit={submit}>
            <label className="f">Tên</label>
            <input className="i" name="title" defaultValue={card.title} required disabled={!canManage} />

            {canManage && (
              <div className="row">
                <div>
                  <label className="f">Đơn vị phụ trách (Khối / Phòng)</label>
                  <SearchSelect name="unit_id" defaultValue={card.unit_id ?? ''} emptyLabel="— Không gắn đơn vị —"
                    options={unitTreeOptions(units, { excludeCompany: true })} />
                </div>
                <div>
                  <label className="f">Giao cho (cá nhân)</label>
                  <SearchSelect name="owner_email" defaultValue={card.owner_email ?? ''} emptyLabel="— Chưa giao —"
                    options={users.map((u) => ({ value: u.email, label: u.name, sub: u.title ?? undefined }))} />
                </div>
              </div>
            )}

            {canManage && objectives.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={inOkr}
                    onChange={(e) => {
                      setInOkr(e.target.checked);
                      if (!e.target.checked) { setSelObjective(''); setSelKr(''); }
                    }}
                  />
                  🎯 Thuộc OKR
                </label>
                {inOkr && (
                  <>
                    <div className="row" style={{ marginTop: 6 }}>
                      <div style={{ flex: 2 }}>
                        <SearchSelect
                          name="objective_id"
                          value={selObjective}
                          onChange={(v) => { setSelObjective(v); setSelKr(''); }}
                          emptyLabel="— Chọn OKR —"
                          placeholder="— Chọn OKR —"
                          options={[
                            // OKR hiện tại ở kỳ khác (không có trong danh sách) → giữ làm option để không bị xoá khi lưu.
                            ...(selObjective && !objectives.some((o) => o.id === selObjective)
                              ? [{ value: selObjective, label: `${card.objective_code ? card.objective_code + ' · ' : ''}(OKR hiện tại)` }]
                              : []),
                            ...objectives.map((o) => ({
                              value: o.id,
                              label: `${o.code ? o.code + ' · ' : ''}${o.unit_name ? `[${o.unit_name}] ` : ''}${o.title}`,
                            })),
                          ]}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                        {selObjective && (
                          <Link className="btn ghost sm" href={`/objectives/${selObjective}`} target="_blank" rel="noopener" title="Mở OKR ở tab mới">
                            ↗ Mở
                          </Link>
                        )}
                      </div>
                    </div>
                    {selObjective && krOptions.length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        <SearchSelect name="key_result_id" value={selKr} onChange={setSelKr}
                          emptyLabel="— Gắn ở cấp Objective (không chọn Key Result) —"
                          options={krOptions.map((k) => ({ value: k.id, label: `${k.code ? k.code + ' · ' : ''}${k.title}` }))} />
                      </div>
                    )}
                    {(!selObjective || krOptions.length === 0) && (
                      // Không hiện chọn KR → giữ KR hiện tại nếu vẫn cùng OKR, ngược lại bỏ.
                      <input type="hidden" name="key_result_id" value={selObjective && selObjective === card.objective_id ? (card.key_result_id ?? '') : ''} />
                    )}
                  </>
                )}
                {!inOkr && (
                  <>
                    <input type="hidden" name="objective_id" value="" />
                    <input type="hidden" name="key_result_id" value="" />
                  </>
                )}
              </div>
            )}
            {canManage && objectives.length === 0 && (
              // Không có danh sách OKR để chọn → giữ nguyên liên kết OKR hiện có.
              <>
                <input type="hidden" name="objective_id" value={card.objective_id ?? ''} />
                <input type="hidden" name="key_result_id" value={card.key_result_id ?? ''} />
              </>
            )}

            {canManage && (
              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={inProject}
                    onChange={(e) => {
                      setInProject(e.target.checked);
                      if (!e.target.checked) setNewProj(false);
                    }}
                  />
                  🗂 Thuộc dự án
                </label>
                {inProject && !newProj && (
                  <>
                    <div className="row" style={{ marginTop: 6 }}>
                      <div style={{ flex: 2 }}>
                        <SearchSelect name="project_id" value={selProject} onChange={setSelProject}
                          emptyLabel="— Chọn dự án —" placeholder="— Chọn dự án —"
                          options={projects.map((p) => ({ value: p.id, label: `${p.code ? p.code + ' · ' : ''}${p.name}` }))} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                        {selProject && (
                          <Link
                            className="btn ghost sm"
                            href={`/projects/${selProject}`}
                            target="_blank"
                            rel="noopener"
                            title="Mở dự án ở tab mới (không ảnh hưởng việc đang sửa)"
                          >
                            ↗ Mở
                          </Link>
                        )}
                        <button type="button" className="btn ghost sm" onClick={() => setNewProj(true)}>
                          ＋ Dự án mới
                        </button>
                      </div>
                    </div>
                  </>
                )}
                {inProject && newProj && (
                  <>
                    <input type="hidden" name="project_id" value={card.project_id ?? ''} />
                    <div className="row" style={{ marginTop: 6 }}>
                      <div style={{ flex: 2 }}>
                        <input
                          className="i"
                          placeholder="Tên dự án mới…"
                          value={newProjName}
                          onChange={(e) => setNewProjName(e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn sm"
                          disabled={pending || !newProjName.trim()}
                          onClick={createNewProject}
                        >
                          {pending ? 'Đang tạo…' : 'Tạo & gắn'}
                        </button>
                        <button type="button" className="btn ghost sm" onClick={() => setNewProj(false)}>
                          Huỷ
                        </button>
                      </div>
                    </div>
                    <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      Tạo dự án rồi gắn việc này vào ngay. Sửa chi tiết dự án ở trang “Dự án”.
                    </p>
                  </>
                )}
                {!inProject && <input type="hidden" name="project_id" value="" />}
              </div>
            )}

            {canManage && meetings.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={inMeeting}
                    onChange={(e) => setInMeeting(e.target.checked)}
                  />
                  🗓 Thuộc cuộc họp
                </label>
                {inMeeting && (
                  <div className="row" style={{ marginTop: 6 }}>
                    <div style={{ flex: 2 }}>
                      <select
                        className="i"
                        name="meeting_id"
                        value={selMeeting}
                        onChange={(e) => setSelMeeting(e.target.value)}
                      >
                        <option value="">— Chọn cuộc họp —</option>
                        {meetings.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.code ? `${m.code} · ` : ''}
                            {m.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                      {selMeeting && (
                        <Link
                          className="btn ghost sm"
                          href={`/meetings/${selMeeting}`}
                          target="_blank"
                          rel="noopener"
                          title="Mở cuộc họp ở tab mới"
                        >
                          ↗ Mở
                        </Link>
                      )}
                    </div>
                  </div>
                )}
                {!inMeeting && <input type="hidden" name="meeting_id" value="" />}
              </div>
            )}
            {canManage && meetings.length === 0 && (
              // Không có cuộc họp nào để chọn → giữ nguyên liên kết hiện có, tránh bị xoá khi lưu.
              <input type="hidden" name="meeting_id" value={card.meeting_id ?? ''} />
            )}

            <div className="row">
              <div>
                <label className="f">Trạng thái</label>
                <select className="i" name="status" defaultValue={card.status}>
                  {COLUMNS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="f">Tiến độ %</label>
                <input
                  className="i"
                  name="progress"
                  defaultValue={card.progress}
                  disabled={hasChildren}
                  title={hasChildren ? 'Tiến độ tự cuộn từ mục con — sửa ở từng công việc con' : undefined}
                />
                {hasChildren && (
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>Tự cuộn từ mục con</div>
                )}
              </div>
              {canManage && (
                <div>
                  <label className="f">Ưu tiên</label>
                  <select className="i" name="priority" defaultValue={card.priority}>
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                  </select>
                </div>
              )}
            </div>

            {canManage && (
              <>
                <div className="row">
                  <div>
                    <label className="f">Bắt đầu</label>
                    <input className="i" type="date" name="start_on" defaultValue={card.start_on ?? ''} />
                  </div>
                  <div>
                    <label className="f">Hạn <span className="muted" style={{ fontWeight: 400 }}>— cố định</span></label>
                    {/* Hạn KHOÁ để đánh giá đúng/trễ hạn khách quan; giá trị vẫn gửi qua input ẩn. */}
                    <input className="i" type="date" defaultValue={card.due_on ?? ''} disabled
                      title="Hạn cố định để đánh giá đúng hạn — không sửa ở đây" />
                    <input type="hidden" name="due_on" value={card.due_on ?? ''} />
                  </div>
                  <div>
                    <label className="f">Hoàn thành</label>
                    <input className="i" type="date" name="done_on" defaultValue={card.done_on ?? ''}
                      title="Ngày hoàn thành thực tế (tự điền khi chuyển 'Xong', sửa được)" />
                  </div>
                </div>
                {card.due_on && card.done_on && (() => {
                  const late = card.done_on > card.due_on;
                  const days = Math.round((Date.parse(card.done_on) - Date.parse(card.due_on)) / 86400000);
                  return (
                    <p style={{ margin: '2px 0 8px', fontSize: 12.5 }}>
                      <span className={`badge ${late ? 'red' : 'green'}`}>
                        {late ? `Trễ hạn ${days} ngày` : 'Hoàn thành đúng hạn'}
                      </span>
                    </p>
                  );
                })()}
                <div className="row">
                  <div>
                    <label className="f">NS kế hoạch (VND)</label>
                    <NumberInput name="budget_planned" defaultValue={card.budget_planned} />
                  </div>
                  <div>
                    <label className="f">Thực chi (VND)</label>
                    <NumberInput name="budget_actual" defaultValue={card.budget_actual} />
                  </div>
                </div>
                <label className="f">Link minh chứng <span className="muted" style={{ fontWeight: 400 }}>(tuỳ chọn) — tài liệu/hình ảnh chứng minh kết quả</span></label>
                <input className="i" name="evidence_url" type="url" inputMode="url" defaultValue={card.evidence_url ?? ''} placeholder="https://…" />
                <label className="f">Mô tả</label>
                <textarea className="i" name="description" defaultValue={card.description ?? ''} rows={2} />
              </>
            )}

            {!canManage && (
              <>
                <label className="f">Link minh chứng <span className="muted" style={{ fontWeight: 400 }}>(tuỳ chọn) — tài liệu/hình ảnh chứng minh kết quả</span></label>
                <input className="i" name="evidence_url" type="url" inputMode="url" defaultValue={card.evidence_url ?? ''} placeholder="https://…" />
                <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
                  Bạn được giao việc này — cập nhật trạng thái, tiến độ &amp; đính minh chứng. Các trường khác do
                  người quản lý OKR chỉnh.
                </p>
              </>
            )}

            {err && (
              <div className="gnote" style={{ background: '#fee2e2', borderColor: '#dc2626', color: '#991b1b' }}>
                ❌ {err}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn" type="submit" disabled={pending}>
                {pending ? 'Đang lưu…' : 'Lưu'}
              </button>
              <button className="btn ghost" type="button" onClick={() => { setErr(null); setMode('view'); }} disabled={pending}>
                ← Xem chi tiết
              </button>
              <button className="btn ghost" type="button" onClick={onClose} disabled={pending}>
                Huỷ
              </button>
            </div>
          </form>

          {canManage && (
            <div className="okr-modal-manage">
              {manageStructure && childKinds.length > 0 &&
                (addKid ? (
                  <form onSubmit={submitChild} style={{ marginTop: 4 }}>
                    <div className="row">
                      <div style={{ maxWidth: 150 }}>
                        <label className="f">Loại mục con</label>
                        <select className="i" name="kind" defaultValue={childKinds[0]}>
                          {childKinds.map((k) => (
                            <option key={k} value={k}>
                              {KIND_LABEL[k]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: 2 }}>
                        <label className="f">Tên</label>
                        <input className="i" name="title" required placeholder="Tên tiểu dự án / công việc" />
                      </div>
                    </div>
                    <div className="row">
                      <div>
                        <label className="f">Giao cho</label>
                        <select className="i" name="owner_email" defaultValue={card.owner_email ?? ''}>
                          <option value="">— Chưa giao —</option>
                          {users.map((u) => (
                            <option key={u.email} value={u.email}>
                              {u.title ? `${u.name} · ${u.title}` : u.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="f">Hạn</label>
                        <input className="i" type="date" name="due_on" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button className="btn sm" type="submit" disabled={pending}>
                        {pending ? 'Đang thêm…' : 'Thêm mục con'}
                      </button>
                      <button className="btn ghost sm" type="button" onClick={() => setAddKid(false)}>
                        Huỷ
                      </button>
                    </div>
                  </form>
                ) : (
                  <button className="btn ghost sm" type="button" onClick={() => setAddKid(true)}>
                    ＋ Thêm mục con
                  </button>
                ))}

              <ConfirmButton
                className="btn ghost sm danger"
                label={`🗑 Xoá ${KIND_LABEL[mKind].toLowerCase()}`}
                title={`Xoá ${KIND_LABEL[mKind].toLowerCase()}`}
                message={`Xoá ${KIND_LABEL[mKind].toLowerCase()} này${card.parent_id ? '' : hasChildren ? ' và mọi mục con bên dưới' : ''}? Hành động không thể hoàn tác.`}
                confirmLabel="Xoá hẳn"
                onConfirm={doDelete}
                disabled={pending}
              />
            </div>
          )}
          </>
        )}

        <div className="okr-modal-cmt">
          <CommentThread entityType="initiative" entityId={card.id} users={users} defaultOpen canModerate={canManage} />
        </div>
      </div>
    </div>
  );
}

// ---------------- Danh sách (cây, bấm mở popup sửa) ----------------
type ListNode = Card & { depth: number };

function orderTree(cards: Card[]): ListNode[] {
  const childrenOf = new Map<string, Card[]>();
  const byId = new Map(cards.map((c) => [c.id, c]));
  const roots: Card[] = [];
  for (const c of cards) {
    if (c.parent_id && byId.has(c.parent_id)) {
      const arr = childrenOf.get(c.parent_id) ?? [];
      arr.push(c);
      childrenOf.set(c.parent_id, arr);
    } else {
      roots.push(c);
    }
  }
  const out: ListNode[] = [];
  const walk = (c: Card, depth: number) => {
    out.push({ ...c, depth });
    (childrenOf.get(c.id) ?? []).forEach((k) => walk(k, depth + 1));
  };
  roots.forEach((r) => walk(r, 0));
  return out;
}

function ListView({
  initiatives,
  childParents,
  canEdit,
  context,
  onOpen,
}: {
  initiatives: Card[];
  childParents: Set<string>;
  canEdit: (c: Card) => boolean;
  context: Ctx;
  onOpen: (c: Card) => void;
}) {
  const rows = useMemo(() => orderTree(initiatives), [initiatives]);
  if (initiatives.length === 0)
    return <p className="muted">Chưa có dự án hay công việc nào.</p>;
  return (
    <>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>
        Bấm vào một dòng để mở &amp; sửa (đổi đơn vị/người giao/trạng thái/tiến độ, thêm mục con, xoá).
      </p>
      <div className="il-list">
        {rows.map((n) => {
          const editable = canEdit(n);
          return (
            <div
              key={n.id}
              className="il-row"
              style={{ paddingLeft: 10 + n.depth * 22 }}
              onClick={() => onOpen(n)}
              title={editable ? 'Bấm để sửa' : 'Bấm để xem'}
            >
              <div className="il-main">
                <div className="il-ttl">
                  {effKind(n, childParents) !== 'action' && (
                    <span className={`badge ${KIND_CLS[effKind(n, childParents)]}`} style={{ fontSize: 10.5 }}>
                      {KIND_LABEL[effKind(n, childParents)]}
                    </span>
                  )}
                  {n.code && <span className="okr-code">{n.code}</span>}
                  <b>{n.title}</b>
                  <span className={`badge ${STATUS_CLS[n.status]}`} style={{ fontSize: 10.5 }}>
                    {STATUS_LABEL[n.status]}
                  </span>
                  {n.priority === 'high' && (
                    <span className="badge red" style={{ fontSize: 10.5 }}>
                      Ưu tiên
                    </span>
                  )}
                  <DeadlineBadge c={n} />
                </div>
                <div className="il-meta">
                  <span className="il-metatext">
                    {n.owner_name ? `👤 ${n.owner_name}` : 'Chưa giao'}
                    {n.unit_name ? ` · 🏢 ${n.unit_name}` : ''}
                    {n.due_on ? ` · Hạn ${fmtD(n.due_on)}` : ''}
                  </span>
                  <ContextChips c={n} context={context} />
                </div>
              </div>
              <div className="il-prog">
                <div className="pbar">
                  <span
                    style={{
                      width: `${Math.max(0, Math.min(100, n.progress))}%`,
                      background: n.progress >= 70 ? '#1f9d55' : n.progress >= 40 ? '#d97706' : '#dc2626',
                    }}
                  />
                </div>
                <span className="mono">{n.progress.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ---------------- Kanban (kéo-thả + bấm mở popup) ----------------
function KanbanView({
  initiatives,
  childParents,
  canEdit,
  context,
  move,
  onOpen,
}: {
  initiatives: Card[];
  childParents: Set<string>;
  canEdit: (c: Card) => boolean;
  context: Ctx;
  move: (id: string, status: Status) => Promise<void>;
  onOpen: (c: Card) => void;
}) {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>(initiatives);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<Status | null>(null);
  const [, startTransition] = useTransition();
  const lastDragEnd = useRef<number>(0);
  useEffect(() => setCards(initiatives), [initiatives]);

  const titleById = useMemo(() => {
    const m = new Map<string, string>();
    initiatives.forEach((c) => m.set(c.id, c.title));
    return m;
  }, [initiatives]);

  const drop = (status: Status) => {
    const id = dragId;
    setOverCol(null);
    setDragId(null);
    if (!id) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.status === status || !canEdit(card)) return;
    setCards((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status, progress: status === 'done' ? 100 : c.progress } : c,
      ),
    );
    startTransition(async () => {
      try {
        await move(id, status);
        router.refresh();
      } catch (e) {
        setCards(initiatives);
        alert('Không cập nhật được: ' + (e instanceof Error ? e.message : String(e)));
      }
    });
  };

  if (initiatives.length === 0)
    return <p className="muted">Chưa có dự án hay công việc nào để xếp bảng.</p>;

  return (
    <>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>
        Bấm vào thẻ để mở &amp; sửa. Kéo–thả thẻ giữa các cột để đổi trạng thái. (Chỉ sửa/kéo được việc
        bạn quản lý hoặc được giao.)
      </p>
      <div className="kb-board">
        {COLUMNS.map((col) => {
          const list = cards.filter((c) => c.status === col);
          return (
            <div
              key={col}
              className={`kb-col ${overCol === col ? 'over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                if (overCol !== col) setOverCol(col);
              }}
              onDragLeave={() => setOverCol((o) => (o === col ? null : o))}
              onDrop={() => drop(col)}
            >
              <div className="kb-col-h" style={{ borderTopColor: STATUS_COLOR[col] }}>
                {STATUS_LABEL[col]} <span className="kb-count">{list.length}</span>
              </div>
              <div className="kb-col-body">
                {list.map((c) => {
                  const editable = canEdit(c);
                  const dl = deadlineInfo(c).state;
                  return (
                    <div
                      key={c.id}
                      className={`kb-card ${dragId === c.id ? 'dragging' : ''} ${editable ? '' : 'locked'} ${dl === 'overdue' ? 'kb-over' : dl === 'today' || dl === 'soon' ? 'kb-soon' : ''}`}
                      draggable={editable}
                      onDragStart={(e) => {
                        setDragId(c.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        lastDragEnd.current = Date.now();
                        setDragId(null);
                      }}
                      onClick={() => {
                        // Bỏ qua "click" phát sinh ngay sau khi thả (drag).
                        if (Date.now() - lastDragEnd.current < 250) return;
                        onOpen(c);
                      }}
                      title={editable ? 'Bấm để sửa · kéo để đổi trạng thái' : 'Bấm để xem'}
                    >
                      {(effKind(c, childParents) !== 'action' || c.priority === 'high') && (
                        <div className="kb-card-top">
                          {effKind(c, childParents) !== 'action' && (
                            <span className={`badge ${KIND_CLS[effKind(c, childParents)]}`} style={{ fontSize: 10 }}>
                              {KIND_LABEL[effKind(c, childParents)]}
                            </span>
                          )}
                          {c.priority === 'high' && (
                            <span className="badge red" style={{ fontSize: 10 }}>
                              Ưu tiên
                            </span>
                          )}
                        </div>
                      )}
                      <div className="kb-card-title">
                        {c.code && <span className="okr-code" style={{ fontSize: 10, marginRight: 4 }}>{c.code}</span>}
                        {c.title}
                      </div>
                      {c.parent_id && titleById.get(c.parent_id) && (
                        <div className="kb-card-parent">↳ {titleById.get(c.parent_id)}</div>
                      )}
                      {c.unit_name && <div className="kb-card-unit">🏢 {c.unit_name}</div>}
                      <div className="kb-card-ctx">
                        <ContextChips c={c} context={context} />
                      </div>
                      <div className="kb-card-foot">
                        <span>{c.owner_name || 'Chưa giao'}</span>
                        {c.due_on && <span>· {fmtD(c.due_on)}</span>}
                        <span className="kb-card-prog">{c.progress.toFixed(0)}%</span>
                      </div>
                      {deadlineInfo(c).state !== 'none' && (
                        <div className="kb-card-dl">
                          <DeadlineBadge c={c} />
                        </div>
                      )}
                      <div className="kb-mini">
                        <span style={{ width: `${Math.max(0, Math.min(100, c.progress))}%` }} />
                      </div>
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

// ---------------- Dòng thời gian (Gantt, bấm mở popup) ----------------
function TimelineView({
  initiatives,
  childParents,
  canEdit,
  onOpen,
}: {
  initiatives: Card[];
  childParents: Set<string>;
  canEdit: (c: Card) => boolean;
  onOpen: (c: Card) => void;
}) {
  const dated = initiatives.filter((c) => c.start_on || c.due_on);
  const undated = initiatives.filter((c) => !c.start_on && !c.due_on);

  if (dated.length === 0)
    return (
      <p className="muted">
        Chưa có việc nào đặt lịch (ngày bắt đầu/hạn). Thêm hạn cho việc để hiện trên dòng thời gian.
      </p>
    );

  // Khoảng thời gian bao trùm.
  const dates: Date[] = [];
  dated.forEach((c) => {
    if (c.start_on) dates.push(parseD(c.start_on));
    if (c.due_on) dates.push(parseD(c.due_on));
  });
  let min = dates[0];
  let max = dates[0];
  dates.forEach((d) => {
    if (d < min) min = d;
    if (d > max) max = d;
  });
  // Đệm 2 ngày mỗi bên.
  min = new Date(min.getTime() - 2 * 86400000);
  max = new Date(max.getTime() + 2 * 86400000);
  const total = Math.max(1, dayDiff(min, max));

  // Mốc tháng.
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
        {/* Trục tháng */}
        <div className="gantt-axis">
          <div className="gantt-labelcol" />
          <div className="gantt-track gantt-axis-track">
            {ticks.map((tk, i) => (
              <span key={i} className="gantt-tick" style={{ left: `${tk.left}%` }}>
                {tk.label}
              </span>
            ))}
            {todayLeft !== null && (
              <span className="gantt-today" style={{ left: `${todayLeft}%` }} title="Hôm nay" />
            )}
          </div>
        </div>
        {dated.map((c) => {
          const s = c.start_on ? parseD(c.start_on) : parseD(c.due_on!);
          const e = c.due_on ? parseD(c.due_on) : parseD(c.start_on!);
          const left = (dayDiff(min, s) / total) * 100;
          const width = Math.max(1.5, (Math.max(0, dayDiff(s, e)) / total) * 100);
          const dl = deadlineInfo(c).state;
          return (
            <div
              key={c.id}
              className="gantt-row"
              onClick={() => onOpen(c)}
              style={{ cursor: 'pointer' }}
              title={canEdit(c) ? 'Bấm để sửa' : 'Bấm để xem'}
            >
              <div className="gantt-labelcol" title={c.title}>
                {effKind(c, childParents) !== 'action' && (
                  <><span className={`badge ${KIND_CLS[effKind(c, childParents)]}`} style={{ fontSize: 10 }}>
                    {KIND_LABEL[effKind(c, childParents)]}
                  </span>{' '}</>
                )}
                {c.code && <span className="okr-code" style={{ fontSize: 9.5, marginRight: 3 }}>{c.code}</span>}
                {dl !== 'none' && <><DeadlineBadge c={c} /> </>}
                <span className="gantt-name">{c.title}</span>
              </div>
              <div className="gantt-track">
                {todayLeft !== null && (
                  <span className="gantt-today" style={{ left: `${todayLeft}%` }} />
                )}
                <span
                  className={`gantt-bar ${dl === 'overdue' ? 'gantt-over' : dl === 'today' || dl === 'soon' ? 'gantt-soon' : ''}`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    background: STATUS_COLOR[c.status],
                  }}
                  title={`${c.title} · ${STATUS_LABEL[c.status]} · ${fmtD(c.start_on)}${c.due_on ? '→' + fmtD(c.due_on) : ''}`}
                >
                  <span className="gantt-bar-fill" style={{ width: `${Math.max(0, Math.min(100, c.progress))}%` }} />
                  <span className="gantt-bar-txt">{c.progress.toFixed(0)}%</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {undated.length > 0 && (
        <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
          Chưa đặt lịch ({undated.length}): {undated.map((c) => c.title).join(' · ')}
        </p>
      )}
    </div>
  );
}
