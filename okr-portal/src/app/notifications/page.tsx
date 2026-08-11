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
          Khi bạn được giao việc mới, được nhắc (@), hoặc có người trả lời/bình luận ở mục bạn phụ trách — thông báo hiện ở đây và (tuỳ chọn) gửi email.
        </p>
        <div className="card">
          <NotifList />
        </div>
      </div>
    </>
  );
}
