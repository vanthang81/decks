import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { ProgressBar } from '@/components/ui';
import { requireUser } from '@/lib/current-user';
import { getCurrentPeriod, listPeriods } from '@/lib/periods';
import { listObjectivesByPeriod, type ObjectiveRow } from '@/lib/okr';
import { fmtNumber } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const user = await requireUser();
  const period = (await getCurrentPeriod()) ?? (await listPeriods())[0] ?? null;

  const objectives = period ? await listObjectivesByPeriod(period.id) : [];
  const company = objectives.filter((o) => o.level === 'company');
  const divisions = objectives.filter((o) => o.level === 'division');
  const departments = objectives.filter((o) => o.level === 'department');
  const individuals = objectives.filter((o) => o.level === 'individual');

  const avg = (arr: ObjectiveRow[]) =>
    arr.length ? arr.reduce((a, o) => a + o.progress, 0) / arr.length : 0;

  return (
    <>
      <SiteHeader active="home" />
      <div className="wrap">
        <div className="flexbtw">
          <div>
            <div className="pagetitle">Bảng điều khiển OKR</div>
            <p className="subtitle">
              {period ? (
                <>
                  Kỳ hiện tại: <b>{period.name}</b> · {period.starts_on} → {period.ends_on}
                </>
              ) : (
                'Chưa có kỳ OKR nào. CEO/CFO tạo kỳ ở mục Quản trị.'
              )}
            </p>
          </div>
          <Link className="btn" href="/objectives">
            Xem toàn bộ OKR
          </Link>
        </div>

        {!period && (
          <div className="card">
            <p className="muted">
              Hệ thống chưa được khởi tạo dữ liệu. Vào <Link href="/admin">Quản trị</Link> để tạo cây
              tổ chức, người dùng và kỳ OKR đầu tiên.
            </p>
          </div>
        )}

        {period && (
          <>
            <div className="card">
              <div className="stat">
                <div>
                  <div className="n" style={{ color: 'var(--primary)' }}>
                    {fmtNumber(avg(company), 0)}%
                  </div>
                  <div className="l">Tiến độ công ty</div>
                </div>
                <div>
                  <div className="n">{divisions.length}</div>
                  <div className="l">OKR khối</div>
                </div>
                <div>
                  <div className="n">{departments.length}</div>
                  <div className="l">OKR phòng ban</div>
                </div>
                <div>
                  <div className="n">{individuals.length}</div>
                  <div className="l">OKR cá nhân</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flexbtw">
                <h3 style={{ margin: 0 }}>OKR Công ty</h3>
                <span className="muted" style={{ fontSize: 13 }}>
                  Xin chào, {user.display_name || user.email}
                </span>
              </div>
              <hr className="sep" />
              {company.length === 0 && <p className="muted">Chưa có OKR cấp công ty.</p>}
              {company.map((o) => (
                <ObjLine key={o.id} o={o} />
              ))}
            </div>

            {divisions.length > 0 && (
              <div className="card">
                <h3 style={{ marginTop: 0 }}>OKR theo Khối</h3>
                {divisions.map((o) => (
                  <ObjLine key={o.id} o={o} showUnit />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function ObjLine({ o, showUnit }: { o: ObjectiveRow; showUnit?: boolean }) {
  return (
    <div className="obj-row">
      <div className="obj-main">
        <div className="ttl">
          <Link href={`/objectives/${o.id}`}>{o.title}</Link>
        </div>
        <div className="obj-meta">
          {showUnit && o.unit_name ? `${o.unit_name} · ` : ''}
          {o.owner_name ? `Chủ trì: ${o.owner_name} · ` : ''}
          {o.kr_count} kết quả then chốt
        </div>
      </div>
      <div className="obj-prog">
        <ProgressBar value={o.progress} />
        <div className="right muted mono" style={{ fontSize: 12 }}>
          {o.progress.toFixed(0)}%
        </div>
      </div>
    </div>
  );
}
