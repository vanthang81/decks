'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfirmButton from '@/components/ConfirmButton';
import SearchSelect from '@/components/SearchSelect';
import { unitTreeOptions } from '@/lib/unit-options';
import NumberInput from '@/components/NumberInput';
import MultiSelect, { type MSOption } from '@/components/MultiSelect';
import CommentThread from '@/components/CommentThread';
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
  depInitial = [],
  depOptions = [],
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
  depInitial?: string[];    // predecessor id hiện có
  depOptions?: MSOption[];  // việc anh em (cùng OKR) để chọn phụ thuộc
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const editable = canManage || isAssignee;

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('id', task.id);
    // GIỮ nguyên các liên kết không có ô chọn trong form này (OKR/KR/cuộc họp) — nếu không set,
    // editInitiativeAction sẽ đọc null và XOÁ liên kết. (project_id đã có select riêng.)
    if (!fd.has('objective_id')) fd.set('objective_id', task.objective_id ?? '');
    if (!fd.has('key_result_id')) fd.set('key_result_id', task.key_result_id ?? '');
    if (!fd.has('meeting_id')) fd.set('meeting_id', task.meeting_id ?? '');
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


  return (
    <div className="okr-modal-backdrop" onMouseDown={onClose}>
      <div className="okr-modal task-edit" onMouseDown={(e) => e.stopPropagation()}>
        <div className="okr-modal-head">
          <b>
            {task.code && <span className="okr-code" style={{ marginRight: 6 }}>{task.code}</span>}
            {/* Chỉ hiện 'Dự án'/'Tiểu dự án' khi thực sự có việc con; việc lẻ không cần chữ "Công việc". */}
            {task.kind !== 'action' && task.has_children && KIND_LABEL[task.kind]}
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
                  <SearchSelect name="owner_email" defaultValue={task.owner_email ?? ''} emptyLabel="— Chưa giao —"
                    options={users.map((u) => ({ value: u.email, label: u.name }))} />
                </div>
                <div>
                  <label className="f">Đơn vị phụ trách</label>
                  <SearchSelect name="unit_id" defaultValue={task.unit_id ?? ''} emptyLabel="— Không gắn —"
                    options={unitTreeOptions(units, { excludeCompany: true })} />
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
                  <SearchSelect name="project_id" defaultValue={task.project_id ?? ''} emptyLabel="— Không —"
                    options={projects.map((p) => ({ value: p.id, label: `${p.code ? p.code + ' · ' : ''}${p.name}` }))} />
                </div>
              </div>
              <div className="row">
                <div>
                  <label className="f">NS kế hoạch (VND)</label>
                  <NumberInput name="budget_planned" defaultValue={task.budget_planned} />
                </div>
                <div>
                  <label className="f">Đã chi (VND)</label>
                  <NumberInput name="budget_actual" defaultValue={task.budget_actual} />
                </div>
              </div>
              {depOptions.length > 0 && (
                <>
                  <label className="f">⏳ Phụ thuộc vào (việc phải xong trước) <span className="muted" style={{ fontWeight: 400 }}>— ràng buộc waterfall trong cùng OKR</span></label>
                  <MultiSelect name="depends_on" options={depOptions} initial={depInitial}
                    placeholder="Chọn việc phải hoàn thành trước việc này…" emptyText="Không phụ thuộc việc nào (chạy độc lập)." />
                </>
              )}
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

        <div className="okr-modal-cmt">
          <CommentThread entityType="initiative" entityId={task.id} users={users} defaultOpen canModerate={canManage} />
        </div>
      </div>
    </div>
  );
}
