import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import ConfirmButton from '@/components/ConfirmButton';
import { requireUser } from '@/lib/current-user';
import { loadAccess, canManageSystem } from '@/lib/access';
import { listUnits, buildTree, type UnitNode } from '@/lib/org';
import { createUnitAction, deleteUnitAction } from '../actions';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  company: 'Công ty',
  division: 'Khối',
  department: 'Phòng ban',
};

export default async function AdminOrg() {
  const me = await requireUser();
  if (!canManageSystem(me, await loadAccess())) redirect('/');
  const units = await listUnits();
  const tree = buildTree(units);

  const renderNode = (n: UnitNode, depth: number): React.ReactNode => (
    <div key={n.id}>
      <div className={`obj-row ${depth > 0 ? `indent-${Math.min(depth, 3)}` : ''}`}>
        <div className="obj-main">
          <span className="ttl">{n.name}</span>{' '}
          <span className="badge gray">{TYPE_LABEL[n.type]}</span>
          {n.code ? <span className="obj-meta"> · mã {n.code}</span> : null}
          {!n.is_active && <span className="badge red" style={{ marginLeft: 6 }}>ẩn</span>}
        </div>
        {n.type !== 'company' && (
          <form action={deleteUnitAction}>
            <input type="hidden" name="id" value={n.id} />
            <ConfirmButton
              className="btn ghost sm danger"
              label="Xoá"
              title="Xoá đơn vị"
              message={`Xoá "${n.name}"? Mọi đơn vị con bên dưới cũng sẽ bị xoá theo.`}
              confirmLabel="Xoá hẳn"
            />
          </form>
        )}
      </div>
      {n.children.map((c) => renderNode(c, depth + 1))}
    </div>
  );

  return (
    <>
      <SiteHeader active="admin" />
      <div className="wrap">
        <div className="pagetitle">Cây tổ chức</div>
        <p className="subtitle">Công ty → Khối → Phòng ban. Xoá đơn vị sẽ xoá cả đơn vị con.</p>

        <div className="grid two">
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Sơ đồ tổ chức</h3>
            {tree.length === 0 && <p className="muted">Chưa có đơn vị nào.</p>}
            {tree.map((n) => renderNode(n, 0))}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Thêm đơn vị</h3>
            <form action={createUnitAction}>
              <label className="f">Tên đơn vị</label>
              <input className="i" name="name" placeholder="VD: Khối Kinh doanh / Phòng Bán lẻ" required />
              <div className="row">
                <div>
                  <label className="f">Loại</label>
                  <select className="i" name="type" defaultValue="department">
                    <option value="company">Công ty</option>
                    <option value="division">Khối</option>
                    <option value="department">Phòng ban</option>
                  </select>
                </div>
                <div>
                  <label className="f">Mã (tuỳ chọn)</label>
                  <input className="i" name="code" placeholder="KD, MKT…" />
                </div>
                <div>
                  <label className="f">Thứ tự</label>
                  <input className="i" name="sort" defaultValue="0" />
                </div>
              </div>
              <label className="f">Trực thuộc</label>
              <select className="i" name="parent_id" defaultValue="">
                <option value="">— Gốc (Công ty) —</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({TYPE_LABEL[u.type]})
                  </option>
                ))}
              </select>
              <div style={{ marginTop: 12 }}>
                <button className="btn" type="submit">
                  Thêm đơn vị
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
