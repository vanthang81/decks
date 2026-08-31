import Link from 'next/link';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import { requireUser } from '@/lib/current-user';
import { loadAccess, canManageSystem } from '@/lib/access';
import { getReminderConfig, WEEKDAY_LABEL } from '@/lib/reminders';
import { getWeeklyDigestEnabled, digestRecipients } from '@/lib/digest';
import { saveReminderAction, testReminderAction, saveDigestSettingsAction, sendDigestAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function AdminSettings({
  searchParams,
}: {
  searchParams: { saved?: string; test?: string; digest?: string };
}) {
  const me = await requireUser();
  if (!canManageSystem(me, await loadAccess())) redirect('/');
  const [cfg, digestOn, digestTo] = await Promise.all([
    getReminderConfig(), getWeeklyDigestEnabled(), digestRecipients(),
  ]);

  return (
    <>
      <SiteHeader active="admin" />
      <div className="wrap">
        <p className="subtitle" style={{ marginBottom: 6 }}>
          <Link href="/admin">← Quản trị</Link>
        </p>
        <div className="pagetitle">Cài đặt · Email tự động</div>
        <p className="subtitle">
          Nhắc check-in &amp; Bản tin điều hành tuần — gửi qua hệ thống mail BTMH.
        </p>

        {searchParams.saved && <p className="badge green">Đã lưu cấu hình.</p>}
        {searchParams.digest && (
          <p className={searchParams.digest.startsWith('ok:') ? 'badge green' : 'badge red'}>
            {searchParams.digest.startsWith('ok:')
              ? `Đã gửi bản tin tới ${searchParams.digest.slice(3)} người.`
              : `Lỗi: ${searchParams.digest.replace(/^err:/, '')}`}
          </p>
        )}
        {searchParams.test && (
          <p className={searchParams.test.startsWith('sent:') ? 'badge green' : 'badge red'}>
            {searchParams.test.startsWith('sent:')
              ? `Đã gửi thử ${searchParams.test.slice(5)} email.`
              : `Lỗi: ${searchParams.test.replace(/^err:/, '')}`}
          </p>
        )}

        <div className="card" style={{ maxWidth: 640 }}>
          <form action={saveReminderAction}>
            <label className="f" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" name="enabled" defaultChecked={cfg.enabled} style={{ width: 'auto' }} />
              Bật nhắc check-in tự động
            </label>

            <div className="row">
              <div>
                <label className="f">Gửi vào</label>
                <select className="i" name="weekday" defaultValue={String(cfg.weekday)}>
                  {WEEKDAY_LABEL.map((w, i) => (
                    <option key={i} value={i}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="f">Ngưỡng "chưa check-in" (ngày)</label>
                <input className="i" name="stale_days" type="number" min={1} defaultValue={cfg.stale_days} />
              </div>
              <div>
                <label className="f">Người nhận</label>
                <select className="i" name="audience" defaultValue={cfg.audience}>
                  <option value="all_owners">Mọi người chủ trì OKR</option>
                  <option value="leads_up">Từ Trưởng phòng trở lên</option>
                </select>
              </div>
            </div>

            <p className="muted" style={{ fontSize: 13 }}>
              Cron chạy hằng ngày 08:00 (giờ VN) và chỉ gửi vào đúng thứ bạn chọn. Người chủ trì có KR
              chưa check-in quá ngưỡng sẽ nhận email kèm danh sách KR + link "OKR của tôi".
            </p>

            <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
              <button className="btn" type="submit">
                Lưu cấu hình
              </button>
            </div>
          </form>

          <hr className="sep" />
          <form action={testReminderAction}>
            <button className="btn ghost" type="submit">
              Gửi thử ngay (bỏ qua điều kiện ngày)
            </button>
          </form>
        </div>

        {/* Bản tin điều hành tuần */}
        <div className="card" style={{ maxWidth: 640 }}>
          <h3 style={{ marginTop: 0 }}>📊 Bản tin điều hành tuần</h3>
          <form action={saveDigestSettingsAction}>
            <label className="f" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" name="enabled" defaultChecked={digestOn} style={{ width: 'auto' }} />
              Bật gửi Bản tin điều hành tuần {digestOn ? '' : '(đang TẮT)'}
            </label>
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              Mặc định TẮT. Khi bật, cron gửi <b>Thứ 2 hằng tuần (07:30 giờ VN)</b> cho những người có năng lực
              <b> “Nhận Bản tin điều hành tuần”</b> (cấu hình nhóm ở{' '}
              <Link href="/admin/permissions">Phân quyền</Link>; mặc định: Quản trị hệ thống &amp; Quản trị OKR).
              Mỗi người có thể tự tắt ở <b>Cài đặt cá nhân</b>.
            </p>
            <div className="card" style={{ background: 'var(--bg)', marginTop: 8 }}>
              <div className="muted" style={{ fontSize: 12.5, marginBottom: digestTo.length ? 6 : 0 }}>
                <b>Người sẽ nhận hiện tại: {digestTo.length}</b>
                {digestTo.length === 0 ? ' — chưa có ai (bật bản tin & cấp năng lực cho nhóm).' : ''}
              </div>
              {digestTo.length > 0 && (
                <div style={{ fontSize: 12.5, display: 'flex', flexWrap: 'wrap', gap: '2px 10px' }}>
                  {digestTo.map((r) => <span key={r.email}>{r.name || r.email}</span>)}
                </div>
              )}
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn" type="submit">Lưu</button>
            </div>
          </form>
          <hr className="sep" />
          <form action={sendDigestAction}>
            <button className="btn ghost" type="submit">Gửi thử ngay (không cần bật công tắc)</button>
          </form>
        </div>
      </div>
    </>
  );
}
