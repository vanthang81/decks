'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmButton from './ConfirmButton';
import SearchSelect from '@/components/SearchSelect';
import { unitTreeOptions } from '@/lib/unit-options';

export type ObjData = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  okr_type: string;
  owner_email: string | null;
  unit_id: string | null;
  level: string;
};
type PersonOpt = { email: string; name: string };
type UnitOpt = { id: string; name: string; type: 'company' | 'division' | 'department' };

const STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp',
  active: 'Đang chạy',
  done: 'Hoàn thành',
  archived: 'Lưu trữ',
};
const TYPE_LABEL: Record<string, string> = {
  committed: 'Cam kết',
  aspirational: 'Khát vọng',
  learning: 'Học hỏi',
};

export default function ObjectiveEditButton({
  objective,
  users,
  units,
  canDelete,
  save,
  del,
}: {
  objective: ObjData;
  users: PersonOpt[];
  units: UnitOpt[];
  canDelete: boolean;
  save: (fd: FormData) => Promise<void>;
  del: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
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

  const isIndividual = objective.level === 'individual';

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('id', objective.id);
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
    fd.set('id', objective.id);
    setErr(null);
    startTransition(async () => {
      try {
        await del(fd);
      } catch (e2) {
        const msg = e2 instanceof Error ? e2.message : String(e2);
        if (!/NEXT_REDIRECT/.test(msg)) setErr(msg);
      }
    });
  };

  return (
    <>
      <button type="button" className="btn ghost sm" onClick={() => setOpen(true)}>
        ✏️ Sửa OKR
      </button>

      {open && (
        <div className="okr-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div className="okr-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="okr-modal-head">
              <b>Sửa OKR</b>
              <button type="button" className="okr-modal-x" onClick={() => setOpen(false)} aria-label="Đóng">
                ✕
              </button>
            </div>
            <form onSubmit={submit}>
              <label className="f">Tiêu đề Objective</label>
              <input className="i" name="title" defaultValue={objective.title} required />
              <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>
                Không cần ghi tên Khối/Phòng — đã lấy từ ô “Đơn vị phụ trách” bên dưới.
              </p>

              <div className="row">
                <div>
                  <label className="f">Loại OKR</label>
                  <select className="i" name="okr_type" defaultValue={objective.okr_type}>
                    {Object.entries(TYPE_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="f">Trạng thái</label>
                  <select className="i" name="status" defaultValue={objective.status}>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="f">Chủ trì (cá nhân)</label>
                  <SearchSelect name="owner_email" defaultValue={objective.owner_email ?? ''} emptyLabel="— Chưa gán —"
                    options={users.map((u) => ({ value: u.email, label: u.name }))} />
                </div>
              </div>

              {!isIndividual && (
                <>
                  <label className="f">Đơn vị phụ trách (Khối / Phòng)</label>
                  <SearchSelect name="unit_id" defaultValue={objective.unit_id ?? ''} emptyLabel="— Không gắn —"
                    options={unitTreeOptions(units, { excludeCompany: true })} />
                </>
              )}

              <label className="f">Mô tả</label>
              <textarea className="i" name="description" defaultValue={objective.description ?? ''} rows={2} />

              {err && (
                <div className="gnote" style={{ background: '#fee2e2', borderColor: '#dc2626', color: '#991b1b' }}>
                  ❌ {err}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button className="btn" type="submit" disabled={pending}>
                  {pending ? 'Đang lưu…' : 'Lưu thay đổi'}
                </button>
                <button className="btn ghost" type="button" onClick={() => setOpen(false)} disabled={pending}>
                  Huỷ
                </button>
              </div>
            </form>

            {canDelete && (
              <div className="okr-modal-manage">
                <ConfirmButton
                  className="btn ghost sm danger"
                  label="🗑 Xoá OKR"
                  title="Xoá OKR"
                  message="Xoá OKR này cùng toàn bộ KR, check-in, việc thực thi và bình luận bên trong? Hành động không thể hoàn tác."
                  confirmLabel="Xoá hẳn"
                  onConfirm={doDelete}
                  disabled={pending}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
