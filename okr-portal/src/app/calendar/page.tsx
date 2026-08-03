import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import HelpTip from '@/components/HelpTip';
import { requireUser } from '@/lib/current-user';
import { calendarEvents, type CalEvent, type CalEventType } from '@/lib/calendar';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Lịch · BTMH OKR' };

const pad = (n: number) => String(n).padStart(2, '0');
const WD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTH_LABEL = (y: number, m0: number) => `Tháng ${m0 + 1}/${y}`;
const TYPE_META: Record<CalEventType, { label: string; cls: string }> = {
  task: { label: 'Công việc', cls: 'cal-task' },
  meeting: { label: 'Cuộc họp', cls: 'cal-meeting' },
  checkin: { label: 'Check-in', cls: 'cal-checkin' },
};

export default async function CalendarPage({ searchParams }: { searchParams: { m?: string } }) {
  const user = await requireUser();

  const now = new Date();
  let year = now.getFullYear();
  let month0 = now.getMonth();
  const mm = searchParams.m?.match(/^(\d{4})-(\d{2})$/);
  if (mm) { year = Number(mm[1]); month0 = Number(mm[2]) - 1; }

  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const first = new Date(year, month0, 1);
  const startWeekday = (first.getDay() + 6) % 7; // 0 = Thứ 2
  const from = `${year}-${pad(month0 + 1)}-01`;
  const to = `${year}-${pad(month0 + 1)}-${pad(daysInMonth)}`;
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const events = await calendarEvents(from, to, user).catch(() => [] as CalEvent[]);
  const byDate = new Map<string, CalEvent[]>();
  for (const e of events) {
    const arr = byDate.get(e.date) ?? [];
    arr.push(e);
    byDate.set(e.date, arr);
  }

  const prev = month0 === 0 ? `${year - 1}-12` : `${year}-${pad(month0)}`;
  const next = month0 === 11 ? `${year + 1}-01` : `${year}-${pad(month0 + 2)}`;

  // Ô đầu tháng: các ô trống dẫn đầu + ngày trong tháng.
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <SiteHeader active="calendar" />
      <div className="wrap">
        <div className="flexbtw flexbtw-top">
          <div>
            <div className="pagetitle">Lịch<HelpTip k="calendar" /></div>
            <p className="subtitle">Toàn cảnh theo ngày: công việc (hạn), cuộc họp, check-in OKR.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link className="btn ghost sm" href={`/calendar?m=${prev}`}>← Trước</Link>
            <b style={{ minWidth: 120, textAlign: 'center' }}>{MONTH_LABEL(year, month0)}</b>
            <Link className="btn ghost sm" href={`/calendar?m=${next}`}>Sau →</Link>
            <Link className="btn ghost sm" href="/calendar">Hôm nay</Link>
          </div>
        </div>

        <div className="cal-legend">
          {(Object.keys(TYPE_META) as CalEventType[]).map((t) => (
            <span key={t} className="cal-leg"><i className={TYPE_META[t].cls} /> {TYPE_META[t].label}</span>
          ))}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="cal-grid">
            {WD.map((w) => <div key={w} className="cal-wd">{w}</div>)}
            {cells.map((d, i) => {
              if (d === null) return <div key={i} className="cal-cell cal-empty" />;
              const ds = `${year}-${pad(month0 + 1)}-${pad(d)}`;
              const evs = byDate.get(ds) ?? [];
              const isToday = ds === todayStr;
              return (
                <div key={i} className={`cal-cell${isToday ? ' cal-today' : ''}`}>
                  <div className="cal-day">{d}</div>
                  <div className="cal-events">
                    {evs.slice(0, 4).map((e, j) => (
                      <Link key={j} href={e.href} className={`cal-ev ${TYPE_META[e.type].cls}`} title={`${e.title}${e.sub ? ' · ' + e.sub : ''}`}>
                        {e.title}
                      </Link>
                    ))}
                    {evs.length > 4 && <span className="cal-more">+{evs.length - 4} nữa</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
