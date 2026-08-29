import Link from 'next/link';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import ConfirmButton from '@/components/ConfirmButton';
import ToastForm from '@/components/ToastForm';
import EditUserModal from '@/components/EditUserModal';
import HandoverModal from '@/components/HandoverModal';
import UserFilterBar from '@/components/UserFilterBar';
import SearchSelect from '@/components/SearchSelect';
import { unitTreeOptions } from '@/lib/unit-options';
import { requireUser } from '@/lib/current-user';
import { ROLE_LABEL, ROLES, isExec } from '@/lib/rbac';
import { loadAccess, canManageSystem, canAssignPerms } from '@/lib/access';
import { DEFAULT_GROUPS, defaultGroupForRole } from '@/lib/capabilities';
import { listUsers } from '@/lib/users';
import { listUnits, ancestorIds } from '@/lib/org';
import { handoverCountsAll, type HandoverCounts } from '@/lib/handover';
import { saveUserAction, toggleUserAction, removeUserAction, handoverAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function AdminUsers() {
  const me = await requireUser();
  const access = await loadAccess();
  if (!canManageSystem(me, access)) redirect('/');
  const assignPerms = canAssignPerms(me, access);
  const [users, units, hoCounts] = await Promise.all([listUsers(), listUnits(), handoverCountsAll()]);
  const EMPTY_CO: HandoverCounts = { openTasks: 0, allTasks: 0, objectives: 0, projects: 0, meetings: 0 };
  // Ứng viên thay thế = người đang hoạt động (loại theo từng dòng ở dưới).
  const activeUserOpts = users
    .filter((u) => u.is_active)
    .map((u) => ({
      value: u.email,
      label: `${u.display_name || u.email}${u.title ? ` · ${u.title}` : ''}${u.unit_name ? ` · ${u.unit_name}` : ''}`,
    }));

  // Bộ lọc: danh sách vai trò (đang dùng) + đơn vị (cây thụt cấp) + nhóm quyền.
  const usedRoles = ROLES.filter((r) => users.some((u) => u.role === r));
  const roleOpts = usedRoles.map((r) => ({ value: r, label: ROLE_LABEL[r] }));
  const unitOpts = unitTreeOptions(units);
  const groupOpts = DEFAULT_GROUPS.map((g) => ({ value: g.key, label: `${g.icon} ${g.label}` }));
  // Chuỗi đơn vị (đơn vị của user + mọi cấp trên) → lọc theo Khối cũng bắt được người ở Phòng con.
  const unitChain = (unitId: string | null): string => (unitId ? [...ancestorIds(units, unitId)].join(' ') : '');
  const groupOf = (u: (typeof users)[number]): string =>
    isExec(u.role) ? 'system_admin' : u.perm_group || defaultGroupForRole(u.role);

  return (
    <>
      <SiteHeader active="admin" />
      <div className="wrap">
        <div className="pagetitle">Người dùng & phân quyền</div>
        <p className="subtitle">
          Thêm bằng email Google. Vai trò: CEO · CFO (toàn quyền) · GĐ khối · Trưởng phòng · Nhân viên.
        </p>

        <div className="card" data-tour="admin-users-add">
          <h3 style={{ marginTop: 0 }}>Thêm / cập nhật người dùng</h3>
          <ToastForm action={saveUserAction} done="Đã lưu người dùng">
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
                <SearchSelect name="unit_id" defaultValue="" emptyLabel="— Không gán —"
                  options={unitTreeOptions(units)} />
              </div>
              <div>
                <label className="f">
                  Nhóm quyền
                  {!assignPerms && <span className="muted" style={{ fontWeight: 400 }}> (cần quyền phân quyền)</span>}
                </label>
                <select className="i" name="perm_group" defaultValue="" disabled={!assignPerms}>
                  <option value="">— Mặc định theo vai trò —</option>
                  {DEFAULT_GROUPS.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.icon} {g.label}
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
          </ToastForm>
        </div>

        <div className="card" data-tour="admin-users-table">
          <div data-tour="admin-users-filter">
            <UserFilterBar targetId="users-tbody" total={users.length} roles={roleOpts} units={unitOpts} groups={groupOpts} />
          </div>
          <div className="table-scroll">
            <table className="t">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Họ tên</th>
                  <th>Vai trò</th>
                  <th>Nhóm quyền</th>
                  <th>Mã đơn vị</th>
                  <th>Đơn vị</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="users-tbody">
                {users.map((u) => (
                  <tr
                    key={u.email}
                    data-s={`${u.display_name ?? ''} ${u.email} ${u.title ?? ''}`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()}
                    data-role={u.role}
                    data-units={unitChain(u.unit_id)}
                    data-group={groupOf(u)}
                  >
                    <td className="mono">{u.email}</td>
                    <td>
                      <Link href={`/users/${encodeURIComponent(u.email)}`} className="tbl-link" title="Xem hồ sơ 360°">
                        {u.display_name || u.email}
                      </Link>
                      {u.title ? <div className="obj-meta">{u.title}</div> : null}
                    </td>
                    <td>
                      <span className="badge">{ROLE_LABEL[u.role]}</span>
                    </td>
                    <td>
                      {(() => {
                        const gkey = isExec(u.role) ? 'system_admin' : u.perm_group || defaultGroupForRole(u.role);
                        const g = DEFAULT_GROUPS.find((x) => x.key === gkey);
                        return (
                          <span title={g?.desc}>
                            {g ? `${g.icon} ${g.label}` : gkey}
                            {!u.perm_group && !isExec(u.role) && (
                              <span className="muted" style={{ fontSize: 11 }}> (mặc định)</span>
                            )}
                          </span>
                        );
                      })()}
                    </td>
                    <td>{u.unit_code ? <span className="okr-code">{u.unit_code}</span> : <span className="muted">—</span>}</td>
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
                        <EditUserModal
                          user={{
                            email: u.email,
                            display_name: u.display_name,
                            title: u.title,
                            role: u.role,
                            unit_id: u.unit_id,
                            perm_group: u.perm_group,
                          }}
                          units={units.map((x) => ({ id: x.id, name: x.name, type: x.type, parent_id: x.parent_id, sort: x.sort }))}
                          roles={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
                          groups={DEFAULT_GROUPS.map((g) => ({ key: g.key, icon: g.icon, label: g.label, desc: g.desc }))}
                          assignPerms={assignPerms}
                          action={saveUserAction}
                        />
                        <HandoverModal
                          from={{ email: u.email, name: u.display_name || u.email }}
                          counts={hoCounts[u.email.toLowerCase()] ?? EMPTY_CO}
                          userOptions={activeUserOpts.filter((o) => o.value.toLowerCase() !== u.email.toLowerCase())}
                          action={handoverAction}
                        />
                        <ToastForm action={toggleUserAction} done={u.is_active ? 'Đã khoá người dùng' : 'Đã mở khoá'}>
                          <input type="hidden" name="email" value={u.email} />
                          <input type="hidden" name="active" value={u.is_active ? '0' : '1'} />
                          <button className="btn ghost sm" type="submit">
                            {u.is_active ? 'Khoá' : 'Mở'}
                          </button>
                        </ToastForm>
                        <ToastForm action={removeUserAction} done="Đã xoá người dùng">
                          <input type="hidden" name="email" value={u.email} />
                          <ConfirmButton
                            className="btn ghost sm danger"
                            label="Xoá"
                            title="Xoá người dùng"
                            message={`Xoá "${u.email}" khỏi hệ thống? Người này sẽ không đăng nhập được nữa.`}
                            confirmLabel="Xoá hẳn"
                          />
                        </ToastForm>
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
