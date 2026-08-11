import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import ToastForm from '@/components/ToastForm';
import { requireUser } from '@/lib/current-user';
import { loadAccess, canManageSystem } from '@/lib/access';
import { listRecentErrors } from '@/lib/errlog';
import { fmtDateTime } from '@/lib/format';
import { resolveErrorAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nhật ký lỗi · BTMH OKR' };

export default async function AdminErrors() {
  const me = await requireUser();
  if (!canManageSystem(me, await loadAccess())) redirect('/');
  const errors = await listRecentErrors(200);
  const open = errors.filter((e) => !e.resolved);

  return (
    <>
      <SiteHeader active="admin" />
      <div className="wrap">
        <div className="pagetitle">Nhật ký lỗi hệ thống</div>
        <p className="subtitle">
          Lỗi server/render được TỰ ghi lại (qua error boundary → /api/errlog) để phát hiện &amp; sửa nhanh.
          Dùng <b>Mã lỗi (digest)</b> để tra chi tiết trong log container:
          <span className="mono" style={{ fontSize: 12 }}> docker logs okr-portal-vt 2&gt;&amp;1 | grep &lt;digest&gt;</span>.
        </p>

        <div className="card">
          <div className="flexbtw" style={{ alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0 }}>Lỗi gần đây</h3>
            <span className={`badge ${open.length ? 'red' : 'green'}`}>{open.length ? `${open.length} lỗi chưa xử lý` : 'Không có lỗi chưa xử lý'}</span>
          </div>

          {errors.length === 0 ? (
            <p className="muted" style={{ marginBottom: 0 }}>Chưa ghi nhận lỗi nào. 🎉</p>
          ) : (
            <div className="table-scroll" style={{ marginTop: 10 }}>
              <table className="t">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Thời điểm</th>
                    <th style={{ textAlign: 'left' }}>Trang</th>
                    <th style={{ textAlign: 'left' }}>Thông báo</th>
                    <th style={{ textAlign: 'left' }}>Digest</th>
                    <th className="right">Số lần</th>
                    <th style={{ textAlign: 'left' }}>Người gặp</th>
                    <th>Trạng thái</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {errors.map((e) => (
                    <tr key={e.id} style={e.resolved ? { opacity: 0.55 } : undefined}>
                      <td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{fmtDateTime(e.created_at)}</td>
                      <td className="mono" style={{ fontSize: 12 }}>{e.path || <span className="muted">—</span>}</td>
                      <td style={{ fontSize: 12.5, maxWidth: 360 }}>{e.message || <span className="muted">—</span>}</td>
                      <td className="mono" style={{ fontSize: 12 }}>{e.digest || <span className="muted">—</span>}</td>
                      <td className="right mono">{e.count}</td>
                      <td style={{ fontSize: 12 }}>{e.user_email || <span className="muted">—</span>}</td>
                      <td>{e.resolved ? <span className="badge green">Đã xử lý</span> : <span className="badge red">Mới</span>}</td>
                      <td className="right">
                        <ToastForm action={resolveErrorAction} done={e.resolved ? 'Đã mở lại' : 'Đã đánh dấu xử lý'}>
                          <input type="hidden" name="id" value={e.id} />
                          <input type="hidden" name="resolved" value={e.resolved ? '0' : '1'} />
                          <button className="btn ghost sm" type="submit">{e.resolved ? 'Mở lại' : 'Đánh dấu đã xử lý'}</button>
                        </ToastForm>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
