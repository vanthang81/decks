import { notFound } from 'next/navigation';
import { getGroup, listMembers } from '@/lib/groups';
import { addGroupMemberAction, removeGroupMemberAction, setGroupWatermarkAction } from '../../actions';
import WmSelect from '@/components/WmSelect';

export const dynamic = 'force-dynamic';

export default async function GroupDetailPage({ params }: { params: { id: string } }) {
  const group = await getGroup(params.id);
  if (!group) notFound();
  const members = await listMembers(group.id).catch(() => []);

  return (
    <div>
      <h2>{group.name}</h2>
      {group.description && <p className="muted">{group.description}</p>}
      <p className="muted">Thành viên nhóm sẽ tự được cấp quyền mọi deck đã cấp cho nhóm này. Bỏ khỏi nhóm = thu hồi các quyền phát sinh từ nhóm.</p>

      <div className="row" style={{ alignItems: 'center', gap: 10, margin: '10px 0 4px' }}>
        <b>💧 Watermark cho nhóm này:</b>
        <WmSelect
          action={setGroupWatermarkAction}
          hidden={{ group_id: group.id }}
          value={group.watermark === true ? 'on' : group.watermark === false ? 'off' : 'inherit'}
        />
      </div>
      <p className="muted" style={{ marginTop: 0, fontSize: 13, maxWidth: 680 }}>
        Áp cho người xem vào deck <b>qua nhóm này</b>. <b>Kế thừa</b> = theo mặc định của deck. Override riêng từng
        người (ở trang deck) vẫn ưu tiên cao hơn nhóm. "Tắt" chỉ ẩn dấu định danh — vẫn kiểm soát truy cập + log.
      </p>

      <h2 style={{ marginTop: 8 }}>Thêm người xem vào nhóm</h2>
      <form action={addGroupMemberAction} style={{ maxWidth: 560, marginBottom: 32 }}>
        <input type="hidden" name="group_id" value={group.id} />
        <div className="row">
          <div style={{ flex: 1 }}><label htmlFor="email">Email</label><input id="email" name="email" type="email" required /></div>
          <div style={{ flex: 1 }}><label htmlFor="name">Tên</label><input id="name" name="name" /></div>
        </div>
        <label htmlFor="company">Công ty (tùy chọn)</label>
        <input id="company" name="company" />
        <div style={{ marginTop: 14 }}><button className="btn primary" type="submit">Thêm vào nhóm</button></div>
      </form>

      <h2>Thành viên ({members.length})</h2>
      <table>
        <thead><tr><th>Người xem</th><th>Công ty</th><th></th></tr></thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.viewer_id}>
              <td>{m.name ? `${m.name} · ` : ''}<span className="muted">{m.email}</span></td>
              <td className="muted">{m.company ?? '—'}</td>
              <td>
                <form action={removeGroupMemberAction}>
                  <input type="hidden" name="group_id" value={group.id} />
                  <input type="hidden" name="viewer_id" value={m.viewer_id} />
                  <button className="btn" type="submit">Bỏ khỏi nhóm</button>
                </form>
              </td>
            </tr>
          ))}
          {members.length === 0 && <tr><td colSpan={3} className="muted">Chưa có thành viên.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
