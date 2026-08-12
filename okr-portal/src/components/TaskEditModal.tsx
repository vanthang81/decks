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
import UserLink from '@/components/UserLink';
import { ProgressBar } from '@/components/ui';
import { fmtVnd, fmtDate } from '@/lib/format';
import type { TaskRow } from '@/lib/initiatives';
import type { PersonOpt, UnitOpt, ProjectOpt } from '@/components/ExecutionTabs';

type Status = 'todo' | 'in_progress' | 'blocked' | 'done' | 'canceled';
const STATUS_LABEL: Record<Status, string> = {
  todo: 'Chưa làm', in_progress: 'Đang làm', blocked: 'Vướng', done: 'Xong', canceled: 'Huỷ',
};
const STATUS_CLS: Record<Status, string> = { todo: 'gray', in_progress: 'blue', blocked: 'red', done: 'green', canceled: 'gray' };
const PRIO_LABEL: Record<string, string> = { high: 'Cao', medium: 'Trung bình', low: 'Thấp' };
const COLUMNS: Status[] = ['todo', 'in_progress', 'blocked', 'done', 'canceled'];
const KIND_LABEL: Record<string, string> = { project: 'Dự án', subproject: 'Tiểu dự án', action: 'Công việc' };

export default function TaskEditModal({
  task,
  canManage,
  isAssignee,
  users,
  units,
  projects,
  objectiveOpts = [],
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
  objectiveOpts?: { id: string; label: string }[];  // OKR để gắn lại việc
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
  // Bấm vào việc → mở CHI TIẾT (chỉ xem) trước; bấm "Sửa" mới sang form chỉnh sửa (CFO 06/08).
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const depLabels = depInitial
    .map((id) => depOptions.find((o) => o.value === id)?.label)
    .filter(Boolean) as string[];

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('id', task.id);
    // GIỮ nguyên liên kết không có ô chọn trong form này (cuộc họp). project_id & objective_id đã có select.
    if (!fd.has('objective_id')) fd.set('objective_id', task.objective_id ?? '');
    // Key Result: đổi OKR → bỏ KR cũ (thuộc OKR cũ); giữ nguyên nếu OKR không đổi.
    if (!fd.has('key_result_id')) {
      const sameObj = (fd.get('objective_id') ?? '') === (task.objective_id ?? '');
      fd.set('key_result_id', sameObj ? (task.key_result_id ?? '') : '');
    }
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

        {mode === 'view' ? (
          <div className="te-viewbody">
            <div className="te-title">{task.title}</div>
            <div className="te-vbadges">
              <span className={`badge ${STATUS_CLS[task.status]}`}>{STATUS_LABEL[task.status]}</span>
              {task.priority === 'high' && <span className="badge red">Ưu tiên cao</span>}
              {task.kind !== 'action' && task.has_children && <span className="badge blue">{KIND_LABEL[task.kind]}</span>}
            </div>
            {task.description && <p className="te-desc">{task.description}</p>}
            {task.expected_output && (
              <div className="te-eo">
                <span className="te-eo-lbl">🎯 Kết quả đầu ra</span>
                <p className="te-eo-txt">{task.expected_output}</p>
              </div>
            )}
            <table className="t te-detail" style={{ marginTop: 10 }}>
              <tbody>
                <tr><td className="muted">Tiến độ</td><td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 150, display: 'inline-block' }}><ProgressBar value={task.progress} /></span>
                    <b className="mono">{task.progress.toFixed(0)}%</b>
                  </span>
                </td></tr>
                <tr><td className="muted">Phụ trách</td><td>
                  {task.owner_email || task.owner_name ? (
                    <>
                      <UserLink email={task.owner_email} name={task.owner_name} />
                      {(() => { const ti = users.find((u) => u.email.toLowerCase() === (task.owner_email ?? '').toLowerCase())?.title; return ti ? <span className="muted"> · {ti}</span> : null; })()}
                    </>
                  ) : <span className="muted">Chưa giao</span>}
                </td></tr>
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
                          {task.done_on > task.due_on
                            ? `Trễ ${Math.round((Date.parse(task.done_on) - Date.parse(task.due_on)) / 86400000)} ngày`
                            : 'Đúng hạn'}
                        </span>
                      )}
                    </>
                  ) : <span className="muted">— chưa xong</span>}
                </td></tr>
                <tr><td className="muted">NS kế hoạch</td><td className="mono">{fmtVnd(task.budget_planned)}</td></tr>
                <tr><td className="muted">Đã chi</td><td className="mono">{fmtVnd(task.budget_actual)}</td></tr>
                <tr><td className="muted">Minh chứng</td><td>{task.evidence_url
                  ? <a className="ci-evi" href={task.evidence_url} target="_blank" rel="noopener noreferrer" title={task.evidence_url}>🔗 Mở minh chứng</a>
                  : <span className="muted">—</span>}</td></tr>
                {depLabels.length > 0 && <tr><td className="muted">⏳ Phụ thuộc</td><td>{depLabels.join(' · ')}</td></tr>}
              </tbody>
            </table>
            {!editable && <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>Bạn chỉ có quyền xem việc này.</p>}
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
                {editable && <button type="button" className="btn sm" onClick={() => { setErr(''); setMode('edit'); }}>✏️ Sửa công việc</button>}
              </div>
            </div>
          </div>
        ) : (
        <form onSubmit={submit}>
          {canManage ? (
            <>
              <label className="f">Tên công việc</label>
              <input className="i" name="title" defaultValue={task.title} required />
              <label className="f">Mô tả</label>
              <textarea className="i" name="description" defaultValue={task.description ?? ''} rows={2} />
              <label className="f">Kết quả đầu ra <span className="muted" style={{ fontWeight: 400 }}>— tiêu chí hoàn thành (tuỳ chọn)</span></label>
              <textarea className="i" name="expected_output" defaultValue={task.expected_output ?? ''} rows={2}
                placeholder="Xong là ra cái gì? VD: Bảng checklist hoàn chỉnh + dashboard phê duyệt đã bật" />
              <div className="row">
                <div>
                  <label className="f">Người phụ trách</label>
                  <SearchSelect name="owner_email" defaultValue={task.owner_email ?? ''} emptyLabel="— Chưa giao —"
                    options={users.map((u) => ({ value: u.email, label: u.name, sub: u.title ?? undefined }))} />
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
                  <label className="f">Hạn <span className="muted" style={{ fontWeight: 400 }}>— cố định</span></label>
                  {/* Hạn KHOÁ để đánh giá đúng/trễ hạn khách quan; giá trị vẫn gửi qua input ẩn. */}
                  <input className="i" type="date" defaultValue={task.due_on ?? ''} disabled
                    title="Hạn cố định để đánh giá đúng hạn — không sửa ở đây" />
                  <input type="hidden" name="due_on" value={task.due_on ?? ''} />
                </div>
                <div>
                  <label className="f">Hoàn thành</label>
                  <input className="i" type="date" name="done_on" defaultValue={task.done_on ?? ''}
                    title="Ngày hoàn thành thực tế (tự điền khi chuyển 'Xong', sửa được)" />
                </div>
              </div>
              {task.due_on && task.done_on && (
                <p style={{ margin: '2px 0 8px', fontSize: 12.5 }}>
                  <span className={`badge ${task.done_on > task.due_on ? 'red' : 'green'}`}>
                    {task.done_on > task.due_on
                      ? `Trễ hạn ${Math.round((Date.parse(task.done_on) - Date.parse(task.due_on)) / 86400000)} ngày`
                      : 'Hoàn thành đúng hạn'}
                  </span>
                </p>
              )}
              <div className="row">
                <div>
                  <label className="f">Thuộc OKR <span className="muted" style={{ fontWeight: 400 }}>(tuỳ chọn)</span></label>
                  <SearchSelect name="objective_id" defaultValue={task.objective_id ?? ''} emptyLabel="— Không gắn OKR —"
                    options={objectiveOpts.map((o) => ({ value: o.id, label: o.label }))} />
                </div>
                <div>
                  <label className="f">Thuộc dự án <span className="muted" style={{ fontWeight: 400 }}>(tuỳ chọn)</span></label>
                  <SearchSelect name="project_id" defaultValue={task.project_id ?? ''} emptyLabel="— Không gắn dự án —"
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
              <label className="f">Link minh chứng <span className="muted" style={{ fontWeight: 400 }}>(tuỳ chọn) — tài liệu/hình ảnh chứng minh kết quả</span></label>
              <input className="i" name="evidence_url" type="url" inputMode="url" defaultValue={task.evidence_url ?? ''} placeholder="https://…" />
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
              {task.expected_output && (
                <div className="te-eo">
                  <span className="te-eo-lbl">🎯 Kết quả đầu ra</span>
                  <p className="te-eo-txt">{task.expected_output}</p>
                </div>
              )}
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
              <label className="f">Link minh chứng <span className="muted" style={{ fontWeight: 400 }}>(tuỳ chọn) — tài liệu/hình ảnh chứng minh kết quả</span></label>
              <input className="i" name="evidence_url" type="url" inputMode="url" defaultValue={task.evidence_url ?? ''} placeholder="https://…" />
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
              <button type="button" className="btn ghost sm" onClick={() => { setErr(''); setMode('view'); }}>← Xem chi tiết</button>
              {editable && (
                <button type="submit" className="btn sm" disabled={pending}>
                  {pending ? 'Đang lưu…' : 'Lưu thay đổi'}
                </button>
              )}
            </div>
          </div>
        </form>
        )}

        <div className="okr-modal-cmt">
          <CommentThread entityType="initiative" entityId={task.id} users={users} defaultOpen canModerate={canManage} />
        </div>
      </div>
    </div>
  );
}
