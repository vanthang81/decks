'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CalEvent, CalEventType } from '@/lib/calendar';

type Kr = { id: string; code: string | null; title: string };
type ObjOpt = { id: string; code: string | null; title: string; unit_name: string | null; krs: Kr[] };
type PersonOpt = { email: string; name: string };
type ProjOpt = { id: string; code: string | null; name: string };

const WD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WD_FULL = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
const pad = (n: number) => String(n).padStart(2, '0');
const TYPE_META: Record<CalEventType, { label: string; cls: string }> = {
  task: { label: 'Công việc', cls: 'cal-task' },
  meeting: { label: 'Cuộc họp', cls: 'cal-meeting' },
  checkin: { label: 'Check-in', cls: 'cal-checkin' },
};

export default function CalendarView({
  year, month0, monthLabel, todayStr, prevM, nextM,
  events, scope, canAll,
  users, objectives, projects, defaultOwner,
  createMeeting, createTask,
}: {
  year: number; month0: number; monthLabel: string; todayStr: string;
  prevM: string; nextM: string;
  events: CalEvent[]; scope: 'mine' | 'all'; canAll: boolean;
  users: PersonOpt[]; objectives: ObjOpt[]; projects: ProjOpt[]; defaultOwner: string;
  createMeeting: (fd: FormData) => Promise<void>;
  createTask: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [dayOpen, setDayOpen] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of events) {
      const arr = m.get(e.date) ?? [];
      arr.push(e);
      m.set(e.date, arr);
    }
    return m;
  }, [events]);

  // Lưới tháng: ô trống dẫn đầu (đến Thứ 2) + ngày trong tháng + đệm cuối cho đủ hàng 7.
  const cells = useMemo(() => {
    const daysInMonth = new Date(year, month0 + 1, 0).getDate();
    const startWeekday = (new Date(year, month0, 1).getDay() + 6) % 7;
    const c: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) c.push(null);
    for (let d = 1; d <= daysInMonth; d++) c.push(d);
    while (c.length % 7 !== 0) c.push(null);
    return c;
  }, [year, month0]);

  const q = (m: string) => `/calendar?m=${m}${scope === 'all' ? '&scope=all' : ''}`;
  const scopeHref = (s: 'mine' | 'all') => `/calendar?m=${year}-${pad(month0 + 1)}${s === 'all' ? '&scope=all' : ''}`;

  const dayEvents = dayOpen ? byDate.get(dayOpen) ?? [] : [];
  const dayLabel = dayOpen
    ? `${WD_FULL[(new Date(dayOpen + 'T00:00:00').getDay() + 6) % 7]}, ${dayOpen.slice(8, 10)}/${dayOpen.slice(5, 7)}/${dayOpen.slice(0, 4)}`
    : '';

  useEffect(() => {
    if (!dayOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDayOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dayOpen]);

  return (
    <>
      <div className="flexbtw flexbtw-top">
        <div className="cal-scope" role="group" aria-label="Phạm vi hiển thị">
          <Link className={`cal-scope-btn${scope === 'mine' ? ' on' : ''}`} href={scopeHref('mine')}>Của tôi</Link>
          {canAll && <Link className={`cal-scope-btn${scope === 'all' ? ' on' : ''}`} href={scopeHref('all')}>Tất cả bộ phận</Link>}
        </div>
        <div className="cal-nav">
          <Link className="btn ghost sm" href={q(prevM)} aria-label="Tháng trước">←</Link>
          <b className="cal-month">{monthLabel}</b>
          <Link className="btn ghost sm" href={q(nextM)} aria-label="Tháng sau">→</Link>
          <Link className="btn ghost sm" href={scope === 'all' ? '/calendar?scope=all' : '/calendar'}>Hôm nay</Link>
        </div>
      </div>

      <div className="cal-legend">
        {(Object.keys(TYPE_META) as CalEventType[]).map((t) => (
          <span key={t} className="cal-leg"><i className={TYPE_META[t].cls} /> {TYPE_META[t].label}</span>
        ))}
        <span className="cal-leg-hint">Bấm vào một ngày để xem chi tiết &amp; thêm cuộc họp / công việc.</span>
      </div>

      <div className="card cal-card">
        <div className="cal-wdrow">
          {WD.map((w) => <div key={w} className="cal-wd">{w}</div>)}
        </div>
        <div className="cal-grid">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} className="cal-cell cal-empty" />;
            const ds = `${year}-${pad(month0 + 1)}-${pad(d)}`;
            const evs = byDate.get(ds) ?? [];
            const isToday = ds === todayStr;
            return (
              <button
                key={i}
                type="button"
                className={`cal-cell${isToday ? ' cal-today' : ''}${evs.length ? ' cal-has' : ''}`}
                onClick={() => setDayOpen(ds)}
                title={evs.length ? `${evs.length} sự kiện — bấm để xem` : 'Bấm để thêm cuộc họp / công việc'}
              >
                <span className="cal-day">{d}</span>
                <span className="cal-events">
                  {evs.slice(0, 3).map((e, j) => (
                    <span key={j} className={`cal-ev ${TYPE_META[e.type].cls}`}>{e.title}</span>
                  ))}
                  {evs.length > 3 && <span className="cal-more">+{evs.length - 3} nữa</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {dayOpen && (
        <div className="okr-modal-backdrop" onMouseDown={() => setDayOpen(null)}>
          <div className="okr-modal cal-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="okr-modal-head">
              <b>{dayLabel}</b>
              <button type="button" className="okr-modal-x" onClick={() => setDayOpen(null)} aria-label="Đóng">✕</button>
            </div>

            <div className="cal-modal-body">
              {dayEvents.length === 0 ? (
                <p className="muted" style={{ margin: '4px 0 10px' }}>Không có sự kiện trong ngày này.</p>
              ) : (
                <ul className="cal-daylist">
                  {dayEvents.map((e, j) => (
                    <li key={j} className="cal-dayitem">
                      <span className={`cal-dot ${TYPE_META[e.type].cls}`} />
                      <Link href={e.href} className="cal-dayitem-main" onClick={() => setDayOpen(null)}>
                        <span className="cal-dayitem-ttl">{e.title}</span>
                        <span className="cal-dayitem-sub">
                          {TYPE_META[e.type].label}{e.sub ? ` · ${e.sub}` : ''}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <QuickAdd date={dayOpen} users={users} objectives={objectives} projects={projects}
                defaultOwner={defaultOwner} createMeeting={createMeeting} createTask={createTask}
                onDone={() => { setDayOpen(null); router.refresh(); }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function QuickAdd({
  date, users, objectives, projects, defaultOwner, createMeeting, createTask, onDone,
}: {
  date: string; users: PersonOpt[]; objectives: ObjOpt[]; projects: ProjOpt[]; defaultOwner: string;
  createMeeting: (fd: FormData) => Promise<void>;
  createTask: (fd: FormData) => Promise<void>;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<'none' | 'meeting' | 'task'>('none');
  const [objId, setObjId] = useState('');
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const krs = useMemo(() => objectives.find((o) => o.id === objId)?.krs ?? [], [objId, objectives]);

  const submit = (e: React.FormEvent<HTMLFormElement>, kind: 'meeting' | 'task') => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr(null);
    startTransition(async () => {
      try {
        if (kind === 'meeting') await createMeeting(fd); else await createTask(fd);
        onDone();
      } catch (e2) {
        // redirect() ném NEXT_REDIRECT — coi như thành công (điều hướng sang trang mới).
        const msg = e2 instanceof Error ? e2.message : String(e2);
        if (msg.includes('NEXT_REDIRECT')) return;
        setErr(msg);
      }
    });
  };

  if (mode === 'none') {
    return (
      <div className="cal-add-row">
        <button type="button" className="btn sm" onClick={() => setMode('meeting')}>＋ Cuộc họp</button>
        <button type="button" className="btn sm ghost" onClick={() => setMode('task')}>＋ Công việc</button>
      </div>
    );
  }

  return (
    <div className="cal-add-form">
      <div className="cal-add-tabs">
        <button type="button" className={`cal-add-tab${mode === 'meeting' ? ' on' : ''}`} onClick={() => setMode('meeting')}>Cuộc họp</button>
        <button type="button" className={`cal-add-tab${mode === 'task' ? ' on' : ''}`} onClick={() => setMode('task')}>Công việc</button>
        <button type="button" className="cal-add-close" onClick={() => { setMode('none'); setErr(null); }}>Đóng</button>
      </div>

      {mode === 'meeting' ? (
        <form onSubmit={(e) => submit(e, 'meeting')}>
          <input type="hidden" name="meeting_at" value={`${date}T09:00`} />
          <label className="f">Tiêu đề cuộc họp *</label>
          <input className="i" name="title" required placeholder="VD: Họp check-in dự án" />
          <div className="row">
            <div>
              <label className="f">Giờ họp</label>
              <input className="i" type="time" defaultValue="09:00"
                onChange={(ev) => {
                  const hidden = ev.currentTarget.form?.querySelector('input[type=hidden][name=meeting_at]') as HTMLInputElement | null;
                  if (hidden) hidden.value = `${date}T${ev.currentTarget.value || '09:00'}`;
                }} />
            </div>
            <div>
              <label className="f">Chủ trì</label>
              <select className="i" name="owner_email" defaultValue={defaultOwner}>
                {users.map((u) => <option key={u.email} value={u.email}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <label className="f">Địa điểm</label>
          <input className="i" name="location" placeholder="Phòng họp / online" />
          {err && <p className="form-err">{err}</p>}
          <div className="cal-add-actions">
            <button className="btn" type="submit" disabled={pending}>{pending ? 'Đang tạo…' : 'Tạo cuộc họp'}</button>
          </div>
        </form>
      ) : (
        <form onSubmit={(e) => submit(e, 'task')}>
          <input type="hidden" name="due_on" value={date} />
          <input type="hidden" name="kind" value="action" />
          <label className="f">Gắn vào OKR (bắt buộc)</label>
          <select className="i" name="objective_id" required value={objId} onChange={(e) => setObjId(e.target.value)}>
            <option value="">— Chọn Objective —</option>
            {objectives.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code ? `${o.code} · ` : ''}{o.unit_name ? `[${o.unit_name}] ` : ''}{o.title}
              </option>
            ))}
          </select>
          <label className="f">Gắn vào Key Result (tuỳ chọn)</label>
          <select className="i" name="key_result_id" defaultValue="" disabled={!objId}>
            <option value="">— Ở cấp Objective —</option>
            {krs.map((k) => <option key={k.id} value={k.id}>{k.code ? `${k.code} · ` : ''}{k.title}</option>)}
          </select>
          <label className="f">Tên việc *</label>
          <input className="i" name="title" required placeholder="VD: Chuẩn bị tài liệu họp" />
          <div className="row">
            <div>
              <label className="f">Giao cho</label>
              <select className="i" name="owner_email" defaultValue={defaultOwner}>
                <option value="">— Chưa giao —</option>
                {users.map((u) => <option key={u.email} value={u.email}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="f">Thuộc dự án (tuỳ chọn)</label>
              <select className="i" name="project_id" defaultValue="">
                <option value="">— Không gắn —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.code ? `${p.code} · ` : ''}{p.name}</option>)}
              </select>
            </div>
          </div>
          {err && <p className="form-err">{err}</p>}
          <div className="cal-add-actions">
            <button className="btn" type="submit" disabled={pending}>{pending ? 'Đang tạo…' : 'Tạo công việc'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
