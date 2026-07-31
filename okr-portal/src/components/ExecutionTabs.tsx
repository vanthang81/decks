'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

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
  status: Status;
  priority: 'low' | 'medium' | 'high';
  progress: number;
  start_on: string | null;
  due_on: string | null;
  budget_planned: number;
  budget_actual: number;
};

export type PersonOpt = { email: string; name: string };
export type UnitOpt = { id: string; name: string; type: 'company' | 'division' | 'department' };

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

export default function ExecutionTabs({
  initiatives,
  canManage,
  currentEmail,
  move,
  save,
  users,
  units,
  children,
}: {
  initiatives: Card[];
  canManage: boolean;
  currentEmail: string;
  move: (id: string, status: Status) => Promise<void>;
  save: (fd: FormData) => Promise<void>;
  users: PersonOpt[];
  units: UnitOpt[];
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

      {view === 'list' && <div>{children}</div>}
      {view === 'kanban' && (
        <KanbanView
          initiatives={initiatives}
          canEdit={canEdit}
          move={move}
          onOpen={(c) => setEditing(c)}
        />
      )}
      {view === 'timeline' && (
        <TimelineView initiatives={initiatives} canEdit={canEdit} onOpen={(c) => setEditing(c)} />
      )}

      {editing && (
        <EditModal
          card={editing}
          canManage={canManage}
          canEdit={canEdit(editing)}
          users={users}
          units={units}
          save={save}
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
  users,
  units,
  save,
  onClose,
}: {
  card: Card;
  canManage: boolean;
  canEdit: boolean;
  users: PersonOpt[];
  units: UnitOpt[];
  save: (fd: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const divisions = units.filter((u) => u.type === 'division');
  const departments = units.filter((u) => u.type === 'department');

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('id', card.id);
    setErr(null);
    startTransition(async () => {
      try {
        await save(fd);
        router.refresh();
        onClose();
      } catch (e2) {
        setErr(e2 instanceof Error ? e2.message : String(e2));
      }
    });
  };

  return (
    <div className="okr-modal-backdrop" onMouseDown={onClose}>
      <div className="okr-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="okr-modal-head">
          <div>
            <span className={`badge ${KIND_CLS[card.kind]}`} style={{ fontSize: 11 }}>
              {KIND_LABEL[card.kind]}
            </span>{' '}
            {card.code && <span className="okr-code">{card.code}</span>}
          </div>
          <button type="button" className="okr-modal-x" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        {!canEdit ? (
          <>
            <div style={{ fontWeight: 600, marginTop: 4 }}>{card.title}</div>
            <p className="muted" style={{ margin: '8px 0 0' }}>
              Bạn không có quyền sửa việc này (chỉ người quản lý OKR hoặc người được giao mới sửa được).
            </p>
            <div style={{ marginTop: 14 }}>
              <button className="btn ghost" type="button" onClick={onClose}>
                Đóng
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <label className="f">Tên</label>
            <input className="i" name="title" defaultValue={card.title} required disabled={!canManage} />

            {canManage && (
              <div className="row">
                <div>
                  <label className="f">Đơn vị phụ trách (Khối / Phòng)</label>
                  <select className="i" name="unit_id" defaultValue={card.unit_id ?? ''}>
                    <option value="">— Không gắn đơn vị —</option>
                    {divisions.length > 0 && (
                      <optgroup label="Khối">
                        {divisions.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {departments.length > 0 && (
                      <optgroup label="Phòng ban">
                        {departments.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div>
                  <label className="f">Giao cho (cá nhân)</label>
                  <select className="i" name="owner_email" defaultValue={card.owner_email ?? ''}>
                    <option value="">— Chưa giao —</option>
                    {users.map((u) => (
                      <option key={u.email} value={u.email}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
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
                <input className="i" name="progress" defaultValue={card.progress} />
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
                    <label className="f">Hạn</label>
                    <input className="i" type="date" name="due_on" defaultValue={card.due_on ?? ''} />
                  </div>
                  <div>
                    <label className="f">NS kế hoạch (VND)</label>
                    <input className="i" name="budget_planned" defaultValue={card.budget_planned} />
                  </div>
                  <div>
                    <label className="f">Thực chi (VND)</label>
                    <input className="i" name="budget_actual" defaultValue={card.budget_actual} />
                  </div>
                </div>
                <label className="f">Mô tả</label>
                <textarea className="i" name="description" defaultValue={card.description ?? ''} rows={2} />
              </>
            )}

            {!canManage && (
              <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
                Bạn được giao việc này — chỉ cập nhật được trạng thái &amp; tiến độ. Các trường khác do
                người quản lý OKR chỉnh.
              </p>
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
              <button className="btn ghost" type="button" onClick={onClose} disabled={pending}>
                Huỷ
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ---------------- Kanban (kéo-thả + bấm mở popup) ----------------
function KanbanView({
  initiatives,
  canEdit,
  move,
  onOpen,
}: {
  initiatives: Card[];
  canEdit: (c: Card) => boolean;
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
                  return (
                    <div
                      key={c.id}
                      className={`kb-card ${dragId === c.id ? 'dragging' : ''} ${editable ? '' : 'locked'}`}
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
                      <div className="kb-card-top">
                        <span className={`badge ${KIND_CLS[c.kind]}`} style={{ fontSize: 10 }}>
                          {KIND_LABEL[c.kind]}
                        </span>
                        {c.priority === 'high' && (
                          <span className="badge red" style={{ fontSize: 10 }}>
                            Ưu tiên
                          </span>
                        )}
                      </div>
                      <div className="kb-card-title">
                        {c.code && <span className="okr-code" style={{ fontSize: 10, marginRight: 4 }}>{c.code}</span>}
                        {c.title}
                      </div>
                      {c.parent_id && titleById.get(c.parent_id) && (
                        <div className="kb-card-parent">↳ {titleById.get(c.parent_id)}</div>
                      )}
                      {c.unit_name && <div className="kb-card-unit">🏢 {c.unit_name}</div>}
                      <div className="kb-card-foot">
                        <span>{c.owner_name || 'Chưa giao'}</span>
                        {c.due_on && <span>· {fmtD(c.due_on)}</span>}
                        <span className="kb-card-prog">{c.progress.toFixed(0)}%</span>
                      </div>
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
  canEdit,
  onOpen,
}: {
  initiatives: Card[];
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
          return (
            <div
              key={c.id}
              className="gantt-row"
              onClick={() => onOpen(c)}
              style={{ cursor: 'pointer' }}
              title={canEdit(c) ? 'Bấm để sửa' : 'Bấm để xem'}
            >
              <div className="gantt-labelcol" title={c.title}>
                <span className={`badge ${KIND_CLS[c.kind]}`} style={{ fontSize: 10 }}>
                  {KIND_LABEL[c.kind]}
                </span>{' '}
                {c.code && <span className="okr-code" style={{ fontSize: 9.5, marginRight: 3 }}>{c.code}</span>}
                <span className="gantt-name">{c.title}</span>
              </div>
              <div className="gantt-track">
                {todayLeft !== null && (
                  <span className="gantt-today" style={{ left: `${todayLeft}%` }} />
                )}
                <span
                  className="gantt-bar"
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
