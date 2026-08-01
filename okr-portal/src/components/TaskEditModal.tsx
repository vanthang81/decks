'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfirmButton from '@/components/ConfirmButton';
import type { TaskRow } from '@/lib/initiatives';
import type { PersonOpt, UnitOpt, ProjectOpt } from '@/components/ExecutionTabs';

type Status = 'todo' | 'in_progress' | 'blocked' | 'done' | 'canceled';
const STATUS_LABEL: Record<Status, string> = {
  todo: 'Chưa làm', in_progress: 'Đang làm', blocked: 'Vướng', done: 'Xong', canceled: 'Huỷ',
};
const COLUMNS: Status[] = ['todo', 'in_progress', 'blocked', 'done', 'canceled'];
const KIND_LABEL: Record<string, string> = { project: 'Dự án', subproject: 'Tiểu dự án', action: 'Công việc' };

export default function TaskEditModal({
  task,
  canManage,
  isAssignee,
  users,
  units,
  projects,
  editAction,
  deleteAction,
  onClose,
}: {
  task: TaskRow;
  canManage: boolean;
  isAssignee: boolean;
  users: PersonOpt[];
  units: UnitOpt[];
  projects: ProjectOpt[];
  editAction: (fd: FormData) => Promise<void>;
  deleteAction: (fd: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const editable = canManage || isAssignee;

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('id', task.id);
    setErr('');
    start(async () => {
      try {
        await editAction(fd);
        onClose();
        router.refresh();
      } catch (e2) {
        setErr(e2 instanceof Error ? e2.message : 'Không lưu được. Thử lại.');
      }
    });
  };

  const doDelete = () => {
    const fd = new FormData();
    fd.set('id', task.id);
    fd.set('objective_id', task.objective_id ?? '');
    setErr('');
    start(async () => {
      try {
        await deleteAction(fd);
        onClose();
        router.refresh();
      } catch (e2) {
        setErr(e2 instanceof Error ? e2.message : 'Không xoá được. Thử lại.');
      }
    });
  };

  const divisions = units.filter((u) => u.type === 'division');
  const depts = units.filter((u) => u.type === 'department');

  return (
    <div className="okr-modal-backdrop" onMouseDown={onClose}>
      <div className="okr-modal task-edit" onMouseDown={(e) => e.stopPropagation()}>
        <div className="okr-modal-head">
          <b>
            {task.code && <span className="okr-code" style={{ marginRight: 6 }}>{task.code}</span>}
            {KIND_LABEL[task.kind]}
          </b>
          <button type="button" className="okr-modal-x" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        <div className="te-links">
          {task.objective_id && (
            <Link href={`/objectives/${task.objective_id}`} className="badge gray" onClick={onClose}>
              OKR {task.objective_code || ''}
            </Link>
          )}
          {task.project_id && (
            <Link href={`/projects/${task.project_id}`} className="badge gray" onClick={onClose}>
              🗂 {task.project_code || task.project_name}
            </Link>
          )}
        </div>

        <form onSubmit={submit}>
          {canManage ? (
            <>
              <label className="f">Tên công việc</label>
              <input className="i" name="title" defaultValue={task.title} required />
              <label className="f">Mô tả</label>
              <textarea className="i" name="description" defaultValue={task.description ?? ''} rows={2} />
              <div className="row">
                <div>
                  <label className="f">Người phụ trách</label>
                  <select className="i" name="owner_email" defaultValue={task.owner_email ?? ''}>
                    <option value="">— Chưa giao —</option>
                    {users.map((u) => (
                      <option key={u.email} value={u.email}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="f">Đơn vị phụ trách</label>
                  <select className="i" name="unit_id" defaultValue={task.unit_id ?? ''}>
                    <option value="">— Không gắn —</option>
                    {divisions.length > 0 && (
                      <optgroup label="Khối">
                        {divisions.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </optgroup>
                    )}
                    {depts.length > 0 && (
                      <optgroup label="Phòng ban">
                        {depts.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>
              <div className="row">
                <div>
                  <label className="f">Trạng thái</label>
                  <select className="i" name="status" defaultValue={task.status}>
                    {COLUMNS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="f">Ưu tiên</label>
                  <select className="i" name="priority" defaultValue={task.priority}>
                    <option value="high">Cao</option>
                    <option value="medium">Trung bình</option>
                    <option value="low">Thấp</option>
                  </select>
                </div>
                <div>
                  <label className="f">Tiến độ (%)</label>
                  <input className="i" name="progress" type="number" min={0} max={100} defaultValue={task.progress} />
                </div>
              </div>
              <div className="row">
                <div>
                  <label className="f">Bắt đầu</label>
                  <input className="i" type="date" name="start_on" defaultValue={task.start_on ?? ''} />
                </div>
                <div>
                  <label className="f">Hạn</label>
                  <input className="i" type="date" name="due_on" defaultValue={task.due_on ?? ''} />
                </div>
                <div>
                  <label className="f">Thuộc dự án</label>
                  <select className="i" name="project_id" defaultValue={task.project_id ?? ''}>
                    <option value="">— Không —</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.code ? `${p.code} · ` : ''}{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="row">
                <div>
                  <label className="f">NS kế hoạch (VND)</label>
                  <input className="i" name="budget_planned" defaultValue={task.budget_planned} />
                </div>
                <div>
                  <label className="f">Đã chi (VND)</label>
                  <input className="i" name="budget_actual" defaultValue={task.budget_actual} />
                </div>
              </div>
            </>
          ) : isAssignee ? (
            <>
              <div className="te-title">{task.title}</div>
              <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
                Bạn được giao việc này — cập nhật trạng thái &amp; tiến độ.
              </p>
              <div className="row">
                <div>
                  <label className="f">Trạng thái</label>
                  <select className="i" name="status" defaultValue={task.status}>
                    {COLUMNS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="f">Tiến độ (%)</label>
                  <input className="i" name="progress" type="number" min={0} max={100} defaultValue={task.progress} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="te-title">{task.title}</div>
              <table className="t" style={{ marginTop: 8 }}>
                <tbody>
                  <tr><td className="muted">Trạng thái</td><td>{STATUS_LABEL[task.status]}</td></tr>
                  <tr><td className="muted">Tiến độ</td><td>{task.progress.toFixed(0)}%</td></tr>
                  <tr><td className="muted">Phụ trách</td><td>{task.owner_name || task.owner_email || '—'}</td></tr>
                  <tr><td className="muted">Đơn vị</td><td>{task.unit_name || '—'}</td></tr>
                  <tr><td className="muted">Hạn</td><td>{task.due_on || '—'}</td></tr>
                </tbody>
              </table>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
                Bạn chỉ có quyền xem việc này.
              </p>
            </>
          )}

          {err && <div className="te-err">{err}</div>}

          <div className="te-actions">
            <div>
              {canManage && (
                <ConfirmButton
                  label="🗑 Xoá công việc"
                  className="btn ghost sm danger"
                  title="Xoá công việc"
                  message={`Xoá "${task.title}"? Thao tác này xoá cả việc con (nếu có) và không hoàn tác được.`}
                  confirmLabel="Xoá hẳn"
                  onConfirm={doDelete}
                />
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn ghost sm" onClick={onClose}>Đóng</button>
              {editable && (
                <button type="submit" className="btn sm" disabled={pending}>
                  {pending ? 'Đang lưu…' : 'Lưu thay đổi'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
