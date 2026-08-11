import Link from 'next/link';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import ToastForm from '@/components/ToastForm';
import InviteUserButton from '@/components/InviteUserButton';
import { requireUser } from '@/lib/current-user';
import { loadAccess, canApproveUsers } from '@/lib/access';
import { listInvites } from '@/lib/invites';
import { listUnits } from '@/lib/org';
import { ROLE_LABEL, type Role } from '@/lib/rbac';
import { fmtDateTime } from '@/lib/format';
import { decideInviteAction } from '@/app/invites/actions';

export const dynamic = 'force-dynamic';

export default async function AdminInvites() {
  const me = await requireUser();
  const access = await loadAccess();
  if (!canApproveUsers(me, access)) redirect('/');

  const [pending, approved, rejected, units] = await Promise.all([
    listInvites('pending'), listInvites('approved'), listInvites('rejected'), listUnits(),
  ]);
  const unitOpts = units.map((u) => ({ id: u.id, name: u.name, type: u.type, parent_id: u.parent_id, sort: u.sort }));
  const roleLabel = (r: string) => ROLE_LABEL[r as Role] ?? r;
  const recent = [...approved, ...rejected]
    .sort((a, b) => (b.decided_at ?? '').localeCompare(a.decided_at ?? '')).slice(0, 12);

  return (
    <>
      <SiteHeader active="admin" />
      <div className="wrap">
        <p className="subtitle" style={{ marginBottom: 6 }}><Link href="/admin">← Quản trị</Link></p>
        <div className="flexbtw flexbtw-top">
          <div>
            <div className="pagetitle" style={{ marginBottom: 2 }}>Duyệt người dùng</div>
            <p className="subtitle" style={{ marginTop: 0 }}>
              Lời mời thêm người dùng mới (qua email) do mọi người đề xuất — bạn có quyền duyệt/từ chối.
            </p>
          </div>
          <InviteUserButton units={unitOpts} />
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Chờ duyệt {pending.length > 0 && <span className="badge amber" style={{ marginLeft: 6 }}>{pending.length}</span>}</h3>
          {pending.length === 0 ? (
            <p className="muted">Không có lời mời nào đang chờ.</p>
          ) : (
            <div className="table-scroll">
              <table className="t">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Người được mời</th>
                    <th style={{ textAlign: 'left' }}>Vai trò · Đơn vị</th>
                    <th style={{ textAlign: 'left' }}>Người đề xuất</th>
                    <th style={{ textAlign: 'left' }}>Ghi chú</th>
                    <th className="right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((iv) => (
                    <tr key={iv.id}>
                      <td>
                        <div><b>{iv.display_name || iv.email}</b></div>
                        <div className="muted" style={{ fontSize: 12 }}>{iv.email}</div>
                      </td>
                      <td style={{ fontSize: 12.5 }}>
                        {roleLabel(iv.role)}{iv.unit_name ? ` · ${iv.unit_name}` : ''}
                      </td>
                      <td style={{ fontSize: 12.5 }}>
                        {iv.invited_by_name || iv.invited_by}
                        <div className="muted" style={{ fontSize: 11 }}>{fmtDateTime(iv.created_at)}</div>
                      </td>
                      <td style={{ fontSize: 12.5, maxWidth: 240 }}>{iv.note || <span className="muted">—</span>}</td>
                      <td className="right">
                        <div className="row-actions">
                          <ToastForm action={decideInviteAction} done="Đã duyệt — người dùng đã kích hoạt">
                            <input type="hidden" name="id" value={iv.id} />
                            <input type="hidden" name="decision" value="approve" />
                            <button className="btn sm" type="submit">Duyệt</button>
                          </ToastForm>
                          <ToastForm action={decideInviteAction} done="Đã từ chối lời mời">
                            <input type="hidden" name="id" value={iv.id} />
                            <input type="hidden" name="decision" value="reject" />
                            <button className="btn ghost sm" type="submit">Từ chối</button>
                          </ToastForm>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {recent.length > 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Đã xử lý gần đây</h3>
            <div className="table-scroll">
              <table className="t">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Email</th>
                    <th style={{ textAlign: 'left' }}>Kết quả</th>
                    <th style={{ textAlign: 'left' }}>Người duyệt</th>
                    <th style={{ textAlign: 'left' }}>Thời điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((iv) => (
                    <tr key={iv.id}>
                      <td style={{ fontSize: 12.5 }}>{iv.display_name || iv.email}<div className="muted" style={{ fontSize: 11 }}>{iv.email}</div></td>
                      <td><span className={`badge ${iv.status === 'approved' ? 'green' : 'gray'}`}>{iv.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}</span></td>
                      <td style={{ fontSize: 12.5 }}>{iv.decided_by || '—'}</td>
                      <td style={{ fontSize: 12.5 }}>{iv.decided_at ? fmtDateTime(iv.decided_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
