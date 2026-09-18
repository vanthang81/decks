import Link from 'next/link';
import HelpTip from '@/components/HelpTip';
import SiteHeader from '@/components/SiteHeader';
import NewPersonalOkrModal from '@/components/NewPersonalOkrModal';
import { ProgressBar, StatusBadge } from '@/components/ui';
import { requireUser } from '@/lib/current-user';
import { getCurrentPeriod, listPeriods } from '@/lib/periods';
import { listObjectivesForOwner } from '@/lib/okr';
import { listAllInitiativesForOwner, listInitiativesDelegatedBy, taskCountsForOwner } from '@/lib/initiatives';
import MyTasksBoard from '@/components/MyTasksBoard';
import { createPersonalOkrAction, updateOwnTaskProgressAction } from '@/app/objectives/actions';

export const dynamic = 'force-dynamic';

export default async function MyPage() {
  const user = await requireUser();
  const period = (await getCurrentPeriod()) ?? (await listPeriods())[0] ?? null;
  const objectives = period ? await listObjectivesForOwner(user.email, period.id) : [];
  const initiatives = await listAllInitiativesForOwner(user.email);
  const tc = await taskCountsForOwner(user.email);
  // CV TÔI ĐÃ GIAO cho người khác (góc độ quản lý — CFO 18/09) + tiles suy từ danh sách.
  const delegated = await listInitiativesDelegatedBy(user.email);
  const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const dg = {
    total: delegated.length,
    doing: delegated.filter((t) => t.status === 'in_progress').length,
    overdue: delegated.filter((t) => t.due_on && t.due_on < todayIso && t.status !== 'done' && t.status !== 'canceled').length,
    done: delegated.filter((t) => t.status === 'done').length,
  };
  const dgTiles: { n: number; l: string; color?: string }[] = [
    { n: dg.total, l: 'Đã giao' },
    { n: dg.doing, l: 'Đang làm', color: '#2563eb' },
    { n: dg.overdue, l: 'Quá hạn', color: dg.overdue > 0 ? '#dc2626' : undefined },
    { n: dg.done, l: 'Đã hoàn thành', color: '#15803d' },
  ];
  const myTiles: { n: number; l: string; color?: string; href: string }[] = [
    { n: tc.total, l: 'Tổng công việc', href: '/tasks?mine=1' },
    { n: tc.doing, l: 'Đang làm', color: '#2563eb', href: '/tasks?mine=1&status=in_progress' },
    { n: tc.overdue, l: 'Quá hạn', color: tc.overdue > 0 ? '#dc2626' : undefined, href: '/tasks?mine=1&overdue=1' },
    { n: tc.done, l: 'Đã hoàn thành', color: '#15803d', href: '/tasks?mine=1&status=done' },
  ];

  return (
    <>
      <SiteHeader active="my" />
      <div className="wrap">
        <div className="flexbtw">
          <div>
            <div className="pagetitle">OKR & việc của tôi<HelpTip k="my" /></div>
            <p className="subtitle">
              {user.display_name || user.email}
              {period ? ` · kỳ ${period.name}` : ''}
            </p>
          </div>
          {period && (
            <div data-tour="my-new">
              <NewPersonalOkrModal periodId={period.id} action={createPersonalOkrAction} />
            </div>
          )}
        </div>

        {/* Tổng quan công việc cá nhân — mỗi ô bấm được → mở trang Công việc đã lọc sẵn */}
        <div className="card" data-tour="my-tiles">
          <div className="stat prof-tiles my-tiles">
            {myTiles.map((t) => (
              <Link key={t.l} href={t.href} className="my-tile">
                <div className="n" style={t.color ? { color: t.color } : undefined}>{t.n}</div>
                <div className="l">{t.l}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card" data-tour="my-okr">
          <h3 style={{ marginTop: 0 }}>OKR tôi chủ trì</h3>
          {objectives.length === 0 && <p className="muted">Bạn chưa chủ trì OKR nào trong kỳ.</p>}
          {objectives.map((o) => (
            <div key={o.id} className="obj-row obj-row-link">
              <Link className="stretch-link" href={`/objectives/${o.id}`} aria-label={o.title} />
              <div className="obj-main">
                <div className="ttl">
                  {o.code && <span className="okr-code">{o.code}</span>}
                  <span className="ttl-txt">{o.title}</span> <StatusBadge status={o.status} />
                </div>
                <div className="obj-meta">{o.kr_count} KR</div>
              </div>
              <div className="obj-prog">
                <ProgressBar value={o.progress} />
                <div className="right muted mono" style={{ fontSize: 12 }}>
                  {o.progress.toFixed(0)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card" data-tour="my-tasks">
          <div className="flexbtw" style={{ alignItems: 'baseline', gap: 10 }}>
            <h3 style={{ marginTop: 0 }}>Công việc của tôi</h3>
            <Link href="/tasks?mine=1" className="btn ghost sm">Mở trang lọc đầy đủ ↗</Link>
          </div>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
            Nhóm theo: Đã quá hạn · Đang làm · Chưa làm · Đã hoàn thành. Bấm một việc để xem chi tiết &amp; cập nhật nhanh ngay tại đây.
          </p>
          <MyTasksBoard tasks={initiatives} update={updateOwnTaskProgressAction} />
        </div>

        {/* CV tôi ĐÃ GIAO cho người khác — góc độ quản lý theo dõi (CFO 18/09) */}
        <div className="card" data-tour="my-delegated">
          <div className="flexbtw" style={{ alignItems: 'baseline', gap: 10 }}>
            <h3 style={{ marginTop: 0 }}>Công việc tôi đã giao</h3>
            <Link href="/tasks" className="btn ghost sm">Mở trang Công việc ↗</Link>
          </div>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
            Các công việc bạn giao cho người khác — theo dõi tiến độ &amp; ai đang phụ trách. Nhóm theo: Đã quá hạn · Đang làm · Chưa làm · Đã hoàn thành.
          </p>
          <div className="stat prof-tiles my-tiles" style={{ marginBottom: 10 }}>
            {dgTiles.map((t) => (
              <div key={t.l} className="my-tile" style={{ cursor: 'default' }}>
                <div className="n" style={t.color ? { color: t.color } : undefined}>{t.n}</div>
                <div className="l">{t.l}</div>
              </div>
            ))}
          </div>
          <MyTasksBoard tasks={delegated} update={updateOwnTaskProgressAction} showOwner
            emptyText="Bạn chưa giao việc nào cho người khác." />
        </div>
      </div>
    </>
  );
}
