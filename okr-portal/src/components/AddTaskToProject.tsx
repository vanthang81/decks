'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Kr = { id: string; code: string | null; title: string };
export type ObjOpt = { id: string; code: string | null; title: string; unit_name: string | null; krs: Kr[] };
type PersonOpt = { email: string; name: string };
type UnitOpt = { id: string; name: string; type: 'company' | 'division' | 'department' };

// Thêm việc VÀO DỰ ÁN: chọn Objective (+ KR) của bộ phận → việc hiện cả ở action plan
// của bộ phận đó (đúng O/KR đã chọn) VÀ trong dự án này.
export default function AddTaskToProject({
  projectId,
  objectives,
  users,
  units,
  create,
}: {
  projectId: string;
  objectives: ObjOpt[];
  users: PersonOpt[];
  units: UnitOpt[];
  create: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [objId, setObjId] = useState('');

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
  const krs = useMemo(() => objectives.find((o) => o.id === objId)?.krs ?? [], [objId, objectives]);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('project_id', projectId);
    fd.set('kind', 'action');
    setErr(null);
    startTransition(async () => {
      try {
        await create(fd);
        router.refresh();
        setOpen(false);
        setObjId('');
      } catch (e2) {
        setErr(e2 instanceof Error ? e2.message : String(e2));
      }
    });
  };

  return (
    <>
      <button type="button" className="btn sm" onClick={() => setOpen(true)}>
        ＋ Thêm việc vào dự án
      </button>

      {open && (
        <div className="okr-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div className="okr-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="okr-modal-head">
              <b>Thêm việc vào dự án</b>
              <button type="button" className="okr-modal-x" onClick={() => setOpen(false)} aria-label="Đóng">
                ✕
              </button>
            </div>
            <form onSubmit={submit}>
              <label className="f">Gắn vào OKR của bộ phận (bắt buộc)</label>
              <select
                className="i"
                name="objective_id"
                required
                value={objId}
                onChange={(e) => setObjId(e.target.value)}
              >
                <option value="">— Chọn Objective —</option>
                {objectives.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.code ? `${o.code} · ` : ''}
                    {o.unit_name ? `[${o.unit_name}] ` : ''}
                    {o.title}
                  </option>
                ))}
              </select>
              <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Việc sẽ hiện ở “Dự án &amp; Kế hoạch hành động” của OKR bộ phận đã chọn.
              </p>

              <label className="f">Gắn vào Key Result (tuỳ chọn)</label>
              <select className="i" name="key_result_id" defaultValue="" disabled={!objId}>
                <option value="">— Gắn ở cấp Objective —</option>
                {krs.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.code ? `${k.code} · ` : ''}
                    {k.title}
                  </option>
                ))}
              </select>

              <label className="f">Tên việc</label>
              <input className="i" name="title" required placeholder="VD: Tích hợp API thanh toán" />

              <div className="row">
                <div>
                  <label className="f">Giao cho (cá nhân)</label>
                  <select className="i" name="owner_email" defaultValue="">
                    <option value="">— Chưa giao —</option>
                    {users.map((u) => (
                      <option key={u.email} value={u.email}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="f">Đơn vị phụ trách (Khối / Phòng)</label>
                  <select className="i" name="unit_id" defaultValue="">
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
              </div>
              <div className="row">
                <div>
                  <label className="f">Ưu tiên</label>
                  <select className="i" name="priority" defaultValue="medium">
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                  </select>
                </div>
                <div>
                  <label className="f">Hạn</label>
                  <input className="i" type="date" name="due_on" />
                </div>
              </div>

              {err && (
                <div className="gnote" style={{ background: '#fee2e2', borderColor: '#dc2626', color: '#991b1b' }}>
                  ❌ {err}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button className="btn" type="submit" disabled={pending}>
                  {pending ? 'Đang thêm…' : 'Thêm việc'}
                </button>
                <button className="btn ghost" type="button" onClick={() => setOpen(false)} disabled={pending}>
                  Huỷ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
