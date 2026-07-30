import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { ProgressBar, StatusBadge } from '@/components/ui';
import { requireUser } from '@/lib/current-user';
import { getCurrentPeriod, listPeriods } from '@/lib/periods';
import { listObjectivesForOwner } from '@/lib/okr';
import { listInitiativesForOwner, INIT_STATUS_LABEL } from '@/lib/initiatives';
import { fmtVnd, fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function MyPage() {
  const user = await requireUser();
  const period = (await getCurrentPeriod()) ?? (await listPeriods())[0] ?? null;
  const objectives = period ? await listObjectivesForOwner(user.email, period.id) : [];
  const initiatives = await listInitiativesForOwner(user.email);

  return (
    <>
      <SiteHeader active="my" />
      <div className="wrap">
        <div className="flexbtw">
          <div>
            <div className="pagetitle">OKR & việc của tôi</div>
            <p className="subtitle">
              {user.display_name || user.email}
              {period ? ` · kỳ ${period.name}` : ''}
            </p>
          </div>
          {period && (
            <Link className="btn" href={`/objectives/new?period=${period.id}`}>
              + Tạo OKR cá nhân
            </Link>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>OKR tôi chủ trì</h3>
          {objectives.length === 0 && <p className="muted">Bạn chưa chủ trì OKR nào trong kỳ.</p>}
          {objectives.map((o) => (
            <div key={o.id} className="obj-row">
              <div className="obj-main">
                <div className="ttl">
                  <Link href={`/objectives/${o.id}`}>{o.title}</Link> <StatusBadge status={o.status} />
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

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Việc đang mở của tôi</h3>
          {initiatives.length === 0 && <p className="muted">Không có việc nào đang mở.</p>}
          <div className="table-scroll">
            <table className="t">
              <tbody>
                {initiatives.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <b>{i.title}</b>
                    </td>
                    <td>
                      <span className="badge gray">{INIT_STATUS_LABEL[i.status]}</span>
                    </td>
                    <td className="right mono">{i.progress.toFixed(0)}%</td>
                    <td className="right mono">{fmtVnd(i.budget_actual)}</td>
                    <td>{fmtDate(i.due_on)}</td>
                    <td>
                      {i.objective_id && <Link href={`/objectives/${i.objective_id}`}>Mở OKR</Link>}
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
