import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getAdmin, listAdmins } from '@/lib/admins';
import { addAdminAction, setAdminActiveAction, setAdminRoleAction, removeAdminAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function AdminsPage() {
  const session = await auth();
  const me = session?.user?.email ? await getAdmin(session.user.email) : null;
  if (me?.role !== 'admin') redirect('/admin?err=forbidden');

  const admins = await listAdmins().catch(() => []);

  return (
    <div>
      <h2>Quản trị viên</h2>
      <p className="muted">Người đăng nhập Google để quản portal. <b>admin</b> = toàn quyền (quản được cả quản trị viên khác); <b>editor</b> = quản deck/người xem/link, không đụng mục này.</p>

      <table style={{ marginBottom: 32 }}>
        <thead><tr><th>Email</th><th>Tên</th><th>Vai trò</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>
          {admins.map((a) => (
            <tr key={a.email}>
              <td>{a.email}{a.email.toLowerCase() === me.email.toLowerCase() && <span className="muted"> (bạn)</span>}</td>
              <td className="muted">{a.display_name ?? '—'}</td>
              <td>
                <form action={setAdminRoleAction} className="row" style={{ gap: 6 }}>
                  <input type="hidden" name="email" value={a.email} />
                  <select name="role" defaultValue={a.role} style={{ width: 'auto', padding: '4px 8px' }}>
                    <option value="admin">admin</option>
                    <option value="editor">editor</option>
                  </select>
                  <button className="btn" type="submit" style={{ padding: '5px 10px' }}>Đổi</button>
                </form>
              </td>
              <td>
                <span className={`pill ${a.is_active ? 'ok' : 'bad'}`}>{a.is_active ? 'Hoạt động' : 'Khoá'}</span>
              </td>
              <td>
                <div className="row" style={{ gap: 6 }}>
                  <form action={setAdminActiveAction}>
                    <input type="hidden" name="email" value={a.email} />
                    <input type="hidden" name="active" value={a.is_active ? 'false' : 'true'} />
                    <button className="btn" type="submit">{a.is_active ? 'Khoá' : 'Mở'}</button>
                  </form>
                  {a.email.toLowerCase() !== me.email.toLowerCase() && (
                    <form action={removeAdminAction}>
                      <input type="hidden" name="email" value={a.email} />
                      <button className="btn" type="submit">Xoá</button>
                    </form>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Thêm quản trị viên</h2>
      <form action={addAdminAction} style={{ maxWidth: 520 }}>
        <label htmlFor="email">Email Google</label>
        <input id="email" name="email" type="email" required />
        <label htmlFor="display_name">Tên hiển thị</label>
        <input id="display_name" name="display_name" />
        <label htmlFor="role">Vai trò</label>
        <select id="role" name="role" defaultValue="editor">
          <option value="editor">editor — quản deck/người xem/link</option>
          <option value="admin">admin — toàn quyền</option>
        </select>
        <div style={{ marginTop: 16 }}><button className="btn primary" type="submit">Thêm</button></div>
      </form>
    </div>
  );
}
