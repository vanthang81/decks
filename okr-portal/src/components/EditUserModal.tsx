'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import SearchSelect from '@/components/SearchSelect';
import { unitTreeOptions } from '@/lib/unit-options';

// Popup SỬA QUYỀN 1 người dùng — dùng lại saveUserAction (upsert theo email).
type Unit = { id: string; name: string; type: 'company' | 'division' | 'department'; parent_id?: string | null; sort?: number | null };
type Group = { key: string; icon: string; label: string; desc?: string };
type Role = { value: string; label: string };
type U = {
  email: string;
  display_name: string | null;
  title: string | null;
  role: string;
  unit_id: string | null;
  perm_group: string | null;
};

export default function EditUserModal({
  user,
  units,
  roles,
  groups,
  assignPerms,
  action,
}: {
  user: U;
  units: Unit[];
  roles: Role[];
  groups: Group[];
  assignPerms: boolean;
  action: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('email', user.email); // khoá theo email — KHÔNG cho đổi email
    setErr('');
    start(async () => {
      try {
        await action(fd);
        setOpen(false);
        toast('Đã lưu người dùng', 'success');
        router.refresh();
      } catch (e2) {
        setErr(e2 instanceof Error ? e2.message : 'Không lưu được. Thử lại.');
      }
    });
  };

  return (
    <>
      <button type="button" className="btn ghost sm" onClick={() => setOpen(true)}>
        Sửa
      </button>
      {open && (
        <div className="okr-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div className="okr-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="okr-modal-head">
              <b>Sửa quyền · {user.display_name || user.email}</b>
              <button type="button" className="okr-modal-x" onClick={() => setOpen(false)} aria-label="Đóng">
                ✕
              </button>
            </div>
            <form onSubmit={submit}>
              <div className="obj-meta mono" style={{ marginBottom: 10 }}>{user.email}</div>
              <label className="f">Họ tên</label>
              <input className="i" name="display_name" defaultValue={user.display_name ?? ''} />
              <label className="f">Chức danh</label>
              <input className="i" name="title" defaultValue={user.title ?? ''} placeholder="VD: Trưởng phòng Bán lẻ" />
              <div className="row">
                <div>
                  <label className="f">Vai trò</label>
                  <select className="i" name="role" defaultValue={user.role}>
                    {roles.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="f">Đơn vị (nhà)</label>
                  <SearchSelect name="unit_id" defaultValue={user.unit_id ?? ''} emptyLabel="— Không gán —"
                    options={unitTreeOptions(units)} />
                </div>
              </div>
              <label className="f">
                Nhóm quyền
                {!assignPerms && <span className="muted" style={{ fontWeight: 400 }}> (cần quyền phân quyền)</span>}
              </label>
              <select className="i" name="perm_group" defaultValue={user.perm_group ?? ''} disabled={!assignPerms}>
                <option value="">— Mặc định theo vai trò —</option>
                {groups.map((g) => (
                  <option key={g.key} value={g.key}>{g.icon} {g.label}</option>
                ))}
              </select>
              {err && <p className="badge red" style={{ display: 'block', marginTop: 12, padding: 10 }}>{err}</p>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" className="btn ghost" onClick={() => setOpen(false)} disabled={pending}>
                  Huỷ
                </button>
                <button type="submit" className="btn" disabled={pending}>
                  {pending ? 'Đang lưu…' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
