import Link from 'next/link';
import HelpTip from '@/components/HelpTip';
import SiteHeader from '@/components/SiteHeader';
import UserLink from '@/components/UserLink';
import { ProgressBar } from '@/components/ui';
import { requireUser } from '@/lib/current-user';
import { getCurrentPeriod, listPeriods } from '@/lib/periods';
import {
  listObjectivesByPeriod,
  type ObjectiveRow,
  BSC_PERSPECTIVES,
  BSC_PERSPECTIVE_LABEL,
  BSC_PERSPECTIVE_ICON,
} from '@/lib/okr';
import { listUnits } from '@/lib/org';
import { periodInsights } from '@/lib/insights';
import { integrityIssues } from '@/lib/integrity';
import { reviewData } from '@/lib/review';
import { unitIcon } from '@/lib/unit-icons';
import { fmtNumber, progressColor } from '@/lib/format';
import { Donut, BarList, Legend } from '@/components/charts';

const PROG_C = { done: '#16a34a', ahead: '#2563eb', behind: '#f59e0b', notStarted: '#cbd5e1' };
const CONF_C = { on_track: '#16a34a', at_risk: '#d97706', off_track: '#dc2626', none: '#cbd5e1' };
const INIT_C = { todo: '#94a3b8', in_progress: '#2563eb', blocked: '#dc2626', done: '#16a34a', canceled: '#cbd5e1' };
const TONE_CLS = { good: 'ins-good', watch: 'ins-watch', risk: 'ins-risk' } as const;
const TONE_ICON = { good: '✅', watch: '⚠️', risk: '🔴' } as const;

export const dynamic = 'force-dynamic';

