import SiteHeader from '@/components/SiteHeader';
import NotifList from '@/components/NotifList';
import HelpTip from '@/components/HelpTip';
import { requireUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Thông báo · BTMH OKR' };

export default async function NotificationsPage() {
  await requireUser();
  return (
    <>
      <SiteHeader />
      <div className="wrap">
        <div className="pagetitle">Thông báo<HelpTip k="notifications" /></div>
        <p className="subtitle">
          Khi ai đó nhắc (@) bạn hoặc trả lời bình luận của bạn, thông báo hiện ở đây và (tuỳ chọn) gửi email.
        </p>
        <div className="card">
          <NotifList />
        </div>
      </div>
    </>
  );
}
