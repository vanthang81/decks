import Link from 'next/link';
import HelpTip from '@/components/HelpTip';
import SiteHeader from '@/components/SiteHeader';
import NewPersonalOkrModal from '@/components/NewPersonalOkrModal';
import { ProgressBar, StatusBadge } from '@/components/ui';
import { requireUser } from '@/lib/current-user';
import { getCurrentPeriod, listPeriods } from '@/lib/periods';
import { listObjectivesForOwner } from '@/lib/okr';
import { listInitiativesForOwner, taskCountsForOwner, INIT_STATUS_LABEL } from '@/lib/initiatives';
import { createPersonalOkrAction } from '@/app/objectives/actions';
import { fmtVnd, fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function MyPage() {
  const user = await requireUser();
  const period = (await getCurrentPeriod()) ?? (await listPeriods())[0] ?? null;
  const objectives = period ? await listObjectivesForOwner(user.email, period.id) : [];
  const initiatives = await listInitiativesForOwner(user.email);
  const tc = await taskCountsForOwner(user.email);
  const myTiles: { n: number; l: string; color?: string; href: string }[] = [
    { n: tc.total, l: 'Tổng công việc', href: '/tasks?mine=1' },
    { n: tc.doing, l: 'Đang làm', color: '#2563eb', href: '/tasks?mine=1&status=in_progress' },
    { n: tc.overdue, l: 'Quá hạn', color: tc.overdue > 0 ? '#dc2626' : undefined, href: '/tasks?mine=1&overdue=1' },
    { n: tc.done, l: 'Đã hoàn thành', color: '#16a34a', href: '/tasks?mine=1&status=done' },
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
          <h3 style={{ marginTop: 0 }}>Việc đang mở của tôi</h3>
          {initiatives.length === 0 && <p className="muted">Không có việc nào đang mở.</p>}
          <div className="table-scroll">
            <table className="t">
              <tbody>
                {initiatives.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <Link href={`/tasks?task=${i.id}`} className="tbl-link" title="Mở chi tiết công việc">
                        {i.code && <span className="okr-code" style={{ marginRight: 6 }}>{i.code}</span>}
                        {i.title}
                      </Link>
                    </td>
                    <td>
                      <span className="badge gray">{INIT_STATUS_LABEL[i.status]}</span>
                    </td>
                    <td className="right mono">{i.progress.toFixed(0)}%</td>
                    <td className="right mono">{fmtVnd(i.budget_actual)}</td>
                    <td>{fmtDate(i.due_on)}</td>
                    <td>
                      {i.objective_id && (
                        <Link href={`/objectives/${i.objective_id}`}>
                          {i.objective_code ? <span className="okr-code">{i.objective_code}</span> : 'Mở OKR'}
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
