import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import ConfirmButton from '@/components/ConfirmButton';
import { requireUser } from '@/lib/current-user';
import { canAdmin, ROLE_LABEL, ROLES } from '@/lib/rbac';
import { listUsers } from '@/lib/users';
import { listUnits } from '@/lib/org';
import { saveUserAction, toggleUserAction, removeUserAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function AdminUsers() {
  const me = await requireUser();
  if (!canAdmin(me.role)) redirect('/');
  const [users, units] = await Promise.all([listUsers(), listUnits()]);

  return (
    <>
      <SiteHeader active="admin" />
      <div className="wrap">
        <div className="pagetitle">Người dùng & phân quyền</div>
        <p className="subtitle">
          Thêm bằng email Google. Vai trò: CEO/CFO (toàn quyền) · GĐ khối · Trưởng phòng · Nhân viên.
        </p>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Thêm / cập nhật người dùng</h3>
          <form action={saveUserAction}>
            <div className="row">
              <div>
                <label className="f">Email Google</label>
                <input className="i" name="email" type="email" placeholder="ten@congty.vn" required />
              </div>
              <div>
                <label className="f">Họ tên</label>
                <input className="i" name="display_name" />
              </div>
              <div>
                <label className="f">Chức danh</label>
                <input className="i" name="title" placeholder="VD: Trưởng phòng Bán lẻ" />
              </div>
            </div>
            <div className="row">
              <div>
                <label className="f">Vai trò</label>
                <select className="i" name="role" defaultValue="staff">
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="f">Đơn vị (nhà)</label>
                <select className="i" name="unit_id" defaultValue="">
                  <option value="">— Không gán —</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.type === 'company' ? 'Công ty' : u.type === 'division' ? 'Khối' : 'Phòng'})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn" type="submit">
                  Lưu
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="table-scroll">
            <table className="t">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Họ tên</th>
                  <th>Vai trò</th>
                  <th>Đơn vị</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.email}>
                    <td className="mono">{u.email}</td>
                    <td>
                      {u.display_name || '—'}
                      {u.title ? <div className="obj-meta">{u.title}</div> : null}
                    </td>
                    <td>
                      <span className="badge">{ROLE_LABEL[u.role]}</span>
                    </td>
                    <td>{u.unit_name || <span className="muted">—</span>}</td>
                    <td>
                      {u.is_active ? (
                        <span className="badge green">Hoạt động</span>
                      ) : (
                        <span className="badge red">Đã khoá</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <form action={toggleUserAction}>
                          <input type="hidden" name="email" value={u.email} />
                          <input type="hidden" name="active" value={u.is_active ? '0' : '1'} />
                          <button className="btn ghost sm" type="submit">
                            {u.is_active ? 'Khoá' : 'Mở'}
                          </button>
                        </form>
                        <form action={removeUserAction}>
                          <input type="hidden" name="email" value={u.email} />
                          <ConfirmButton
                            className="btn ghost sm danger"
                            label="Xoá"
                            title="Xoá người dùng"
                            message={`Xoá "${u.email}" khỏi hệ thống? Người này sẽ không đăng nhập được nữa.`}
                            confirmLabel="Xoá hẳn"
                          />
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
