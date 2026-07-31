'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
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
  owner_email: string | null;
  owner_name: string | null;
  status: Status;
  priority: 'low' | 'medium' | 'high';
  progress: number;
  start_on: string | null;
  due_on: string | null;
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

export default function ExecutionTabs({
  initiatives,
  canManage,
  currentEmail,
  move,
  children,
}: {
  initiatives: Card[];
  canManage: boolean;
  currentEmail: string;
  move: (id: string, status: Status) => Promise<void>;
  children: React.ReactNode;
}) {
  const [view, setView] = useState<View>('list');
  useEffect(() => {
    const v = (typeof window !== 'undefined' && localStorage.getItem('okrExecView')) as View | null;
    if (v === 'list' || v === 'kanban' || v === 'timeline') setView(v);
  }, []);
  const pick = (v: View) => {
    setView(v);
    if (typeof window !== 'undefined') localStorage.setItem('okrExecView', v);
  };

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
          canManage={canManage}
          currentEmail={currentEmail}
          move={move}
        />
      )}
      {view === 'timeline' && <TimelineView initiatives={initiatives} />}
    </div>
  );
}

// ---------------- Kanban (kéo-thả) ----------------
function KanbanView({
  initiatives,
  canManage,
  currentEmail,
  move,
}: {
  initiatives: Card[];
  canManage: boolean;
  currentEmail: string;
  move: (id: string, status: Status) => Promise<void>;
}) {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>(initiatives);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<Status | null>(null);
  const [, startTransition] = useTransition();
  useEffect(() => setCards(initiatives), [initiatives]);

  const titleById = useMemo(() => {
    const m = new Map<string, string>();
    initiatives.forEach((c) => m.set(c.id, c.title));
    return m;
  }, [initiatives]);

  const emailLc = currentEmail.toLowerCase();
  const canEdit = (c: Card) =>
    canManage || (!!c.owner_email && c.owner_email.toLowerCase() === emailLc);

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
        Kéo–thả thẻ giữa các cột để đổi trạng thái. (Chỉ kéo được việc bạn quản lý hoặc được giao.)
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
                      onDragEnd={() => setDragId(null)}
                      title={editable ? 'Kéo để đổi trạng thái' : 'Bạn không có quyền đổi'}
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

// ---------------- Dòng thời gian (Gantt read-only) ----------------
function TimelineView({ initiatives }: { initiatives: Card[] }) {
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
            <div key={c.id} className="gantt-row">
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
