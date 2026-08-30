import EditModal from '@/components/EditModal';
import ConfirmButton from '@/components/ConfirmButton';
import NavIcon from '@/components/NavIcon';

// Quản lý VỊ TRÍ / CHỨC DANH (preset) trong trang Phân quyền. Mỗi Vị trí = nhãn + Cấp quyền hạn nền
// (base_role → phạm vi) + Nhóm quyền mặc định. Thêm/sửa qua popup (EditModal), xoá có xác nhận.
// Chỉ hiện khi có quyền "Phân quyền" (gác ở trang gọi + server action).

type Pos = { key: string; label: string; base_role: string; perm_group: string };
type RoleOpt = { value: string; label: string };
type GroupOpt = { key: string; icon: string; label: string };

function Fields({ pos, roles, groups }: { pos?: Pos; roles: RoleOpt[]; groups: GroupOpt[] }) {
  return (
    <>
      {pos && <input type="hidden" name="key" value={pos.key} />}
      <label className="f">Tên Vị trí / chức danh</label>
      <input className="i" name="label" required defaultValue={pos?.label ?? ''} placeholder="VD: Quản lý vùng, Phó phòng, Chuyên viên cao cấp" />
      <div className="row">
        <div>
          <label className="f">Cấp quyền hạn nền</label>
          <select className="i" name="base_role" defaultValue={pos?.base_role ?? 'staff'}>
            {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <p className="muted" style={{ fontSize: 11.5, margin: '4px 0 0' }}>Quyết định phạm vi quản lý (đơn vị nào) — như một trong các vai trò sẵn có.</p>
        </div>
        <div>
          <label className="f">Nhóm quyền mặc định</label>
          <select className="i" name="perm_group" defaultValue={pos?.perm_group ?? ''}>
            <option value="">— Mặc định theo vai trò —</option>
            {groups.map((g) => <option key={g.key} value={g.key}>{g.icon} {g.label}</option>)}
          </select>
          <p className="muted" style={{ fontSize: 11.5, margin: '4px 0 0' }}>Bộ năng lực gán sẵn khi chọn vị trí này.</p>
        </div>
      </div>
    </>
  );
}

export default function PositionsManager({
  positions, roles, groups, editable, saveAction, deleteAction,
}: {
  positions: Pos[];
  roles: RoleOpt[];
  groups: GroupOpt[];
  editable: boolean;
  saveAction: (fd: FormData) => Promise<void>;
  deleteAction: (fd: FormData) => Promise<void>;
}) {
  const roleLabel = (v: string) => roles.find((r) => r.value === v)?.label ?? v;
  const groupLabel = (v: string) => (v ? groups.find((g) => g.key === v)?.label ?? v : 'Mặc định theo vai trò');
  return (
    <div className="card">
      <div className="flexbtw" style={{ alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: '0 0 2px' }}>Vị trí / Chức danh (preset)</h3>
          <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
            Tạo sẵn các chức danh của công ty. Khi thêm/sửa người dùng, chọn một Vị trí là tự điền
            Vai trò (cấp quyền) + Nhóm quyền — không phải nhớ từng thứ. Chức danh tách khỏi cấp quyền hạn.
          </p>
        </div>
        {editable && (
          <EditModal title="Thêm Vị trí / chức danh" label="Thêm vị trí" icon={<NavIcon name="plus" />} submitLabel="Lưu vị trí"
            action={saveAction} toastMsg="Đã lưu vị trí"
            dupField="label" dupLabel="vị trí" dupValues={positions.map((p) => p.label)}>
            <Fields roles={roles} groups={groups} />
          </EditModal>
        )}
      </div>

      {positions.length === 0 ? (
        <p className="muted" style={{ margin: '10px 0 0' }}>Chưa có Vị trí nào. {editable ? 'Bấm "Thêm vị trí" để tạo chức danh dùng chung.' : ''}</p>
      ) : (
        <div className="table-scroll" style={{ marginTop: 10 }}>
          <table className="t">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Vị trí / chức danh</th>
                <th style={{ textAlign: 'left' }}>Cấp quyền hạn nền</th>
                <th style={{ textAlign: 'left' }}>Nhóm quyền mặc định</th>
                {editable && <th></th>}
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.key}>
                  <td><b>{p.label}</b></td>
                  <td><span className="badge">{roleLabel(p.base_role)}</span></td>
                  <td>{groupLabel(p.perm_group)}</td>
                  {editable && (
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <EditModal title={`Sửa vị trí · ${p.label}`} label="Sửa" submitLabel="Lưu vị trí"
                          action={saveAction} toastMsg="Đã lưu vị trí">
                          <Fields pos={p} roles={roles} groups={groups} />
                        </EditModal>
                        <form action={deleteAction}>
                          <input type="hidden" name="key" value={p.key} />
                          <ConfirmButton className="btn ghost sm danger" label="Xoá" title="Xoá vị trí"
                            message={`Xoá vị trí "${p.label}"? (Không ảnh hưởng người dùng đã gán — vị trí chỉ là preset điền nhanh.)`}
                            confirmLabel="Xoá" />
                        </form>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
