import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import { requireUser } from '@/lib/current-user';
import { canAdmin } from '@/lib/rbac';
import { listPeriods } from '@/lib/periods';
import { createPeriodAction, setCurrentPeriodAction, setPeriodStatusAction } from '../actions';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  planning: 'Đang lập kế hoạch',
  active: 'Đang chạy',
  closed: 'Đã đóng',
};

export default async function AdminPeriods() {
  const me = await requireUser();
  if (!canAdmin(me.role)) redirect('/');
  const periods = await listPeriods();

  return (
    <>
      <SiteHeader active="admin" />
      <div className="wrap">
        <div className="pagetitle">Kỳ OKR</div>
        <p className="subtitle">Mỗi kỳ (quý/năm) là một chu kỳ đặt & chấm OKR.</p>

        <div className="grid two">
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Danh sách kỳ</h3>
            {periods.length === 0 && <p className="muted">Chưa có kỳ nào.</p>}
            <div className="table-scroll">
              <table className="t">
                <tbody>
                  {periods.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <b>{p.name}</b>
                        {p.is_current && <span className="badge green" style={{ marginLeft: 6 }}>Hiện tại</span>}
                        <div className="obj-meta">
                          {p.starts_on} → {p.ends_on} · {STATUS_LABEL[p.status]}
                        </div>
                      </td>
                      <td className="right">
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {!p.is_current && (
                            <form action={setCurrentPeriodAction}>
                              <input type="hidden" name="id" value={p.id} />
                              <button className="btn ghost sm" type="submit">
                                Đặt hiện tại
                              </button>
                            </form>
                          )}
                          <form action={setPeriodStatusAction}>
                            <input type="hidden" name="id" value={p.id} />
                            <input
                              type="hidden"
                              name="status"
                              value={p.status === 'closed' ? 'active' : 'closed'}
                            />
                            <button className="btn ghost sm" type="submit">
                              {p.status === 'closed' ? 'Mở lại' : 'Đóng kỳ'}
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Tạo kỳ mới</h3>
            <form action={createPeriodAction}>
              <label className="f">Tên kỳ</label>
              <input className="i" name="name" placeholder="VD: Q4-2026 / FY2026" required />
              <label className="f">Loại</label>
              <select className="i" name="kind" defaultValue="quarter">
                <option value="quarter">Quý</option>
                <option value="year">Năm</option>
              </select>
              <div className="row">
                <div>
                  <label className="f">Bắt đầu</label>
                  <input className="i" type="date" name="starts_on" required />
                </div>
                <div>
                  <label className="f">Kết thúc</label>
                  <input className="i" type="date" name="ends_on" required />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="btn" type="submit">
                  Tạo kỳ
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
