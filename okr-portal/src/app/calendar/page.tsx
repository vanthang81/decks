import SiteHeader from '@/components/SiteHeader';
import HelpTip from '@/components/HelpTip';
import CalendarView from '@/components/CalendarView';
import { requireUser } from '@/lib/current-user';
import { isExec } from '@/lib/rbac';
import { calendarEvents, type CalEvent, type CalScope } from '@/lib/calendar';
import { listUsers } from '@/lib/users';
import { listAllProjectOptions } from '@/lib/projects';
import { listObjectivesWithKrs } from '@/lib/okr';
import { getCurrentPeriod } from '@/lib/periods';
import { createMeetingAction } from '../meetings/actions';
import { createInitiativeAction } from '../objectives/actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Lịch · BTMH OKR' };

const pad = (n: number) => String(n).padStart(2, '0');
const MONTH_LABEL = (y: number, m0: number) => `Tháng ${m0 + 1}/${y}`;

export default async function CalendarPage({ searchParams }: { searchParams: { m?: string; scope?: string } }) {
  const user = await requireUser();
  const canAll = isExec(user.role);
  const scope: CalScope = searchParams.scope === 'all' && canAll ? 'all' : 'mine';

  const now = new Date();
  let year = now.getFullYear();
  let month0 = now.getMonth();
  const mm = searchParams.m?.match(/^(\d{4})-(\d{2})$/);
  if (mm) { year = Number(mm[1]); month0 = Number(mm[2]) - 1; }

  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const from = `${year}-${pad(month0 + 1)}-01`;
  const to = `${year}-${pad(month0 + 1)}-${pad(daysInMonth)}`;
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const period = await getCurrentPeriod();
  const [events, users, projects, objectives] = await Promise.all([
    calendarEvents(from, to, user, scope).catch(() => [] as CalEvent[]),
    listUsers(),
    listAllProjectOptions(),
    period ? listObjectivesWithKrs(period.id) : Promise.resolve([]),
  ]);

  const prevM = month0 === 0 ? `${year - 1}-12` : `${year}-${pad(month0)}`;
  const nextM = month0 === 11 ? `${year + 1}-01` : `${year}-${pad(month0 + 2)}`;

  return (
    <>
      <SiteHeader active="calendar" />
      <div className="wrap">
        <div className="pagetitle">Lịch<HelpTip k="calendar" /></div>
        <p className="subtitle">
          Toàn cảnh theo ngày: công việc (hạn), cuộc họp, check-in OKR. Bấm vào một ngày để xem chi tiết
          hoặc thêm nhanh cuộc họp / công việc.
        </p>

        <CalendarView
          year={year}
          month0={month0}
          monthLabel={MONTH_LABEL(year, month0)}
          todayStr={todayStr}
          prevM={prevM}
          nextM={nextM}
          events={events}
          scope={scope}
          canAll={canAll}
          users={users.map((u) => ({ email: u.email, name: u.display_name || u.email }))}
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
