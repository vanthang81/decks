import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import PageGuide from '@/components/PageGuide';
import HelpTip from '@/components/HelpTip';
import { requireUser } from '@/lib/current-user';
import { currentReviewData } from '@/lib/review';
import { BSC_PERSPECTIVE_LABEL, BSC_PERSPECTIVE_ICON, LEVEL_LABEL, type BscPerspective, type Level } from '@/lib/okr';
import { STATUS_LABEL, STATUS_CLS } from '@/lib/kpi-values';
import { BarList } from '@/components/charts';
import { fmtNumber, fmtDate, progressColor } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Họp điều hành · BTMH OKR' };

const TONE_CLS = { good: 'ins-good', watch: 'ins-watch', risk: 'ins-risk' } as const;
const TONE_ICON = { good: '✅', watch: '⚠️', risk: '🔴' } as const;

function compact(v: number | null, unit: string | null): string {
  if (v == null) return '—';
  if (unit === 'đ' && Math.abs(v) >= 1e9) return `${fmtNumber(v / 1e9, 1)} tỷ`;
  return `${fmtNumber(v, 0)}${unit && unit !== 'đ' ? ' ' + unit : ''}`;
}

export default async function ReviewPage() {
  await requireUser();
  const d = await currentReviewData();

  if (!d) {
    return (
      <>
        <SiteHeader active="review" />
        <div className="wrap">
          <PageGuide pageKey="review" />
          <div className="pagetitle">Họp điều hành</div>
          <div className="card"><p className="muted">Chưa có kỳ OKR nào.</p></div>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteHeader active="review" />
      <div className="wrap review">
        <div className="flexbtw">
          <div>
            <div className="pagetitle">Họp điều hành (WBR/MBR)<HelpTip k="review" /></div>
            <p className="subtitle">Tổng hợp trạng thái điều hành theo mục tiêu · kỳ <b>{d.periodName}</b></p>
          </div>
          <Link className="btn ghost" href="/">← Bảng điều khiển</Link>
        </div>

        {/* Nhịp độ tổng quan */}
        <div className="card">
          <div className="rv-kpis">
            <div className="rv-kpi">
              <div className="n" style={{ color: progressColor(d.companyProg) }}>{d.companyProg}%</div>
              <div className="l">Tiến độ công ty</div>
            </div>
            <div className="rv-kpi">
              <div className="n">{d.elapsed}%</div>
              <div className="l">Thời gian kỳ đã trôi</div>
            </div>
            <div className="rv-kpi">
              <span className={`badge ${d.paceVerdict.cls}`}>{d.paceVerdict.txt}</span>
              <div className="l">Nhịp độ</div>
            </div>
            <div className="rv-kpi">
              <div className="n">{Math.round(d.checkinCoverage * 100)}%</div>
              <div className="l">KR đã check-in ({d.krChecked}/{d.krTotal})</div>
            </div>
            <div className="rv-kpi">
              <div className="n" style={{ color: d.kpiAlerts.length ? '#dc2626' : 'var(--ink)' }}>{d.kpiAlerts.length}</div>
              <div className="l">KPI cảnh báo/khẩn</div>
            </div>
            <div className="rv-kpi">
              <div className="n" style={{ color: d.overdue.length ? '#dc2626' : 'var(--ink)' }}>{d.overdue.length}</div>
              <div className="l">Việc quá hạn</div>
            </div>
          </div>
        </div>

        {/* Nhận định & Khuyến nghị */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Nhận định &amp; Khuyến nghị<HelpTip k="insights" /></h3>
          <div className="ins-list">
            {d.insights.map((it, i) => (
              <div key={i} className={`ins ${TONE_CLS[it.tone]}`}>
                <div className="ins-ic" aria-hidden>{TONE_ICON[it.tone]}</div>
                <div className="ins-body">
                  <div><span className="ins-tag">Quan sát</span> {it.observe}</div>
                  <div><span className="ins-tag">Hàm ý</span> {it.imply}</div>
                  <div><span className="ins-tag rec">Khuyến nghị</span> {it.recommend}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid two">
          {/* Tiến độ theo Khối */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Tiến độ theo Khối</h3>
            <div className="table-scroll">
              <table className="t">
                <thead><tr><th style={{ textAlign: 'left' }}>Khối</th><th>Tiến độ</th><th>Check-in</th><th>Quá hạn</th></tr></thead>
                <tbody>
                  {d.units.map((u) => (
                    <tr key={u.code ?? u.name}>
                      <td>{u.name}</td>
                      <td className="right mono" style={{ color: progressColor(u.progress) }}>{u.progress}%</td>
                      <td className="right mono">{u.krTotal ? Math.round((u.krChecked / u.krTotal) * 100) : 0}%</td>
                      <td className="right mono">{u.overdue > 0 ? <span className="badge red">{u.overdue}</span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Viễn cảnh BSC */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Tiến độ theo Viễn cảnh BSC</h3>
            {d.bsc.length === 0 ? <p className="muted">Chưa gắn viễn cảnh.</p> : (
              <BarList items={d.bsc.map((x) => ({
                label: (<span><span aria-hidden style={{ marginRight: 5 }}>{BSC_PERSPECTIVE_ICON[x.key as BscPerspective]}</span>{BSC_PERSPECTIVE_LABEL[x.key as BscPerspective]}{x.n > 1 && <span className="muted" style={{ fontSize: 11 }}> · {x.n} OKR</span>}</span>),
                value: x.progress, color: progressColor(x.progress),
              }))} />
            )}
            <div className="rv-health">
              <b>Sức khỏe OKR:</b> TB {d.health.avg}/100 · <span className="badge green">{d.health.good} tốt</span> <span className="badge amber">{d.health.ok} khá</span> <span className="badge red">{d.health.weak} yếu</span>
            </div>
          </div>
        </div>

        {/* KPI cảnh báo */}
        {d.kpiAlerts.length > 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>KPI cần can thiệp</h3>
            <div className="table-scroll">
              <table className="t">
                <thead><tr><th style={{ textAlign: 'left' }}>KPI</th><th style={{ textAlign: 'left' }}>Đơn vị</th><th>Thực hiện</th><th>Mục tiêu</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {d.kpiAlerts.map((a, i) => (
                    <tr key={i}>
                      <td><Link href="/kpi" className="tbl-link">{a.code && <span className="okr-code" style={{ marginRight: 6 }}>{a.code}</span>}{a.name}</Link></td>
                      <td>{a.unit ?? '—'}</td>
                      <td className="right mono">{compact(a.actual, a.unit_label)}</td>
                      <td className="right mono">{compact(a.target, a.unit_label)}</td>
                      <td className="center"><span className={`badge ${STATUS_CLS[a.status]}`}>{STATUS_LABEL[a.status]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid two">
          {/* OKR cần chú ý */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>OKR cần chú ý (tiến độ thấp)</h3>
            <div className="table-scroll">
              <table className="t">
                <thead><tr><th style={{ textAlign: 'left' }}>OKR</th><th>Tiến độ</th><th>Check-in</th></tr></thead>
                <tbody>
                  {d.attention.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link href={`/objectives/${o.id}`} className="tbl-link">
                          {o.code && <span className="okr-code" style={{ marginRight: 6 }}>{o.code}</span>}{o.title}
                        </Link>
                        <div className="muted" style={{ fontSize: 11 }}>{LEVEL_LABEL[o.level as Level]}{o.unit ? ` · ${o.unit}` : ''}{o.owner ? ` · ${o.owner}` : ''}</div>
                      </td>
                      <td className="right mono" style={{ color: progressColor(o.progress) }}>{o.progress}%</td>
                      <td className="center">{o.checked ? '✓' : <span className="badge amber">chưa</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Việc quá hạn */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Việc quá hạn</h3>
            {d.overdue.length === 0 ? <p className="muted">Không có việc quá hạn. 🎉</p> : (
              <div className="table-scroll">
                <table className="t">
                  <thead><tr><th style={{ textAlign: 'left' }}>Công việc</th><th style={{ textAlign: 'left' }}>Phụ trách</th><th>Hạn</th></tr></thead>
                  <tbody>
                    {d.overdue.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <Link href={t.objectiveId ? `/objectives/${t.objectiveId}` : '/tasks'} className="tbl-link">
                            {t.code && <span className="okr-code" style={{ marginRight: 6 }}>{t.code}</span>}{t.title}
                          </Link>
                          <div className="muted" style={{ fontSize: 11 }}>{t.unit ?? ''}</div>
                        </td>
                        <td>{t.owner ?? '—'}</td>
                        <td className="right mono" style={{ color: '#dc2626' }}>{fmtDate(t.due)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Toàn vẹn alignment */}
        {d.integrity.length > 0 && (
          <div className="card intg-card">
            <h3 style={{ marginTop: 0 }}>⚠ Điểm hở chuỗi chiến lược → thực thi</h3>
            <ul className="intg-list">
              {d.integrity.map((it) => (
                <li key={it.key}>
                  <Link href={`/integrity#${it.key}`} className="intg-row">
                    <span className="intg-n">{it.count}</span>
                    <span className="intg-row-txt"><b>{it.label}</b><span className="muted" style={{ display: 'block', fontSize: 12 }}>{it.hint}</span></span>
                    <span className="intg-item-go" aria-hidden>→</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/integrity" className="intg-all">Xem chi tiết từng mục để bịt lỗ hổng →</Link>
          </div>
        )}
      </div>
    </>
  );
}
