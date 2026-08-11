'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmButton from './ConfirmButton';
import SearchSelect from '@/components/SearchSelect';
import { useToast } from '@/components/ToastProvider';
import { unitTreeOptions } from '@/lib/unit-options';
import NumberInput from '@/components/NumberInput';

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
type PersonOpt = { email: string; name: string; title?: string | null };
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
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);


  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('id', project.id);
    setErr(null);
    startTransition(async () => {
      try {
        await save(fd);
        toast('Đã lưu dự án', 'success');
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
                  <SearchSelect name="owner_email" defaultValue={project.owner_email ?? ''} emptyLabel="— Chưa gán —"
                    options={users.map((u) => ({ value: u.email, label: u.name, sub: u.title ?? undefined }))} />
                </div>
                <div>
                  <label className="f">Đơn vị chủ trì (Khối / Phòng)</label>
                  <SearchSelect name="unit_id" defaultValue={project.unit_id ?? ''} emptyLabel="— Không gắn —"
                    options={unitTreeOptions(units, { excludeCompany: true })} />
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
                  <NumberInput name="budget_planned" defaultValue={project.budget_planned} />
                </div>
                <div>
                  <label className="f">Đã chi (VND)</label>
                  <NumberInput name="budget_actual" defaultValue={project.budget_actual} />
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
              <ConfirmButton
                className="btn ghost sm danger"
                label="🗑 Xoá dự án"
                title="Xoá dự án"
                message="Xoá dự án này? Các công việc chỉ được gỡ liên kết (không bị xoá). Hành động không thể hoàn tác."
                confirmLabel="Xoá hẳn"
                onConfirm={doDelete}
                disabled={pending}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
