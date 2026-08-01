import Link from 'next/link';
import HelpTip from '@/components/HelpTip';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import { requireUser } from '@/lib/current-user';
import { loadAccess, canManageSystem } from '@/lib/access';
import { listUsers } from '@/lib/users';
import { listUnits } from '@/lib/org';
import { listPeriods, getCurrentPeriod } from '@/lib/periods';
import { listKpiMetrics } from '@/lib/kpi';
import { syncKpiAction } from './actions';
import ImportOkr from '@/components/ImportOkr';

export const dynamic = 'force-dynamic';

export default async function AdminHome({ searchParams }: { searchParams: { kpi?: string } }) {
  const user = await requireUser();
  const access = await loadAccess();
  if (!canManageSystem(user, access)) redirect('/');

  const [users, units, periods, curPeriod] = await Promise.all([
    listUsers(),
    listUnits(),
    listPeriods(),
    getCurrentPeriod(),
  ]);
  const metrics = listKpiMetrics();
  const kpiMsg = searchParams.kpi;

  return (
    <>
      <SiteHeader active="admin" />
      <div className="wrap">
        <div className="pagetitle">Quản trị hệ thống<HelpTip k="admin" /></div>
        <p className="subtitle">Chỉ CEO/CFO. Thiết lập cây tổ chức, người dùng và kỳ OKR.</p>

        <div className="grid two">
          <Link className="card" href="/admin/users" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h3 style={{ marginTop: 0 }}>Người dùng & phân quyền</h3>
            <p className="muted" style={{ marginBottom: 0 }}>
              {users.length} tài khoản · thêm/khoá, gán vai trò CEO/CFO · GĐ khối · Trưởng phòng · NV.
            </p>
          </Link>
          <Link className="card" href="/admin/org" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h3 style={{ marginTop: 0 }}>Cây tổ chức</h3>
            <p className="muted" style={{ marginBottom: 0 }}>
              {units.length} đơn vị · Công ty → Khối → Phòng ban.
            </p>
          </Link>
          <Link className="card" href="/admin/periods" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h3 style={{ marginTop: 0 }}>Kỳ OKR</h3>
            <p className="muted" style={{ marginBottom: 0 }}>
              {periods.length} kỳ · đặt kỳ hiện tại, đóng/mở kỳ.
            </p>
          </Link>
          <Link className="card" href="/admin/permissions" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h3 style={{ marginTop: 0 }}>Phân quyền (Nhóm quyền × Năng lực)</h3>
            <p className="muted" style={{ marginBottom: 0 }}>
              Cấu hình Nhóm quyền (Quản trị hệ thống · OKR Admin · Quản lý · Cộng tác · Người xem) từ Sổ năng lực tự cập nhật. Gán nhóm cho user ở Người dùng.
            </p>
          </Link>
          <Link className="card" href="/admin/kpi" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h3 style={{ marginTop: 0 }}>Thư viện KPI</h3>
            <p className="muted" style={{ marginBottom: 0 }}>
              Khai báo chỉ số đo dùng lại: viễn cảnh BSC · module (KRA) · tầng &amp; trọng số · nguồn (auto/tay) · ngưỡng W/A/E · chủ sở hữu.
            </p>
          </Link>
          <Link className="card" href="/admin/settings" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h3 style={{ marginTop: 0 }}>Cài đặt · Nhắc check-in</h3>
            <p className="muted" style={{ marginBottom: 0 }}>
              Bật/tắt email nhắc check-in, chọn thứ gửi · ngưỡng ngày · người nhận.
            </p>
          </Link>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Đồng bộ KPI (BigQuery)</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Kéo kế hoạch (ĐHCĐ) + thực hiện cho các Key Result gắn nguồn KPI. Nguồn:
            </p>
            <ul className="muted" style={{ marginTop: 0, paddingLeft: 18 }}>
              {metrics.map((m) => (
                <li key={m.key}>
                  <b>{m.key}</b> — {m.label}
                </li>
              ))}
            </ul>
            <form action={syncKpiAction}>
              <button className="btn" type="submit">
                Đồng bộ ngay
              </button>
            </form>
            {kpiMsg && (
              <p className="muted" style={{ marginBottom: 0, marginTop: 8 }}>
                {kpiMsg.startsWith('ok:') ? (
                  <span className="badge green">Đã cập nhật {kpiMsg.slice(3)} KR</span>
                ) : (
                  <span className="badge red">Lỗi: {kpiMsg.replace(/^err:/, '')}</span>
                )}
              </p>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Import / Export Excel (có mã unique)</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Xuất toàn bộ OKR (mã <b>BL-O1</b>, <b>BL-O1.KR1</b>, <b>BL-O1.H01</b>) ra Excel để chia sẻ,
              sửa hàng loạt rồi nhập lại theo mã.
            </p>
            <a
              className="btn ghost"
              href={`/api/export${curPeriod ? `?period=${curPeriod.id}` : ''}`}
              style={{ marginBottom: 12 }}
            >
              ⬇ Xuất Excel {curPeriod ? `(${curPeriod.name})` : '(tất cả)'}
            </a>
            <ImportOkr />
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Hướng dẫn nhanh</h3>
            <ol className="muted" style={{ margin: 0, paddingLeft: 18 }}>
              <li>Tạo cây tổ chức (khối, phòng).</li>
              <li>Thêm người dùng + gán vai trò & đơn vị.</li>
              <li>Tạo kỳ OKR và đặt “hiện tại”.</li>
              <li>Bắt đầu tạo OKR ở mục “OKR”.</li>
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}
