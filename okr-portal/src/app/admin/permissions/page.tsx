import Link from 'next/link';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import HelpTip from '@/components/HelpTip';
import { requireUser } from '@/lib/current-user';
import { canAdmin, ROLE_LABEL, type Role } from '@/lib/rbac';
import { listUsers } from '@/lib/users';
import { loadOkrPerms } from '@/lib/okr-perms';
import { savePermissionsAction } from '../actions';

export const dynamic = 'force-dynamic';

// Vai trò cấu hình được (CEO/CFO luôn toàn quyền → không đưa vào ma trận).
const CONFIG_ROLES: Role[] = ['division_lead', 'dept_lead', 'staff'];

const CAPS: { key: 'edit' | 'delete' | 'create'; label: string; note: string }[] = [
  { key: 'edit', label: 'Sửa OKR', note: 'Sửa tiêu đề, KR, check-in, việc thực thi' },
  { key: 'delete', label: 'Xoá OKR', note: 'Xoá vĩnh viễn Objective' },
  { key: 'create', label: 'Tạo OKR', note: 'Tạo Objective mới (cá nhân luôn tự tạo được)' },
];

export default async function AdminPermissions({
  searchParams,
}: {
  searchParams: { saved?: string };
}) {
  const me = await requireUser();
  if (!canAdmin(me.role)) redirect('/');

  const [perms, users] = await Promise.all([loadOkrPerms(), listUsers()]);
  const has = (cap: 'edit' | 'delete' | 'create', r: Role) =>
    (cap === 'edit' ? perms.editRoles : cap === 'delete' ? perms.deleteRoles : perms.createRoles).includes(r);
  const activeUsers = users.filter((u) => u.is_active && u.role !== 'exec');

  return (
    <>
      <SiteHeader active="admin" />
      <div className="wrap">
        <p className="subtitle" style={{ marginBottom: 6 }}>
          <Link href="/admin">← Quản trị</Link>
        </p>
        <div className="pagetitle">Phân quyền OKR<HelpTip k="okr-perms" /></div>
        <p className="subtitle">
          Quy định ai được <b>Sửa / Xoá / Tạo</b> OKR. <b>CEO/CFO luôn toàn quyền</b>. Vai trò được cấp quyền
          chỉ tác động <b>trong phạm vi tổ chức của mình</b> (Giám đốc khối → nhánh khối; Trưởng phòng → phòng;
          chủ trì/người tạo luôn sửa được OKR của mình).
        </p>

        {searchParams.saved && <p className="badge green">Đã lưu phân quyền.</p>}

        <form action={savePermissionsAction}>
          <div className="card" style={{ maxWidth: 720 }}>
            <h3 style={{ marginTop: 0 }}>Quyền theo vai trò</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Quyền</th>
                    {CONFIG_ROLES.map((r) => (
                      <th key={r} style={{ whiteSpace: 'nowrap' }}>{ROLE_LABEL[r]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CAPS.map((c) => (
                    <tr key={c.key}>
                      <td style={{ textAlign: 'left' }}>
                        <b>{c.label}</b>
                        <div className="muted" style={{ fontSize: 12 }}>{c.note}</div>
                      </td>
                      {CONFIG_ROLES.map((r) => (
                        <td key={r} style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            name={`${c.key}_${r}`}
                            defaultChecked={has(c.key, r)}
                            style={{ width: 'auto' }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>
              Mặc định đề xuất: Sửa/Tạo = Giám đốc khối + Trưởng phòng; Xoá = chỉ CEO/CFO. Nhân viên luôn tạo
              & sửa được OKR cá nhân của mình (trong 3 giờ với check-in/bình luận — xem mục Check-in).
            </p>
          </div>

          <div className="card" style={{ maxWidth: 720 }}>
            <h3 style={{ marginTop: 0 }}>Quản trị OKR (toàn quyền, mọi OKR)</h3>
            <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
              Những người được chọn dưới đây được <b>Sửa / Xoá / Tạo mọi OKR</b> bất kể phạm vi — ngang CEO/CFO
              về quyền OKR. Chỉ chọn người thật sự cần.
            </p>
            {activeUsers.length === 0 ? (
              <p className="muted">Chưa có người dùng nào (ngoài CEO/CFO).</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 6 }}>
                {activeUsers.map((u) => (
                  <label key={u.email} className="f" style={{ display: 'flex', gap: 8, alignItems: 'center', margin: 0 }}>
                    <input
                      type="checkbox"
                      name="admins"
                      value={u.email}
                      defaultChecked={perms.admins.includes(u.email.toLowerCase())}
                      style={{ width: 'auto' }}
                    />
                    <span>
                      {u.display_name || u.email}
                      <span className="muted" style={{ fontSize: 11.5 }}> · {ROLE_LABEL[u.role]}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 4, marginBottom: 24 }}>
            <button className="btn" type="submit">Lưu phân quyền</button>
          </div>
        </form>
      </div>
    </>
  );
}
