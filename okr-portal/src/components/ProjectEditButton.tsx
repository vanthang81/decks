'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export type ProjData = {
  id: string;
  name: string;
  description: string | null;
  owner_email: string | null;
  unit_id: string | null;
  status: string;
  start_on: string | null;
  due_on: string | null;
  budget_planned: number;
  budget_actual: number;
};
type PersonOpt = { email: string; name: string };
type UnitOpt = { id: string; name: string; type: 'company' | 'division' | 'department' };

const STATUS_LABEL: Record<string, string> = {
  active: 'Đang chạy',
  done: 'Hoàn thành',
  paused: 'Tạm dừng',
  archived: 'Lưu trữ',
};

export default function ProjectEditButton({
  project,
  users,
  units,
  save,
  del,
}: {
  project: ProjData;
  users: PersonOpt[];
  units: UnitOpt[];
  save: (fd: FormData) => Promise<void>;
  del: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const divisions = units.filter((u) => u.type === 'division');
  const departments = units.filter((u) => u.type === 'department');

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('id', project.id);
    setErr(null);
    startTransition(async () => {
      try {
        await save(fd);
        router.refresh();
        setOpen(false);
      } catch (e2) {
        setErr(e2 instanceof Error ? e2.message : String(e2));
      }
    });
  };

  const doDelete = () => {
    const fd = new FormData();
    fd.set('id', project.id);
    setErr(null);
    startTransition(async () => {
      try {
        await del(fd);
      } catch (e2) {
        // redirect() ném NEXT_REDIRECT — không phải lỗi thật.
        const msg = e2 instanceof Error ? e2.message : String(e2);
        if (!/NEXT_REDIRECT/.test(msg)) setErr(msg);
      }
    });
  };

  return (
    <>
      <button type="button" className="btn ghost sm" onClick={() => setOpen(true)}>
        ✏️ Sửa dự án
      </button>

      {open && (
        <div className="okr-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div className="okr-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="okr-modal-head">
              <b>Sửa dự án</b>
              <button type="button" className="okr-modal-x" onClick={() => setOpen(false)} aria-label="Đóng">
                ✕
              </button>
            </div>
            <form onSubmit={submit}>
              <label className="f">Tên dự án</label>
              <input className="i" name="name" defaultValue={project.name} required />
              <div className="row">
                <div>
                  <label className="f">Chủ trì (cá nhân)</label>
                  <select className="i" name="owner_email" defaultValue={project.owner_email ?? ''}>
                    <option value="">— Chưa gán —</option>
                    {users.map((u) => (
                      <option key={u.email} value={u.email}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="f">Đơn vị chủ trì (Khối / Phòng)</label>
                  <select className="i" name="unit_id" defaultValue={project.unit_id ?? ''}>
                    <option value="">— Không gắn —</option>
                    {divisions.length > 0 && (
                      <optgroup label="Khối">
                        {divisions.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                      </optgroup>
                    )}
                    {departments.length > 0 && (
                      <optgroup label="Phòng ban">
                        {departments.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div>
                  <label className="f">Trạng thái</label>
                  <select className="i" name="status" defaultValue={project.status}>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="row">
                <div>
                  <label className="f">Bắt đầu</label>
                  <input className="i" type="date" name="start_on" defaultValue={project.start_on ?? ''} />
                </div>
                <div>
                  <label className="f">Hạn</label>
                  <input className="i" type="date" name="due_on" defaultValue={project.due_on ?? ''} />
                </div>
                <div>
                  <label className="f">NS kế hoạch (VND)</label>
                  <input className="i" name="budget_planned" defaultValue={project.budget_planned} />
                </div>
                <div>
                  <label className="f">Đã chi (VND)</label>
                  <input className="i" name="budget_actual" defaultValue={project.budget_actual} />
                </div>
              </div>
              <label className="f">Mô tả</label>
              <textarea className="i" name="description" defaultValue={project.description ?? ''} rows={2} />

              {err && (
                <div className="gnote" style={{ background: '#fee2e2', borderColor: '#dc2626', color: '#991b1b' }}>
                  ❌ {err}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button className="btn" type="submit" disabled={pending}>
                  {pending ? 'Đang lưu…' : 'Lưu dự án'}
                </button>
                <button className="btn ghost" type="button" onClick={() => setOpen(false)} disabled={pending}>
                  Huỷ
                </button>
              </div>
            </form>

            <div className="okr-modal-manage">
              {confirmDel ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="muted" style={{ fontSize: 13 }}>
                    Xoá dự án? (Việc chỉ được gỡ liên kết, không bị xoá.)
                  </span>
                  <button className="btn ghost sm danger" type="button" onClick={doDelete} disabled={pending}>
                    Xoá hẳn
                  </button>
                  <button className="btn ghost sm" type="button" onClick={() => setConfirmDel(false)}>
                    Không
                  </button>
                </div>
              ) : (
                <button className="btn ghost sm danger" type="button" onClick={() => setConfirmDel(true)}>
                  🗑 Xoá dự án
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