export default async function Dashboard({ searchParams }: { searchParams: { tour?: string } }) {
  const user = await requireUser();
  const period = (await getCurrentPeriod()) ?? (await listPeriods())[0] ?? null;

  const objectives = period ? await listObjectivesByPeriod(period.id) : [];
  const company = objectives.filter((o) => o.level === 'company');
  const divisions = objectives.filter((o) => o.level === 'division');
  const departments = objectives.filter((o) => o.level === 'department');
  const individuals = objectives.filter((o) => o.level === 'individual');

  const avg = (arr: ObjectiveRow[]) =>
    arr.length ? arr.reduce((a, o) => a + o.progress, 0) / arr.length : 0;

  const ins = period ? await periodInsights(period.id) : null;
  const issues = period ? await integrityIssues(period.id).catch(() => []) : [];
  const rv = period ? await reviewData(period).catch(() => null) : null;
  const companyProg = Math.round(avg(company.length ? company : divisions));
  // Nhịp độ: % thời gian kỳ đã trôi qua (so với tiến độ để biết đang dẫn/chậm).
  let elapsed = 0;
  if (period) {
    const s = new Date(period.starts_on).getTime();
    const e = new Date(period.ends_on).getTime();
    const now = Date.now();
    elapsed = e > s ? Math.max(0, Math.min(100, Math.round(((now - s) / (e - s)) * 100))) : 0;
  }
  // "Tiến độ theo Khối" — liệt kê MỌI khối từ cây tổ chức (kể cả khối CHƯA có OKR = 0%), tiến độ =
  // bình quân OKR cấp khối GẮN ĐÚNG đơn vị đó. KHÔNG bịa "khối" từ tiêu đề OKR (trước đây OKR khối chưa
  // gán đơn vị bị hiện tên OKR như một khối). OKR khối thiếu đơn vị được cảnh báo riêng ở trang Toàn vẹn.
  const allUnits = await listUnits();
  const activeDivisions = allUnits
    .filter((u) => u.type === 'division' && u.is_active)
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  const divProg = new Map<string, { sum: number; n: number }>();
  for (const o of divisions) {
    if (!o.unit_id) continue; // OKR khối chưa gán đơn vị → không tạo "khối ảo"
    const cur = divProg.get(o.unit_id) ?? { sum: 0, n: 0 };
    cur.sum += o.progress;
    cur.n += 1;
    divProg.set(o.unit_id, cur);
  }
  const divBars = activeDivisions
    .map((u) => {
      const p = divProg.get(u.id);
      return { name: u.name, code: u.code, progress: p ? p.sum / p.n : 0, n: p?.n ?? 0 };
    })
    .sort((a, b) => b.progress - a.progress || a.name.localeCompare(b.name));

  // Tiến độ theo VIỄN CẢNH BSC — bình quân tiến độ OKR gắn mỗi viễn cảnh (chỉ hiện viễn cảnh có OKR).
  const bscBars = BSC_PERSPECTIVES.map((b) => {
    const arr = objectives.filter((o) => o.bsc_perspective === b);
    return {
      b,
      progress: arr.length ? arr.reduce((a, o) => a + o.progress, 0) / arr.length : 0,
      n: arr.length,
    };
  }).filter((x) => x.n > 0);

  const gap = companyProg - elapsed;
  const paceVerdict =
    gap >= 5 ? { cls: 'green', txt: `Đang dẫn nhịp +${gap} điểm` }
    : gap <= -5 ? { cls: 'red', txt: `Chậm nhịp ${-gap} điểm` }
    : { cls: 'blue', txt: 'Đúng nhịp kế hoạch' };

  return (
    <>
      <SiteHeader active="home" />
      <div className="wrap">
        <div className="flexbtw">
          <div>
            <div className="pagetitle">Bảng điều khiển OKR<HelpTip k="dashboard" /></div>
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link className="btn" href="/objectives" data-tour="tour-all-okr">
              Xem toàn bộ OKR
            </Link>
          </div>
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

            {rv && rv.insights.length > 0 && (
              <div className="card">
                <div className="flexbtw">
                  <h3 style={{ marginTop: 0 }}>Nhận định &amp; Khuyến nghị<HelpTip k="insights" /></h3>
                  <Link className="muted" href="/review" style={{ fontSize: 13 }}>Xem họp điều hành →</Link>
                </div>
                <div className="ins-list">
                  {rv.insights.slice(0, 3).map((it, i) => (
                    <div key={i} className={`ins ${TONE_CLS[it.tone]}`}>
                      <div className="ins-ic" aria-hidden>{TONE_ICON[it.tone]}</div>
                      <div className="ins-body">
                        <div><span className="ins-tag">Quan sát</span> {it.observe}</div>
                        <div><span className="ins-tag rec">Khuyến nghị</span> {it.recommend}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ins && (
              <div className="grid three">
                {/* Tiến độ & Nhịp độ */}
                <div className="card insight">
                  <h3 className="insight-h">Tiến độ &amp; Nhịp độ</h3>
                  <div className="insight-donut">
                    <Donut
                      segments={[
                        { value: companyProg, color: progressColor(companyProg) },
                        { value: 100 - companyProg, color: 'transparent' },
                      ]}
                      centerTop={`${companyProg}%`}
                      centerSub="công ty"
                    />
                  </div>
                  <div style={{ textAlign: 'center', marginBottom: 10 }}>
                    <span className={`badge ${paceVerdict.cls}`}>{paceVerdict.txt}</span>
                  </div>
                  <BarList
                    items={[
                      { label: 'Tiến độ', value: companyProg, color: 'var(--primary)' },
                      { label: 'Thời gian kỳ', value: elapsed, color: '#cbd5e1' },
                    ]}
                  />
                </div>

                {/* Phân bố tiến độ KR */}
                <div className="card insight">
                  <h3 className="insight-h">Phân bố tiến độ {ins.krTotal} KR</h3>
                  <div className="insight-donut">
                    <Donut
                      segments={[
                        { value: ins.progress.done, color: PROG_C.done },
                        { value: ins.progress.ahead, color: PROG_C.ahead },
                        { value: ins.progress.behind, color: PROG_C.behind },
                        { value: ins.progress.notStarted, color: PROG_C.notStarted },
                      ]}
                      centerTop={ins.krTotal}
                      centerSub="KR"
                    />
                  </div>
                  <Legend
                    items={[
                      { color: PROG_C.done, label: 'Đạt / gần đạt (≥90%)', value: ins.progress.done },
                      { color: PROG_C.ahead, label: 'Đúng hướng (50–90%)', value: ins.progress.ahead },
                      { color: PROG_C.behind, label: 'Cần chú ý (10–50%)', value: ins.progress.behind },
                      { color: PROG_C.notStarted, label: 'Chưa khởi động (<10%)', value: ins.progress.notStarted },
                    ]}
                  />
                </div>

                {/* Công việc thực thi */}
                <div className="card insight">
                  <h3 className="insight-h">
                    Công việc thực thi
                    {ins.overdueTasks > 0 && (
                      <span className="badge red" style={{ marginLeft: 8, fontSize: 11 }}>
                        ⚠ {ins.overdueTasks} quá hạn
                      </span>
                    )}
                  </h3>
                  <div className="insight-donut">
                    <Donut
                      segments={[
                        { value: ins.initByStatus.done, color: INIT_C.done },
                        { value: ins.initByStatus.in_progress, color: INIT_C.in_progress },
                        { value: ins.initByStatus.blocked, color: INIT_C.blocked },
                        { value: ins.initByStatus.todo, color: INIT_C.todo },
                        { value: ins.initByStatus.canceled, color: INIT_C.canceled },
                      ]}
                      centerTop={ins.initTotal}
                      centerSub="việc"
                    />
                  </div>
                  <Legend
                    items={[
                      { color: INIT_C.done, label: 'Xong', value: ins.initByStatus.done },
                      { color: INIT_C.in_progress, label: 'Đang làm', value: ins.initByStatus.in_progress },
                      { color: INIT_C.blocked, label: 'Vướng', value: ins.initByStatus.blocked },
                      { color: INIT_C.todo, label: 'Chưa làm', value: ins.initByStatus.todo },
                    ]}
                  />
                </div>
              </div>
            )}

            {issues.length > 0 && (
              <div className="card intg-card">
                <h3 style={{ marginTop: 0 }}>
                  ⚠ Cảnh báo toàn vẹn alignment
                  <HelpTip k="integrity" />
                </h3>
                <p className="muted" style={{ marginTop: 0, fontSize: 12.5 }}>
                  Các “lỗ hổng” trong chuỗi chiến lược → thực thi cần bịt (kỳ {period?.name}).
                </p>
                <ul className="intg-list">
                  {issues.map((it) => (
                    <li key={it.key}>
                      <Link href={`/integrity#${it.key}`} className="intg-row">
                        <span className="intg-n">{it.count}</span>
                        <span className="intg-row-txt">
                          <b>{it.label}</b>
                          <span className="muted" style={{ display: 'block', fontSize: 12 }}>{it.hint}</span>
                        </span>
                        <span className="intg-item-go" aria-hidden>→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href="/integrity" className="intg-all">
                  Xem chi tiết từng mục để bịt lỗ hổng →
                </Link>
              </div>
            )}

            {(bscBars.length > 0 || divBars.length > 0) && (
              <div className="grid two">
                {bscBars.length > 0 && (
                  <div className="card">
                    <h3 style={{ marginTop: 0 }}>
                      Tiến độ theo Viễn cảnh BSC
                      <HelpTip k="bsc" />
                    </h3>
                    <BarList
                      items={bscBars.map((x) => ({
                        label: (
                          <Link href={`/map?v=strategy#smap-${x.b}`} className="tbl-link">
                            <span aria-hidden style={{ marginRight: 5 }}>{BSC_PERSPECTIVE_ICON[x.b]}</span>
                            {BSC_PERSPECTIVE_LABEL[x.b]}
                            {x.n > 1 && <span className="muted" style={{ fontSize: 11 }}> · {x.n} OKR</span>}
                          </Link>
                        ),
                        value: x.progress,
                        color: progressColor(x.progress),
                      }))}
                    />
                  </div>
                )}

                {divBars.length > 0 && (
                  <div className="card">
                    <h3 style={{ marginTop: 0 }}>Tiến độ theo Khối</h3>
                    <BarList
                      items={divBars.map((u) => ({
                        label: (
                          <span>
                            <span aria-hidden style={{ marginRight: 5 }}>
                              {unitIcon({ code: u.code, name: u.name, type: 'division' })}
                            </span>
                            {u.name}
                            {u.n > 1 && <span className="muted" style={{ fontSize: 11 }}> · {u.n} OKR</span>}
                          </span>
                        ),
                        value: u.progress,
                        color: progressColor(u.progress),
                      }))}
                    />
                  </div>
                )}
              </div>
            )}

            {rv && rv.health.total > 0 && (
              <div className="card">
                <h3 style={{ marginTop: 0 }}>Sức khỏe OKR<HelpTip k="okr-health" /></h3>
                <div className="hlth">
                  <div className="hlth-score">
                    <div className="n" style={{ color: progressColor(rv.health.avg) }}>{rv.health.avg}</div>
                    <div className="l">điểm TB /100</div>
                  </div>
                  <div className="hlth-bands">
                    <span className="badge green">{rv.health.good} tốt (≥80)</span>
                    <span className="badge amber">{rv.health.ok} khá (60–79)</span>
                    <span className="badge red">{rv.health.weak} yếu (&lt;60)</span>
                  </div>
                </div>
                {rv.health.gaps.length > 0 && (
                  <div className="hlth-gaps">
                    Thiếu nhiều nhất: {rv.health.gaps.slice(0, 3).map((g) => `${g.label} (${g.missing})`).join(' · ')}
                  </div>
                )}
              </div>
            )}

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
    <div className="obj-row obj-row-link">
      <Link className="stretch-link" href={`/objectives/${o.id}`} aria-label={o.title} />
      {showUnit && (
        <span className="unit-ic" title={o.unit_name ?? undefined} aria-hidden>
          {unitIcon({ code: o.unit_code, name: o.unit_name, type: 'division' })}
        </span>
      )}
      <div className="obj-main">
        <div className="ttl">
          {o.code && <span className="okr-code">{o.code}</span>}
          <span className="ttl-txt">{o.title}</span>
        </div>
        <div className="obj-meta">
          {showUnit && o.unit_name ? `${o.unit_name} · ` : ''}
          {o.owner_email ? <>Chủ trì: <UserLink email={o.owner_email} name={o.owner_name ?? o.owner_email} /> · </> : ''}
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
