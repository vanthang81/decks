import SiteHeader from '@/components/SiteHeader';
import HelpTip from '@/components/HelpTip';
import CalendarView, { type CalView } from '@/components/CalendarView';
import { requireUser } from '@/lib/current-user';
import { isExec } from '@/lib/rbac';
import { loadAccess, canViewAllCalendar } from '@/lib/access';
import { calendarEvents, type CalEvent, type CalScope } from '@/lib/calendar';
import { listUsers, personTitle } from '@/lib/users';
import { listAllProjectOptions } from '@/lib/projects';
import { listObjectivesWithKrs } from '@/lib/okr';
import { getCurrentPeriod } from '@/lib/periods';
import { createMeetingAction } from '../meetings/actions';
import { createInitiativeAction } from '../objectives/actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Lịch · BTMH OKR' };

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default async function CalendarPage({ searchParams }: { searchParams: { view?: string; d?: string; scope?: string } }) {
  const user = await requireUser();
  // Xem lịch TOÀN công ty: điều hành, hoặc người có năng lực "Xem Lịch toàn công ty" / "Toàn phạm vi".
  const canAll = isExec(user.role) || canViewAllCalendar(user, await loadAccess());
  const scope: CalScope = searchParams.scope === 'all' && canAll ? 'all' : 'mine';
  const view: CalView = searchParams.view === 'day' || searchParams.view === 'week' ? searchParams.view : 'month';

  const now = new Date();
  const todayStr = iso(now);
  // Ngày neo (anchor): ?d=YYYY-MM-DD, mặc định hôm nay.
  let anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dm = searchParams.d?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dm) anchor = new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]));

  // Khoảng dữ liệu theo chế độ xem.
  let from: string, to: string;
  if (view === 'day') {
    from = to = iso(anchor);
  } else if (view === 'week') {
    const mon = new Date(anchor);
    mon.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7)); // về Thứ 2
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    from = iso(mon); to = iso(sun);
  } else {
    from = `${anchor.getFullYear()}-${pad(anchor.getMonth() + 1)}-01`;
    const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    to = iso(last);
  }

  const period = await getCurrentPeriod();
  const [events, users, projects, objectives] = await Promise.all([
    calendarEvents(from, to, user, scope).catch(() => [] as CalEvent[]),
    listUsers(),
    listAllProjectOptions(),
    period ? listObjectivesWithKrs(period.id) : Promise.resolve([]),
  ]);

  return (
    <>
      <SiteHeader active="calendar" />
      <div className="wrap">
        <div className="pagetitle">Lịch<HelpTip k="calendar" /></div>
        <p className="subtitle">
          Toàn cảnh theo ngày / tuần / tháng: công việc (hạn), cuộc họp, check-in OKR. Bấm vào một ngày
          để xem chi tiết hoặc thêm nhanh cuộc họp / công việc.
        </p>

        <CalendarView
          view={view}
          anchor={iso(anchor)}
          todayStr={todayStr}
          events={events}
          scope={scope}
          canAll={canAll}
          users={users.map((u) => ({ email: u.email, name: u.display_name || u.email, title: personTitle(u) }))}
          objectives={objectives.map((o) => ({ id: o.id, code: o.code, title: o.title, unit_name: o.unit_name, krs: o.krs }))}
          projects={projects}
          defaultOwner={user.email}
          createMeeting={createMeetingAction}
          createTask={createInitiativeAction}
        />
      </div>
    </>
  );
}
