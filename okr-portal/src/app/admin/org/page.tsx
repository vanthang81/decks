import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import ConfirmButton from '@/components/ConfirmButton';
import ToastForm from '@/components/ToastForm';
import EditUnitButton from '@/components/EditUnitButton';
import { requireUser } from '@/lib/current-user';
import { loadAccess, canManageSystem } from '@/lib/access';
import { listUnits, listUnitsAsOf, applyDueUnitVersions, buildTree, type UnitNode } from '@/lib/org';
import { createUnitAction, updateUnitAction, deleteUnitAction } from '../actions';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  company: 'Công ty',
  division: 'Khối',
  department: 'Phòng ban',
};

export default async function AdminOrg({ searchParams }: { searchParams: { asof?: string } }) {
  const me = await requireUser();
  if (!canManageSystem(me, await loadAccess())) redirect('/');

  // XEM CƠ CẤU TẠI THỜI ĐIỂM (?asof=YYYY-MM-DD) = chỉ xem lịch sử; không có ?asof = cơ cấu HIỆN TẠI (sửa được).
  const asof = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.asof ?? '') ? searchParams.asof! : '';
  if (!asof) await applyDueUnitVersions(); // áp các thay đổi đặt lịch đã tới hạn vào ảnh hiện tại
  const units = asof ? await listUnitsAsOf(asof) : await listUnits();
  const tree = buildTree(units);
  const readOnly = !!asof;

  const renderNode = (n: UnitNode, depth: number): React.ReactNode => (
    <div key={n.id}>
      <div className={`obj-row ${depth > 0 ? `indent-${Math.min(depth, 3)}` : ''}`}>
        <div className="obj-main">
          <span className="ttl">{n.name}</span>{' '}
          <span className="badge gray">{TYPE_LABEL[n.type]}</span>
          {n.code ? <span className="obj-meta"> · mã {n.code}</span> : null}
          {!n.is_active && <span className="badge red" style={{ marginLeft: 6 }}>ẩn</span>}
        </div>
        {!readOnly && (
          <div className="row-actions">
            <EditUnitButton
              unit={{ id: n.id, name: n.name, code: n.code, type: n.type, parent_id: n.parent_id, sort: n.sort, is_active: n.is_active }}
              units={units.map((u) => ({ id: u.id, name: u.name, type: u.type, parent_id: u.parent_id }))}
              action={updateUnitAction}
            />
            {n.type !== 'company' && (
              <ToastForm action={deleteUnitAction} done="Đã xoá đơn vị">
                <input type="hidden" name="id" value={n.id} />
                <ConfirmButton
                  className="btn ghost sm danger"
                  label="Xoá"
                  title="Xoá đơn vị"
                  message={`Xoá "${n.name}"? Mọi đơn vị con bên dưới cũng sẽ bị xoá theo.`}
                  confirmLabel="Xoá hẳn"
                />
              </ToastForm>
            )}
          </div>
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
            <div className="flexbtw" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ marginTop: 0 }}>Sơ đồ tổ chức</h3>
              <form method="get" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <label className="muted" style={{ fontSize: 12.5 }}>Xem cơ cấu tại ngày</label>
                <input className="i" type="date" name="asof" defaultValue={asof} style={{ width: 'auto' }} />
                <button className="btn ghost sm" type="submit">Xem</button>
                {asof && <a className="btn ghost sm" href="/admin/org">← Hiện tại</a>}
              </form>
            </div>
            {readOnly && (
              <div className="gnote" style={{ background: 'var(--gold-tint, #fbf3e0)', borderColor: 'var(--accent, #B07B32)', marginBottom: 10 }}>
                Đang xem cơ cấu tại <b>{asof.split('-').reverse().join('/')}</b> — chỉ xem (không sửa). Bấm “← Hiện tại” để về cơ cấu đang dùng.
              </div>
            )}
            {tree.length === 0 && <p className="muted">{readOnly ? 'Chưa có đơn vị nào tại thời điểm này.' : 'Chưa có đơn vị nào.'}</p>}
            {tree.map((n) => renderNode(n, 0))}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Thêm đơn vị</h3>
            <ToastForm action={createUnitAction} done="Đã thêm đơn vị">
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
              <div className="row">
                <div>
                  <label className="f">Trực thuộc</label>
                  <select className="i" name="parent_id" defaultValue="">
                    <option value="">— Gốc (Công ty) —</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({TYPE_LABEL[u.type]})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="f">Áp dụng từ ngày</label>
                  <input className="i" type="date" name="effective_from" />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="btn" type="submit">
                  Thêm đơn vị
                </button>
              </div>
            </ToastForm>
          </div>
        </div>
      </div>
    </>
  );
}
