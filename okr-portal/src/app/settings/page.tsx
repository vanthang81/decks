import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import HelpTip from '@/components/HelpTip';
import NotifSettingsForm from '@/components/NotifSettingsForm';
import ToastForm from '@/components/ToastForm';
import { requireUser } from '@/lib/current-user';
import { getNotifSettings, NOTIF_TYPE_META } from '@/lib/notifications';
import { calendarGloballyOn } from '@/lib/gcal';
import { listUnits } from '@/lib/org';
import { ROLE_LABEL, type Role } from '@/lib/rbac';
import { saveNotifSettingsAction, saveCalendarPrefAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cài đặt cá nhân · BTMH OKR' };

export default async function SettingsPage() {
  const user = await requireUser();
  const [settings, units, calOn] = await Promise.all([getNotifSettings(user.email), listUnits(), calendarGloballyOn()]);
  const unitName = user.unit_id ? units.find((u) => u.id === user.unit_id)?.name ?? null : null;
  const roleLabel = ROLE_LABEL[user.role as Role] ?? user.role;

  return (
    <>
      <SiteHeader />
      <div className="wrap">
        <div className="pagetitle">Cài đặt cá nhân<HelpTip k="settings" /></div>
        <p className="subtitle">Thông tin tài khoản và tuỳ chọn thông báo của bạn.</p>

        {/* Hồ sơ */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Hồ sơ</h3>
          <div className="prof">
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="prof-av" src={user.avatar_url} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="prof-av prof-av-ph">{(user.display_name || user.email).charAt(0).toUpperCase()}</span>
            )}
            <div className="prof-info">
              <div className="prof-name">{user.display_name || user.email}</div>
              <div className="prof-meta">
                <span className="badge">{roleLabel}</span>
                {unitName && <span className="muted"> · {unitName}</span>}
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{user.email}</div>
            </div>
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 12, marginBottom: 0 }}>
            Họ tên · vai trò · đơn vị do quản trị viên quản lý ở <Link href="/admin/users">Quản trị → Người dùng</Link>.
          </p>
        </div>

        {/* Tuỳ chọn thông báo */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Tuỳ chọn thông báo</h3>
          <p className="subtitle" style={{ marginTop: 0 }}>
            Chọn những việc bạn muốn được báo. Xem danh sách thông báo ở <Link href="/notifications">🔔 Thông báo</Link>.
          </p>
          <NotifSettingsForm
            types={NOTIF_TYPE_META}
            initial={settings.prefs}
            initialEmail={settings.notifyEmail}
            action={saveNotifSettingsAction}
          />
        </div>

        {/* Google Calendar — chỉ hiện khi tính năng đã được bật (máy chủ + quản trị) */}
        {calOn && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Google Calendar<HelpTip k="gcal" /></h3>
            <p className="subtitle" style={{ marginTop: 0 }}>
              Khi bật, cuộc họp bạn chủ trì và công việc có hạn được giao cho bạn sẽ tự thêm vào Google
              Calendar của bạn (theo email đăng nhập). Lần đầu cần đăng nhập lại để cấp quyền lịch.
            </p>
            <ToastForm action={saveCalendarPrefAction} done="Đã lưu tuỳ chọn lịch">
              <label className="chk" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" name="calendar_enabled" defaultChecked={user.calendar_enabled !== false} />
                <span>Tự thêm cuộc họp &amp; công việc vào Google Calendar của tôi</span>
              </label>
              <div style={{ marginTop: 12 }}><button className="btn" type="submit">Lưu</button></div>
            </ToastForm>
          </div>
        )}
      </div>
    </>
  );
}
