import Link from 'next/link';
import { listGroups } from '@/lib/groups';
import { createGroupAction, deleteGroupAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function GroupsPage() {
  const groups = await listGroups().catch(() => []);
  return (
    <div>
      <h2>Nhóm người xem</h2>
      <p className="muted">Gom người xem thành nhóm (vd "Nhà đầu tư vòng A", "Đối tác"). Cấp một deck cho cả nhóm → mỗi thành viên tự nhận link cá nhân + watermark riêng. Thêm người vào nhóm sau sẽ tự có quyền các deck của nhóm.</p>

      <table style={{ marginBottom: 32 }}>
        <thead><tr><th>Nhóm</th><th>Số thành viên</th><th></th></tr></thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.id}>
              <td><b>{g.name}</b>{g.description && <div className="muted" style={{ fontSize: 13 }}>{g.description}</div>}</td>
              <td>{g.member_count ?? 0}</td>
              <td>
                <div className="row" style={{ gap: 6 }}>
                  <Link className="btn" href={`/admin/groups/${g.id}`}>Quản lý</Link>
                  <form action={deleteGroupAction}>
                    <input type="hidden" name="group_id" value={g.id} />
                    <button className="btn" type="submit">Xoá</button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
          {groups.length === 0 && <tr><td colSpan={3} className="muted">Chưa có nhóm nào.</td></tr>}
        </tbody>
      </table>

      <h2>Tạo nhóm</h2>
      <form action={createGroupAction} style={{ maxWidth: 520 }}>
        <label htmlFor="name">Tên nhóm</label>
        <input id="name" name="name" placeholder="vd: Nhà đầu tư vòng A" required />
        <label htmlFor="description">Mô tả</label>
        <input id="description" name="description" />
        <div style={{ marginTop: 16 }}><button className="btn primary" type="submit">Tạo nhóm</button></div>
      </form>
    </div>
  );
}
