'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NavIcon from '@/components/NavIcon';
import { ProgressBar } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import type { Initiative } from '@/lib/initiatives';

// Nhãn/màu khai lại (KHÔNG import runtime từ lib/initiatives → tránh kéo pg vào client bundle).
type Status = 'todo' | 'in_progress' | 'blocked' | 'done' | 'canceled';
const STATUS_LABEL: Record<Status, string> = {
  todo: 'Chưa làm', in_progress: 'Đang làm', blocked: 'Vướng', done: 'Xong', canceled: 'Huỷ',
};
const STATUS_CLS: Record<Status, string> = { todo: 'gray', in_progress: 'blue', blocked: 'red', done: 'green', canceled: 'gray' };
const PRIO_LABEL: Record<string, string> = { high: 'Cao', medium: 'Trung bình', low: 'Thấp' };

type Bucket = 'overdue' | 'doing' | 'todo' | 'done';
const BUCKETS: { key: Bucket; label: string; color: string }[] = [
  { key: 'overdue', label: 'Đã quá hạn', color: '#dc2626' },
  { key: 'doing', label: 'Đang làm', color: '#2563eb' },
  { key: 'todo', label: 'Chưa làm', color: '#94a3b8' },
  { key: 'done', label: 'Đã hoàn thành', color: '#16a34a' },
];

const todayISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

function bucketOf(t: Initiative, today: string): Bucket {
  if (t.status === 'done') return 'done';
  if (t.due_on && t.due_on < today) return 'overdue';
  if (t.status === 'in_progress' || t.status === 'blocked') return 'doing';
  return 'todo';
}

