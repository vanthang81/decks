import ToastForm from '@/components/ToastForm';
import ConfirmButton from '@/components/ConfirmButton';
import SearchSelect from '@/components/SearchSelect';
import UserLink from '@/components/UserLink';
import type { ProjectMember } from '@/lib/project-members';

// Thành viên dự án — nền tảng phân quyền XEM (CFO 04/09). Người quản dự án thêm/bớt;
// ngoài danh sách này, chủ trì + người tạo + người được giao việc + Quản trị/CEO/CFO vẫn xem được.
export default function ProjectMembers({
  projectId,
  members,
  owner,
  canManage,
  userOptions,
  add,
  del,
}: {
  projectId: string;
  members: ProjectMember[];
  owner: { email: string | null; name: string | null };
  canManage: boolean;
  userOptions: { value: string; label: string; sub?: string }[];
  add: (fd: FormData) => Promise<void>;
  del: (fd: FormData) => Promise<void>;
}) {
  const ownerLc = (owner.email ?? '').toLowerCase();
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Thành viên dự án ({members.length})</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Chỉ <b>thành viên dự án</b> mới xem được dự án này và nội dung bên trong. Ngoài danh sách dưới đây,
        hệ thống tự cho xem: <b>chủ trì</b>, <b>người tạo</b>, <b>người được giao việc</b> trong dự án, và <b>Quản trị / CEO / CFO</b>.
      </p>

      {canManage && (
        <ToastForm action={add} done="Đã thêm thành viên">
          <input type="hidden" name="project_id" value={projectId} />
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div style={{ minWidth: 280, flex: 1 }}>
              <label className="f">Thêm thành viên</label>
              <SearchSelect name="email" defaultValue="" emptyLabel="— Chọn người —" options={userOptions} />
            </div>
            <div>
              <button className="btn" type="submit">Thêm</button>
            </div>
          </div>
        </ToastForm>
      )}

      <div style={{ marginTop: canManage ? 12 : 0 }}>
        {/* Chủ trì luôn có quyền — hiện cố định, không xoá được ở đây. */}
        {owner.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--line,#eee)' }}>
            <UserLink email={owner.email} name={owner.name ?? owner.email} />
            <span className="badge" style={{ fontSize: 11 }}>Chủ trì</span>
          </div>
        )}
        {members.filter((m) => m.email.toLowerCase() !== ownerLc).length === 0 ? (
          <p className="muted" style={{ margin: '10px 0 0', fontSize: 13 }}>
            Chưa thêm thành viên nào.{canManage ? ' Chọn người ở trên để thêm.' : ''}
          </p>
        ) : (
          <div className="table-scroll" style={{ marginTop: 4 }}>
            <table className="t">
              <thead>
                <tr>
                  <th>Thành viên</th>
                  <th>Đơn vị</th>
                  <th>Người thêm</th>
                  {canManage && <th></th>}
                </tr>
              </thead>
              <tbody>
                {members.filter((m) => m.email.toLowerCase() !== ownerLc).map((m) => (
                  <tr key={m.email}>
                    <td>
                      <UserLink email={m.email} name={m.name ?? m.email} />
                      {m.title ? <div className="obj-meta">{m.title}</div> : null}
                    </td>
                    <td>{m.unit_name || <span className="muted">—</span>}</td>
                    <td>{m.added_by || <span className="muted">—</span>}</td>
                    {canManage && (
                      <td>
                        <ToastForm action={del} done="Đã gỡ thành viên">
                          <input type="hidden" name="project_id" value={projectId} />
                          <input type="hidden" name="email" value={m.email} />
                          <ConfirmButton
                            className="btn ghost sm danger"
                            label="Gỡ"
                            title="Gỡ thành viên"
                            message={`Gỡ "${m.name ?? m.email}" khỏi thành viên dự án? Người này sẽ không còn xem được dự án (trừ khi là chủ trì/được giao việc).`}
                            confirmLabel="Gỡ"
                          />
                        </ToastForm>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
