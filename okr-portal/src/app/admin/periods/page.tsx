import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import { requireUser } from '@/lib/current-user';
import { canAdmin } from '@/lib/rbac';
import { listPeriods, orderPeriodsHierarchically, PERIOD_KIND_LABEL } from '@/lib/periods';
import { createPeriodAction, setCurrentPeriodAction, setPeriodStatusAction } from '../actions';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  planning: 'Đang lập kế hoạch',
  active: 'Đang chạy',
  closed: 'Đã đóng',
};
const KIND_CLS: Record<string, string> = {
  multiyear: 'red',
  year: 'blue',
  quarter: 'amber',
  month: 'gray',
};

export default async function AdminPeriods() {
  const me = await requireUser();
  if (!canAdmin(me.role)) redirect('/');
  const periods = await listPeriods();
  const ordered = orderPeriodsHierarchically(periods);

  return (
    <>
      <SiteHeader active="admin" />
      <div className="wrap">
        <div className="pagetitle">Kỳ OKR — khung thời gian</div>
        <p className="subtitle">
          Khung nhiều cấp: <b>Chiến lược nhiều năm (2026–2030) → Năm → Quý → Tháng</b>. Tuần/Ngày nằm ở
          cấp công việc (ngày bắt đầu/hạn + check-in tuần). Gắn “kỳ cha” để tạo cây.
        </p>

        <div className="grid two">
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Cây kỳ</h3>
            {periods.length === 0 && <p className="muted">Chưa có kỳ nào.</p>}
            <div className="table-scroll">
              <table className="t">
                <tbody>
                  {ordered.map(({ period: p, depth }) => (
                    <tr key={p.id}>
                      <td style={{ paddingLeft: 10 + depth * 22 }}>
                        <span className={`badge ${KIND_CLS[p.kind] ?? 'gray'}`} style={{ fontSize: 10 }}>
                          {PERIOD_KIND_LABEL[p.kind]}
                        </span>{' '}
                        <b>{p.name}</b>
                        {p.is_current && (
                          <span className="badge green" style={{ marginLeft: 6 }}>
                            Hiện tại
                          </span>
                        )}
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
              <input className="i" name="name" placeholder="VD: Chiến lược 2026–2030 / 2026 / Q3-2026 / T8-2026" required />
              <div className="row">
                <div>
                  <label className="f">Cấp</label>
                  <select className="i" name="kind" defaultValue="quarter">
                    <option value="multiyear">Chiến lược nhiều năm</option>
                    <option value="year">Năm</option>
                    <option value="quarter">Quý</option>
                    <option value="month">Tháng</option>
                  </select>
                </div>
                <div>
                  <label className="f">Thuộc kỳ cha (tuỳ chọn)</label>
                  <select className="i" name="parent_id" defaultValue="">
                    <option value="">— Không (kỳ gốc) —</option>
                    {ordered.map(({ period: p, depth }) => (
                      <option key={p.id} value={p.id}>
                        {' '.repeat(depth * 2)}
                        {PERIOD_KIND_LABEL[p.kind]}: {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
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
