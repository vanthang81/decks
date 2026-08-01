import Link from 'next/link';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import { requireUser } from '@/lib/current-user';
import { loadAccess, canManageSystem } from '@/lib/access';
import { getReminderConfig, WEEKDAY_LABEL } from '@/lib/reminders';
import { saveReminderAction, testReminderAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function AdminSettings({
  searchParams,
}: {
  searchParams: { saved?: string; test?: string };
}) {
  const me = await requireUser();
  if (!canManageSystem(me, await loadAccess())) redirect('/');
  const cfg = await getReminderConfig();

  return (
    <>
      <SiteHeader active="admin" />
      <div className="wrap">
        <p className="subtitle" style={{ marginBottom: 6 }}>
          <Link href="/admin">← Quản trị</Link>
        </p>
        <div className="pagetitle">Cài đặt · Nhắc check-in</div>
        <p className="subtitle">
          Tự động email nhắc người chủ trì cập nhật KR chưa check-in. Gửi qua hệ thống mail BTMH.
        </p>

        {searchParams.saved && <p className="badge green">Đã lưu cấu hình.</p>}
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
      </div>
    </>
  );
}
