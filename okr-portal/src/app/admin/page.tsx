import Link from 'next/link';
import HelpTip from '@/components/HelpTip';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import NavIcon from '@/components/NavIcon';
import { requireUser } from '@/lib/current-user';
import { loadAccess, canManageSystem } from '@/lib/access';
import { listUsers } from '@/lib/users';
import { listUnits } from '@/lib/org';
import { listPeriods, getCurrentPeriod } from '@/lib/periods';
import { listKpiMetrics } from '@/lib/kpi';
import { unresolvedErrorCount } from '@/lib/errlog';
import { listAudit } from '@/lib/audit';
import { syncKpiAction, sendDigestAction, runCheckpointAction } from './actions';
import ImportOkr from '@/components/ImportOkr';

// Thẻ điều hướng có icon (trong Quản trị).
function NavCard({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <Link className="card admin-card" href={href}>
      <span className="admin-card-ic"><NavIcon name={icon} /></span>
      <span>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <p className="muted" style={{ margin: '4px 0 0' }}>{desc}</p>
      </span>
    </Link>
  );
}

export const dynamic = 'force-dynamic';

export default async function AdminHome({ searchParams }: { searchParams: { kpi?: string; digest?: string; chk?: string } }) {
  const user = await requireUser();
  const access = await loadAccess();
  if (!canManageSystem(user, access)) redirect('/');

  const [users, units, periods, curPeriod, errCount, lastChkArr] = await Promise.all([
    listUsers(),
    listUnits(),
    listPeriods(),
    getCurrentPeriod(),
    unresolvedErrorCount().catch(() => 0),
    listAudit({ q: 'system.checkpoint' }, 1, 0).catch(() => []),
  ]);
  const metrics = listKpiMetrics();
  const kpiMsg = searchParams.kpi;
  const digestMsg = searchParams.digest;
  const chkMsg = searchParams.chk;
  const lastChk = lastChkArr[0] ?? null;
  const lastChkAt = lastChk
    ? new Date(lastChk.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    : null;
  const lastChkIssues = lastChk?.detail && Array.isArray((lastChk.detail as { issues?: unknown }).issues)
    ? ((lastChk.detail as { issues: unknown[] }).issues).length
    : null;

  return (
    <>
      <SiteHeader active="admin" />
      <div className="wrap">
        <div className="pagetitle">Quản trị hệ thống<HelpTip k="admin" /></div>
        <p className="subtitle">Chỉ CEO/CFO. Thiết lập nền tảng · đo lường · tự động hoá.</p>

        {/* 1) Nền tảng tổ chức */}
        <div className="admin-sec-h">1 · Nền tảng tổ chức</div>
        <div className="grid two" data-tour="admin-foundation">
          <NavCard href="/admin/users" icon="user" title="Người dùng & phân quyền"
            desc={`${users.length} tài khoản · thêm/khoá, gán vai trò CEO/CFO · GĐ khối · Trưởng phòng · NV.`} />
          <NavCard href="/admin/org" icon="sliders" title="Cây tổ chức"
            desc={`${units.length} đơn vị · Công ty → Khối → Phòng ban.`} />
          <NavCard href="/admin/periods" icon="calendar" title="Kỳ OKR"
            desc={`${periods.length} kỳ · đặt kỳ hiện tại, đóng/mở kỳ.`} />
          <NavCard href="/admin/permissions" icon="sliders" title="Phân quyền (Nhóm quyền × Năng lực)"
            desc="Nhóm quyền (Quản trị · OKR Admin · Quản lý · Cộng tác · Người xem) từ Sổ năng lực. Gán nhóm cho user ở Người dùng." />
        </div>

        {/* 2) Đo lường & thiết lập */}
        <div className="admin-sec-h">2 · Đo lường &amp; thiết lập</div>
        <div className="grid two" data-tour="admin-measure">
          <NavCard href="/admin/kpi" icon="chart" title="Thư viện KPI"
            desc="Chỉ số đo dùng lại: viễn cảnh BSC · module (KRA) · tầng & trọng số · nguồn (auto/tay) · ngưỡng W/A/E · chủ sở hữu." />
          <NavCard href="/admin/settings" icon="review" title="Cài đặt · Nhắc check-in"
            desc="Bật/tắt email nhắc check-in, chọn thứ gửi · ngưỡng ngày · người nhận." />
          <NavCard href="/admin/errors" icon="review" title={errCount > 0 ? `Nhật ký lỗi hệ thống · ${errCount} lỗi mới` : 'Nhật ký lỗi hệ thống'}
            desc="Tự ghi lỗi server/render (digest) để phát hiện & sửa nhanh. Tra digest trong log container để lấy chi tiết." />
          <NavCard href="/admin/activity" icon="user" title="Nhật ký hoạt động"
            desc="Ai đăng nhập / làm gì (tạo·sửa·xoá OKR·việc·dự án·họp·người dùng). Lọc theo người/loại/ngày · tự xoá theo thời hạn + xoá thủ công (chống phình DB)." />
        </div>

        {/* 3) Tự động hoá & trao đổi dữ liệu */}
        <div className="admin-sec-h">3 · Tự động hoá &amp; trao đổi dữ liệu</div>
        <div className="grid two" data-tour="admin-automation">
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
            <h3 style={{ marginTop: 0 }}>Bản tin điều hành tuần</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Gửi email tóm tắt (nhịp độ · Nhận định &amp; Khuyến nghị · KPI cảnh báo · việc quá hạn) tới Ban
              lãnh đạo. Cron n8n gửi tự động hằng tuần; bấm để gửi thử ngay.
            </p>
            <form action={sendDigestAction}>
              <button className="btn" type="submit">
                Gửi bản tin ngay
              </button>
            </form>
            {digestMsg && (
              <p className="muted" style={{ marginBottom: 0, marginTop: 8 }}>
                {digestMsg.startsWith('ok:') ? (
                  <span className="badge green">Đã gửi {digestMsg.slice(3)} email</span>
                ) : (
                  <span className="badge red">Lỗi: {digestMsg.replace(/^err:/, '')}</span>
                )}
              </p>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Kiểm tra sức khỏe hệ thống (Checkpoint)</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Tự rà &amp; <b>tự sửa</b> dữ liệu (điền Đơn vị việc theo người phụ trách · sinh Mã việc còn
              trống) + QC (mã trùng/trống · việc thiếu đơn vị · user thiếu phòng · dữ liệu mồ côi). Cron n8n
              chạy tự động hằng ngày; <b>chỉ email CFO khi có vấn đề nghiêm trọng</b>. Bấm để kiểm tra ngay.
            </p>
            <form action={runCheckpointAction}>
              <button className="btn" type="submit">Kiểm tra &amp; tự sửa ngay</button>
            </form>
            {chkMsg && (
              <p className="muted" style={{ marginBottom: 0, marginTop: 8 }}>
                {chkMsg.startsWith('ok:') ? (() => {
                  const [fu, fc, iss, hi] = chkMsg.slice(3).split('.').map((x) => Number(x) || 0);
                  return Number(iss) === 0 ? (
                    <span className="badge green">✓ Sạch — đã tự sửa {fu} đơn vị · {fc} mã việc</span>
                  ) : (
                    <span className={Number(hi) > 0 ? 'badge red' : 'badge amber'}>
                      {iss} vấn đề{Number(hi) > 0 ? ` · ${hi} nghiêm trọng` : ''} — đã tự sửa {fu} đơn vị · {fc} mã việc
                    </span>
                  );
                })() : (
                  <span className="badge red">Lỗi: {chkMsg.replace(/^err:/, '')}</span>
                )}
              </p>
            )}
            {lastChkAt && (
              <p className="muted" style={{ marginBottom: 0, marginTop: 8, fontSize: 12.5 }}>
                Lần chạy gần nhất: {lastChkAt}
                {lastChkIssues !== null && (lastChkIssues === 0 ? ' · không có vấn đề' : ` · ${lastChkIssues} vấn đề`)}.
                {' '}<Link href="/admin/activity">Xem nhật ký</Link>
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
        </div>

        {/* 4) Bắt đầu nhanh (richer) */}
        <div className="admin-sec-h">4 · Bắt đầu nhanh</div>
        <div className="card" data-tour="admin-quickstart">
          <p className="muted" style={{ marginTop: 0 }}>
            Trình tự thiết lập hệ thống từ đầu — bấm từng bước để mở đúng nơi:
          </p>
          <ol className="admin-guide">
            <li><Link href="/admin/org">Tạo cây tổ chức</Link> (Công ty → Khối → Phòng).</li>
            <li><Link href="/admin/users">Thêm người dùng</Link> + gán vai trò &amp; đơn vị.</li>
            <li><Link href="/admin/permissions">Cấu hình nhóm quyền</Link> (nếu cần siết/mở quyền theo nhóm).</li>
            <li><Link href="/admin/periods">Tạo kỳ OKR</Link> và đặt “hiện tại”.</li>
            <li><Link href="/admin/kpi">Khai báo Thư viện KPI</Link> (viễn cảnh BSC · trọng số · ngưỡng · nguồn).</li>
            <li><Link href="/strategy">Khai báo Chiến lược</Link> → <Link href="/objectives">tạo OKR</Link> → gắn KPI → <Link href="/projects">Dự án</Link>/<Link href="/tasks">Công việc</Link>.</li>
            <li>Thiết lập <Link href="/admin/settings">nhắc check-in</Link> &amp; bản tin tuần để duy trì nhịp điều hành.</li>
          </ol>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <a className="btn" href="/?tour=1">🧭 Chạy hướng dẫn nhanh trên màn hình</a>
            <Link className="btn ghost" href="/guide">📖 Xem hướng dẫn đầy đủ</Link>
          </div>
        </div>
      </div>
    </>
  );
}
