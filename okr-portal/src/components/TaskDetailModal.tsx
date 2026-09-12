'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import UserLink from '@/components/UserLink';
import { useToast } from '@/components/ToastProvider';
import type { TaskDetail } from '@/lib/exec-report';

type Status = 'todo' | 'in_progress' | 'blocked' | 'done' | 'canceled';
const STATUS_LABEL: Record<string, string> = { todo: 'Chưa làm', in_progress: 'Đang làm', blocked: 'Vướng', done: 'Xong', canceled: 'Huỷ' };
const STATUS_CLS: Record<string, string> = { todo: 'gray', in_progress: 'blue', blocked: 'red', done: 'green', canceled: 'gray' };
const BUCKET_LABEL: Record<string, string> = { done_ontime: 'Đúng hạn', done_late: 'Trễ hạn', overdue: 'Quá hạn', ontrack: 'Đang làm' };
const BUCKET_CLS: Record<string, string> = { done_ontime: 'green', done_late: 'red', overdue: 'red', ontrack: 'gray' };
const dmy = (iso: string | null): string => (iso ? iso.split('-').reverse().join('/') : '—');

type LogEvent = { actor_name: string | null; actor_email: string | null; kind: string; summary: string; created_at: string };

function LogRow({ taskId }: { taskId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [events, setEvents] = useState<LogEvent[]>([]);
  const load = async () => {
    if (state !== 'idle') { setState(state === 'done' ? 'idle' : state); return; }
    setState('loading');
    try {
      const r = await fetch(`/api/task-report/log?taskId=${taskId}`);
      const j = await r.json();
      setEvents(Array.isArray(j.events) ? j.events : []);
    } catch { setEvents([]); }
    setState('done');
  };
  return (
    <>
      <button type="button" className="btn ghost sm" onClick={load}>{state === 'loading' ? '…' : '📜 Log'}</button>
      {state === 'done' && (
        <div className="tdm-log">
          {events.length === 0 ? (
            <div className="muted" style={{ fontSize: 12 }}>Chưa có nhật ký thay đổi cho việc này.</div>
          ) : events.map((e, i) => (
            <div className="tdm-log-row" key={i}>
              <span className="tdm-log-when">{new Date(e.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</span>
              <span><b>{e.actor_name || e.actor_email || 'Ai đó'}</b> · {e.summary}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function TaskDetailModal({
  title, tasks, isSuper, moveAction, onClose,
}: {
  title: string;
  tasks: TaskDetail[];
  isSuper: boolean;
  moveAction: (id: string, status: Status) => Promise<void>;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [, start] = useTransition();
  const [statusById, setStatusById] = useState<Record<string, string>>({});

  const changeStatus = (id: string, next: string) => {
    setStatusById((m) => ({ ...m, [id]: next }));
    start(async () => {
      try { await moveAction(id, next as Status); toast('Đã đổi trạng thái công việc', 'success'); }
      catch (e) { toast(e instanceof Error ? e.message : 'Không đổi được trạng thái', 'error'); }
    });
  };

  return (
    <div className="okr-modal-backdrop" onMouseDown={onClose}>
      <div className="okr-modal okr-modal-wide tdm" onMouseDown={(e) => e.stopPropagation()}>
        <div className="okr-modal-head">
          <b>{title} · {tasks.length} việc</b>
          <button type="button" className="okr-modal-x" onClick={onClose} aria-label="Đóng">✕</button>
        </div>
        {tasks.length === 0 ? (
          <p className="muted" style={{ margin: '10px 0' }}>Không có công việc nào.</p>
        ) : (
          <div className="tdm-scroll">
            <table className="t tdm-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Công việc</th>
                  <th style={{ textAlign: 'left' }}>Phụ trách</th>
                  <th style={{ textAlign: 'left' }}>Thuộc</th>
                  <th style={{ textAlign: 'left' }}>Hạn</th>
                  <th style={{ textAlign: 'left' }}>Hoàn thành</th>
                  <th style={{ textAlign: 'left' }}>Trạng thái</th>
                  <th style={{ textAlign: 'left' }}>Phân loại</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  const st = statusById[t.id] ?? t.status;
                  return (
                    <tr key={t.id}>
                      <td>
                        {t.code && <span className="okr-code" style={{ marginRight: 6 }}>{t.code}</span>}
                        <Link href={`/tasks?task=${t.id}`} className="tbl-link" target="_blank" rel="noopener">{t.title}</Link>
                      </td>
                      <td><UserLink email={t.owner_email} name={t.owner_name} /></td>
                      <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t.ctx}</td>
                      <td className="mono" style={{ whiteSpace: 'nowrap' }}>{dmy(t.due_on)}</td>
                      <td className="mono" style={{ whiteSpace: 'nowrap' }}>{dmy(t.done_on)}</td>
                      <td>
                        {isSuper ? (
                          <select className="i" value={st} onChange={(e) => changeStatus(t.id, e.target.value)} style={{ padding: '4px 6px', fontSize: 12.5, minWidth: 116 }}>
                            {(['todo', 'in_progress', 'blocked', 'done', 'canceled'] as Status[]).map((s) => (
                              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`badge ${STATUS_CLS[st] ?? 'gray'}`}>{STATUS_LABEL[st] ?? st}</span>
                        )}
                      </td>
                      <td><span className={`badge ${BUCKET_CLS[t.bucket]}`}>{BUCKET_LABEL[t.bucket]}</span></td>
                      <td><LogRow taskId={t.id} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {isSuper && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Bạn là Super Admin — có thể đổi trạng thái bất kỳ việc nào ngay tại đây.</p>}
      </div>
    </div>
  );
}