export default function MyTasksBoard({
  tasks,
  update,
}: {
  tasks: Initiative[];
  update: (fd: FormData) => Promise<void>;  // updateOwnTaskProgressAction
}) {
  const today = todayISO();
  const [open, setOpen] = useState<Initiative | null>(null);
  // Thu gọn nhóm — MẶC ĐỊNH thu gọn "Đã hoàn thành" (CFO 09/09); nhớ theo trình duyệt.
  const [collapsed, setCollapsed] = useState<Record<Bucket, boolean>>({ overdue: false, doing: false, todo: false, done: true });
  useEffect(() => {
    setCollapsed((c) => {
      const next = { ...c };
      for (const b of BUCKETS) {
        try {
          const v = localStorage.getItem(`my_grp_col:${b.key}`);
          if (v === '0' || v === '1') next[b.key] = v === '1';
        } catch {}
      }
      return next;
    });
  }, []);
  const toggle = (k: Bucket) =>
    setCollapsed((c) => {
      const next = { ...c, [k]: !c[k] };
      try { localStorage.setItem(`my_grp_col:${k}`, next[k] ? '1' : '0'); } catch {}
      return next;
    });

  const groups = useMemo(() => {
    const m: Record<Bucket, Initiative[]> = { overdue: [], doing: [], todo: [], done: [] };
    for (const t of tasks) m[bucketOf(t, today)].push(t);
    // Sắp xếp: nhóm mở việc theo HẠN gần nhất lên đầu (null xuống cuối);
    // nhóm hoàn thành theo ngày hoàn thành mới nhất lên đầu.
    const dueAsc = (a: Initiative, b: Initiative) => (a.due_on ?? '9999-12-31').localeCompare(b.due_on ?? '9999-12-31');
    const doneDesc = (a: Initiative, b: Initiative) => (b.done_on ?? '').localeCompare(a.done_on ?? '');
    m.overdue.sort(dueAsc); m.doing.sort(dueAsc); m.todo.sort(dueAsc); m.done.sort(doneDesc);
    return m;
  }, [tasks, today]);

  if (tasks.length === 0) {
    return <p className="muted" style={{ margin: 0 }}>Bạn chưa có công việc nào.</p>;
  }

  return (
    <div className="mytb">
      {BUCKETS.map((b) => {
        const list = groups[b.key];
        if (list.length === 0) return null;
        const isCol = collapsed[b.key];
        return (
          <section key={b.key} className="mytb-group">
            <button type="button" className={`mytb-ghead${isCol ? ' col' : ''}`} onClick={() => toggle(b.key)} aria-expanded={!isCol}>
              <span className="mytb-chev"><NavIcon name="chevron" /></span>
              <span className="mytb-dot" style={{ background: b.color }} />
              <span className="mytb-gname">{b.label}</span>
              <span className="mytb-gcount">{list.length}</span>
            </button>
            {!isCol && (
              <div className="mytb-list">
                {list.map((t) => {
                  const overdue = b.key === 'overdue';
                  return (
                    <div
                      key={t.id}
                      className="mytb-row"
                      role="button"
                      tabIndex={0}
                      onClick={() => setOpen(t)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(t); } }}
                    >
                      <div className="mytb-row-main">
                        <div className="mytb-title">
                          {t.code && <span className="okr-code" style={{ marginRight: 6 }}>{t.code}</span>}
                          {t.title}
                          {t.priority === 'high' && <span className="badge red mytb-mini">Ưu tiên cao</span>}
                        </div>
                        <div className="mytb-sub">
                          <span className={`badge ${STATUS_CLS[t.status as Status]}`}>{STATUS_LABEL[t.status as Status]}</span>
                          {t.objective_code && <span className="mytb-chip">🎯 {t.objective_code}</span>}
                          {t.project_id && (
                            <Link
                              href={`/projects/${t.project_id}`}
                              className="mytb-projlink"
                              onClick={(e) => e.stopPropagation()}
                              title={`Mở dự án: ${t.project_name || t.project_code}`}
                            >
                              🗂 {t.project_code ? `${t.project_code} · ` : ''}{t.project_name || t.project_code}
                            </Link>
                          )}
                          {t.due_on && (
                            <span className={overdue ? 'mytb-due over' : 'mytb-due'}>
                              📅 {fmtDate(t.due_on)}{overdue ? ' · quá hạn' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mytb-prog">
                        <ProgressBar value={t.progress} />
                        <span className="mono">{t.progress.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {open && <MyTaskModal task={open} today={today} update={update} onClose={() => setOpen(null)} />}
    </div>
  );
}

function MyTaskModal({
  task, today, update, onClose,
}: {
  task: Initiative; today: string; update: (fd: FormData) => Promise<void>; onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const [status, setStatus] = useState<Status>(task.status as Status);
  const [progress, setProgress] = useState<number>(task.progress);
  const [evi, setEvi] = useState<string>(task.evidence_url ?? '');
  const overdue = !!task.due_on && task.due_on < today && task.status !== 'done';

  const save = () => {
    const fd = new FormData();
    fd.set('id', task.id);
    fd.set('status', status);
    fd.set('progress', String(status === 'done' ? 100 : progress));
    fd.set('evidence_url', evi);
    setErr('');
    start(async () => {
      try { await update(fd); onClose(); router.refresh(); }
      catch (e) { setErr(e instanceof Error ? e.message : 'Không lưu được. Thử lại.'); }
    });
  };

  return (
    <div className="okr-modal-backdrop" onMouseDown={onClose}>
      <div className="okr-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="okr-modal-head">
          <b>{task.code && <span className="okr-code" style={{ marginRight: 6 }}>{task.code}</span>}Chi tiết công việc</b>
          <button type="button" className="okr-modal-x" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        <div className="te-title">{task.title}</div>
        <div className="te-vbadges">
          <span className={`badge ${STATUS_CLS[task.status as Status]}`}>{STATUS_LABEL[task.status as Status]}</span>
          {task.priority === 'high' && <span className="badge red">Ưu tiên cao</span>}
          {overdue && <span className="badge red">Quá hạn</span>}
        </div>

        <div className="te-links" style={{ marginTop: 6 }}>
          {task.objective_id && (
            <Link href={`/objectives/${task.objective_id}`} className="badge gray" onClick={onClose}>🎯 OKR {task.objective_code || ''}</Link>
          )}
          {task.project_id && (
            <Link href={`/projects/${task.project_id}`} className="badge gray" onClick={onClose}>🗂 {task.project_code || task.project_name}</Link>
          )}
        </div>

        {task.description && <p className="te-desc" style={{ marginTop: 8 }}>{task.description}</p>}
        {task.expected_output && (
          <div className="te-eo"><span className="te-eo-lbl">🎯 Kết quả đầu ra</span><p className="te-eo-txt">{task.expected_output}</p></div>
        )}

        <table className="t te-detail" style={{ marginTop: 8 }}>
          <tbody>
            <tr><td className="muted">Đơn vị</td><td>{task.unit_name || <span className="muted">—</span>}</td></tr>
            <tr><td className="muted">Ưu tiên</td><td>{PRIO_LABEL[task.priority] ?? task.priority}</td></tr>
            <tr><td className="muted">Bắt đầu</td><td>{task.start_on ? fmtDate(task.start_on) : <span className="muted">—</span>}</td></tr>
            <tr><td className="muted">Hạn</td><td>{task.due_on ? fmtDate(task.due_on) : <span className="muted">—</span>}</td></tr>
            <tr><td className="muted">Hoàn thành</td><td>
              {task.done_on ? (
                <>
                  {fmtDate(task.done_on)}
                  {task.due_on && (
                    <span className={`badge ${task.done_on > task.due_on ? 'red' : 'green'}`} style={{ marginLeft: 6 }}>
                      {task.done_on > task.due_on ? 'Trễ hạn' : 'Đúng hạn'}
                    </span>
                  )}
                </>
              ) : <span className="muted">— chưa xong</span>}
            </td></tr>
          </tbody>
        </table>

        {/* Cập nhật nhanh — việc của mình */}
        <div className="mytb-quick">
          <div className="mytb-quick-h">Cập nhật nhanh</div>
          <div className="row">
            <div>
              <label className="f">Trạng thái</label>
              <select className="i" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
                {(['todo', 'in_progress', 'blocked', 'done'] as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="f">Tiến độ (%)</label>
              <input className="i" type="number" min={0} max={100} value={status === 'done' ? 100 : progress}
                disabled={status === 'done'} onChange={(e) => setProgress(Number(e.target.value))} />
            </div>
          </div>
          <label className="f">Link minh chứng <span className="muted" style={{ fontWeight: 400 }}>(tuỳ chọn)</span></label>
          <input className="i" type="url" inputMode="url" value={evi} placeholder="https://…" onChange={(e) => setEvi(e.target.value)} />
          {err && <div className="te-err">{err}</div>}
        </div>

        <div className="te-actions">
          <Link href={`/tasks?task=${task.id}`} className="btn ghost sm" onClick={onClose}>Mở đầy đủ ↗</Link>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn ghost sm" onClick={onClose}>Đóng</button>
            <button type="button" className="btn sm" onClick={save} disabled={pending}>{pending ? 'Đang lưu…' : 'Lưu'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
