'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import SearchSelect from '@/components/SearchSelect';
import { unitTreeOptions } from '@/lib/unit-options';

type Kr = { id: string; code: string | null; title: string };
export type ObjOpt = { id: string; code: string | null; title: string; unit_name: string | null; krs: Kr[] };
type PersonOpt = { email: string; name: string };
type UnitOpt = { id: string; name: string; type: 'company' | 'division' | 'department' };

// Thêm CÔNG VIỆC (next action) cho CUỘC HỌP. Gắn OKR là TUỲ CHỌN: nếu chọn thì việc hiện
// cả ở action plan của OKR đó; nếu không, việc là hành động thuần của cuộc họp.
export default function AddTaskToMeeting({
  meetingId,
  objectives,
  users,
  units,
  create,
}: {
  meetingId: string;
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

  const krs = useMemo(() => objectives.find((o) => o.id === objId)?.krs ?? [], [objId, objectives]);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('id', meetingId);
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
        ＋ Thêm việc
      </button>

      {open && (
        <div className="okr-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div className="okr-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="okr-modal-head">
              <b>Thêm việc (hành động) cho cuộc họp</b>
              <button type="button" className="okr-modal-x" onClick={() => setOpen(false)} aria-label="Đóng">
                ✕
              </button>
            </div>
            <form onSubmit={submit}>
              <label className="f">Tên việc</label>
              <input className="i" name="title" required placeholder="VD: Gửi báo cáo doanh thu T8 trước 10/8" />

              <label className="f">Gắn vào OKR (tuỳ chọn)</label>
              <SearchSelect
                name="objective_id"
                defaultValue=""
                emptyLabel="— Không gắn (việc thuần của cuộc họp) —"
                onChange={setObjId}
                options={objectives.map((o) => ({
                  value: o.id,
                  label: `${o.code ? o.code + ' · ' : ''}${o.unit_name ? `[${o.unit_name}] ` : ''}${o.title}`,
                }))}
              />
              <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Gắn OKR để việc hiện cả ở “Dự án &amp; Kế hoạch hành động” của OKR đó. Không gắn cũng được.
              </p>

              {objId && (
                <>
                  <label className="f">Gắn vào Key Result (tuỳ chọn)</label>
                  <SearchSelect
                    key={objId}
                    name="key_result_id"
                    defaultValue=""
                    emptyLabel="— Gắn ở cấp Objective —"
                    options={krs.map((k) => ({ value: k.id, label: `${k.code ? k.code + ' · ' : ''}${k.title}` }))}
                  />
                </>
              )}

              <div className="row">
                <div>
                  <label className="f">Giao cho (cá nhân)</label>
                  <SearchSelect
                    name="owner_email"
                    defaultValue=""
                    emptyLabel="— Chưa giao —"
                    options={users.map((u) => ({ value: u.email, label: u.name }))}
                  />
                </div>
                <div>
                  <label className="f">Đơn vị phụ trách (Khối / Phòng)</label>
                  <SearchSelect
                    name="unit_id"
                    defaultValue=""
                    emptyLabel="— Không gắn —"
                    options={unitTreeOptions(units, { excludeCompany: true })}
                  />
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
