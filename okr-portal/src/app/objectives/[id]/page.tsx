import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import HelpTip from '@/components/HelpTip';
import { ProgressBar, LevelBadge, StatusBadge } from '@/components/ui';
import { requireUser } from '@/lib/current-user';
import { listUnits } from '@/lib/org';
import { listUsers } from '@/lib/users';
import {
  getObjective,
  listKeyResults,
  listChildObjectives,
  canManageObjective,
  OKR_TYPE_LABEL,
  OKR_TYPE_EXPECT,
  INDICATOR_LABEL,
  MAX_KR,
  MAX_LEADING,
} from '@/lib/okr';
import {
  listInitiativesForObjective,
  budgetSummaryForObjective,
  INIT_STATUS_LABEL,
} from '@/lib/initiatives';
import { listCheckInsForObjective, CONFIDENCE_LABEL, CONFIDENCE_COLOR } from '@/lib/checkins';
import { listKpiMetrics } from '@/lib/kpi';
import { fmtMetric, fmtVnd, fmtDate } from '@/lib/format';
import {
  createKeyResultAction,
  checkInAction,
  deleteKeyResultAction,
  createInitiativeAction,
  updateInitiativeAction,
  deleteInitiativeAction,
} from '../actions';

export const dynamic = 'force-dynamic';

export default async function ObjectiveDetail({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const obj = await getObjective(params.id);
  if (!obj) notFound();

  const units = await listUnits();
  const users = await listUsers();
  const canManage = canManageObjective(user, obj, units);

  const [krs, children, initiatives, budget, checkins] = await Promise.all([
    listKeyResults(obj.id),
    listChildObjectives(obj.id),
    listInitiativesForObjective(obj.id),
    budgetSummaryForObjective(obj.id),
    listCheckInsForObjective(obj.id),
  ]);
  const parent = obj.parent_id ? await getObjective(obj.parent_id) : null;
  const kpiSources = listKpiMetrics();

  // #5 Guardrail + #2 cơ cấu chỉ số.
  const leadingCount = krs.filter((k) => k.indicator === 'leading').length;
  const laggingCount = krs.length - leadingCount;
  const krWarnings: string[] = [];
  if (krs.length > MAX_KR) krWarnings.push(`Có ${krs.length} KR — nên ≤ ${MAX_KR} để tập trung.`);
  if (leadingCount > MAX_LEADING)
    krWarnings.push(`Có ${leadingCount} chỉ số dẫn dắt — nên ≤ ${MAX_LEADING}.`);
  if (krs.length > 0 && laggingCount === 0)
    krWarnings.push('Chưa có chỉ số KẾT QUẢ (lagging) — nên có ít nhất 1.');

  return (
    <>
      <SiteHeader active="okr" />
      <div className="wrap">
        <p className="subtitle" style={{ marginBottom: 6 }}>
          <Link href="/objectives">← Toàn bộ OKR</Link>
          {parent && (
            <>
              {' · Liên kết lên: '}
              <Link href={`/objectives/${parent.id}`}>{parent.title}</Link>
            </>
          )}
        </p>

        <div className="card">
          <div className="flexbtw">
            <div>
              <div style={{ marginBottom: 6 }}>
                <LevelBadge level={obj.level} /> <StatusBadge status={obj.status} />{' '}
                <span
                  className={`badge ${obj.okr_type === 'aspirational' ? 'amber' : obj.okr_type === 'learning' ? 'gray' : 'blue'}`}
                  title={OKR_TYPE_EXPECT[obj.okr_type]}
                >
                  {OKR_TYPE_LABEL[obj.okr_type]}
                </span>
              </div>
              <div className="pagetitle" style={{ margin: 0 }}>
                {obj.title}
              </div>
              <div className="obj-meta" style={{ marginTop: 4 }}>
                {obj.unit_name ? `${obj.unit_name} · ` : ''}
                {obj.owner_name ? `Chủ trì: ${obj.owner_name}` : 'Chưa gán chủ trì'}
              </div>
              {obj.description && <p style={{ marginBottom: 0 }}>{obj.description}</p>}
            </div>
            <div style={{ width: 200, textAlign: 'right' }}>
              <div style={{ fontSize: 34, fontWeight: 700, color: 'var(--primary)' }}>
                {obj.progress.toFixed(0)}%
              </div>
              <ProgressBar value={obj.progress} lg />
            </div>
          </div>
        </div>

        {/* ---------- Key Results ---------- */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Kết quả then chốt (Key Results)<HelpTip k="key-result" /></h3>
          {krs.length > 0 && (
            <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
              {krs.length} KR · {laggingCount} kết quả · {leadingCount} dẫn dắt
            </p>
          )}
          {krWarnings.length > 0 && (
            <div
              className="gnote"
              style={{ background: '#fef3c7', borderColor: '#d97706', color: '#92400e' }}
            >
              ⚠️ {krWarnings.join(' ')}
            </div>
          )}
          {krs.length === 0 && <p className="muted">Chưa có KR nào.</p>}
          {krs.map((kr) => (
            <div key={kr.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <div className="flexbtw">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>
                    {kr.title}{' '}
                    <span
                      className={`badge ${kr.indicator === 'leading' ? 'blue' : 'gray'}`}
                      style={{ fontSize: 11 }}
                    >
                      {INDICATOR_LABEL[kr.indicator]}
                    </span>
                  </div>
                  <div className="obj-meta">
                    {fmtMetric(kr.start_value, kr.metric_type, kr.unit_label)} →{' '}
                    <b>{fmtMetric(kr.current_value, kr.metric_type, kr.unit_label)}</b> / mục tiêu{' '}
                    {fmtMetric(kr.target_value, kr.metric_type, kr.unit_label)}
                    {kr.kpi_source ? ` · auto: ${kr.kpi_source}` : ''}
                  </div>
                </div>
                <div style={{ width: 150 }}>
                  <ProgressBar value={kr.progress} />
                  <div className="right muted mono" style={{ fontSize: 12 }}>
                    {kr.progress.toFixed(0)}%
                  </div>
                </div>
              </div>

              {canManage && (
                <details className="inline">
                  <summary>Check-in / cập nhật</summary>
                  <form action={checkInAction} className="row" style={{ marginTop: 8 }}>
                    <input type="hidden" name="key_result_id" value={kr.id} />
                    <div style={{ maxWidth: 140 }}>
                      <label className="f">Giá trị mới</label>
                      <input className="i" name="value" defaultValue={kr.current_value} />
                    </div>
                    <div style={{ maxWidth: 160 }}>
                      <label className="f">Độ tự tin</label>
                      <select className="i" name="confidence" defaultValue="on_track">
                        <option value="on_track">Đúng tiến độ</option>
                        <option value="at_risk">Có rủi ro</option>
                        <option value="off_track">Chệch hướng</option>
                      </select>
                    </div>
                    <div style={{ flex: 2 }}>
                      <label className="f">Ghi chú</label>
                      <input className="i" name="note" placeholder="Diễn biến tuần này…" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                      <button className="btn sm" type="submit">
                        Lưu
                      </button>
                    </div>
                  </form>
                  <form action={deleteKeyResultAction} style={{ marginTop: 6 }}>
                    <input type="hidden" name="key_result_id" value={kr.id} />
                    <button className="btn ghost sm" type="submit">
                      Xoá KR
                    </button>
                  </form>
                </details>
              )}
            </div>
          ))}

          {canManage && (
            <details className="inline" style={{ marginTop: 14 }}>
              <summary>+ Thêm Key Result</summary>
              <form action={createKeyResultAction} style={{ marginTop: 10 }}>
                <input type="hidden" name="objective_id" value={obj.id} />
                <label className="f">Tên KR</label>
                <input className="i" name="title" placeholder="VD: Đạt doanh thu 500 tỷ" required />
                <div className="row">
                  <div>
                    <label className="f">Loại</label>
                    <select className="i" name="metric_type" defaultValue="number">
                      <option value="number">Số</option>
                      <option value="percent">Phần trăm</option>
                      <option value="currency">Tiền (VND)</option>
                      <option value="boolean">Có/Không</option>
                    </select>
                  </div>
                  <div>
                    <label className="f">Hướng</label>
                    <select className="i" name="direction" defaultValue="increase">
                      <option value="increase">Càng cao càng tốt</option>
                      <option value="decrease">Càng thấp càng tốt</option>
                    </select>
                  </div>
                  <div>
                    <label className="f">Loại chỉ số</label>
                    <select className="i" name="indicator" defaultValue="lagging">
                      <option value="lagging">Kết quả (lagging)</option>
                      <option value="leading">Dẫn dắt (leading)</option>
                    </select>
                  </div>
                  <div>
                    <label className="f">Đơn vị</label>
                    <input className="i" name="unit_label" placeholder="tỷ, chỉ, HĐ…" />
                  </div>
                </div>
                <div className="row">
                  <div>
                    <label className="f">Bắt đầu</label>
                    <input className="i" name="start_value" defaultValue="0" />
                  </div>
                  <div>
                    <label className="f">Hiện tại</label>
                    <input className="i" name="current_value" defaultValue="0" />
                  </div>
                  <div>
                    <label className="f">Mục tiêu</label>
                    <input className="i" name="target_value" defaultValue="100" />
                  </div>
                  <div>
                    <label className="f">Trọng số</label>
                    <input className="i" name="weight" defaultValue="1" />
                  </div>
                </div>
                <label className="f">Nguồn KPI tự động (tuỳ chọn)<HelpTip k="kpi-auto" /></label>
                <select className="i" name="kpi_source" defaultValue="">
                  <option value="">— Nhập tay —</option>
                  {kpiSources.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <div style={{ marginTop: 12 }}>
                  <button className="btn" type="submit">
                    Thêm KR
                  </button>
                </div>
              </form>
            </details>
          )}
        </div>

        {/* ---------- Ngân sách ---------- */}
        <div className="grid two">
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Ngân sách gắn OKR<HelpTip k="budget" /></h3>
            <div className="stat">
              <div>
                <div className="n">{fmtVnd(budget.planned)}</div>
                <div className="l">Kế hoạch</div>
              </div>
              <div>
                <div className="n" style={{ color: budget.actual > budget.planned ? '#dc2626' : 'var(--ink)' }}>
                  {fmtVnd(budget.actual)}
                </div>
                <div className="l">Thực chi</div>
              </div>
              <div>
                <div className="n">
                  {budget.planned > 0 ? ((budget.actual / budget.planned) * 100).toFixed(0) : 0}%
                </div>
                <div className="l">Giải ngân</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <ProgressBar value={budget.planned > 0 ? (budget.actual / budget.planned) * 100 : 0} />
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>
              Tổng hợp từ {budget.count} kế hoạch hành động bên dưới.
            </p>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>OKR con (alignment xuống)</h3>
            {children.length === 0 && (
              <p className="muted">
                Chưa có OKR cấp dưới liên kết.{' '}
                <Link href={`/objectives/new?period=${obj.period_id}&parent=${obj.id}`}>+ Tạo OKR con</Link>
              </p>
            )}
            {children.map((c) => (
              <div key={c.id} className="obj-row">
                <div className="obj-main">
                  <div className="ttl">
                    <LevelBadge level={c.level} /> <Link href={`/objectives/${c.id}`}>{c.title}</Link>
                  </div>
                  <div className="obj-meta">{c.unit_name || c.owner_name || ''}</div>
                </div>
                <div className="obj-prog">
                  <ProgressBar value={c.progress} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ---------- Kế hoạch hành động ---------- */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Kế hoạch hành động (Initiatives)<HelpTip k="initiative" /></h3>
          <div className="table-scroll">
            <table className="t">
              <thead>
                <tr>
                  <th>Việc</th>
                  <th>Chủ trì</th>
                  <th>Trạng thái</th>
                  <th className="right">Tiến độ</th>
                  <th className="right">NS kế hoạch</th>
                  <th className="right">Thực chi</th>
                  <th>Hạn</th>
                  {canManage && <th></th>}
                </tr>
              </thead>
              <tbody>
                {initiatives.length === 0 && (
                  <tr>
                    <td colSpan={canManage ? 8 : 7} className="muted">
                      Chưa có kế hoạch hành động.
                    </td>
                  </tr>
                )}
                {initiatives.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <b>{i.title}</b>
                      {i.description && <div className="obj-meta">{i.description}</div>}
                    </td>
                    <td>{i.owner_name || <span className="muted">—</span>}</td>
                    <td>
                      {canManage ? (
                        <form action={updateInitiativeAction} style={{ display: 'flex', gap: 4 }}>
                          <input type="hidden" name="id" value={i.id} />
                          <input type="hidden" name="objective_id" value={obj.id} />
                          <input type="hidden" name="progress" value={i.progress} />
                          <input type="hidden" name="budget_planned" value={i.budget_planned} />
                          <input type="hidden" name="budget_actual" value={i.budget_actual} />
                          <select
                            className="i"
                            name="status"
                            defaultValue={i.status}
                            style={{ padding: '3px 6px', fontSize: 13 }}
                          >
                            {Object.entries(INIT_STATUS_LABEL).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                          <button className="btn ghost sm" type="submit">
                            ↻
                          </button>
                        </form>
                      ) : (
                        <span className="badge gray">{INIT_STATUS_LABEL[i.status]}</span>
                      )}
                    </td>
                    <td className="right mono">{i.progress.toFixed(0)}%</td>
                    <td className="right mono">{fmtVnd(i.budget_planned)}</td>
                    <td className="right mono">{fmtVnd(i.budget_actual)}</td>
                    <td>{fmtDate(i.due_on)}</td>
                    {canManage && (
                      <td>
                        <form action={deleteInitiativeAction}>
                          <input type="hidden" name="id" value={i.id} />
                          <input type="hidden" name="objective_id" value={obj.id} />
                          <button className="btn ghost sm danger" type="submit" title="Xoá">
                            ✕
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canManage && (
            <details className="inline" style={{ marginTop: 14 }}>
              <summary>+ Thêm kế hoạch hành động</summary>
              <form action={createInitiativeAction} style={{ marginTop: 10 }}>
                <input type="hidden" name="objective_id" value={obj.id} />
                <label className="f">Tên việc</label>
                <input className="i" name="title" placeholder="VD: Triển khai chương trình khuyến mãi Q3" required />
                <label className="f">Gắn vào Key Result (tuỳ chọn)</label>
                <select className="i" name="key_result_id" defaultValue="">
                  <option value="">— Gắn ở cấp Objective —</option>
                  {krs.map((kr) => (
                    <option key={kr.id} value={kr.id}>
                      {kr.title}
                    </option>
                  ))}
                </select>
                <div className="row">
                  <div>
                    <label className="f">Chủ trì</label>
                    <select className="i" name="owner_email" defaultValue="">
                      <option value="">— Chưa gán —</option>
                      {users.map((u) => (
                        <option key={u.email} value={u.email}>
                          {u.display_name || u.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="f">Ưu tiên</label>
                    <select className="i" name="priority" defaultValue="medium">
                      <option value="low">Thấp</option>
                      <option value="medium">Trung bình</option>
                      <option value="high">Cao</option>
                    </select>
                  </div>
                  <div>
                    <label className="f">Hạn</label>
                    <input className="i" type="date" name="due_on" />
                  </div>
                </div>
                <div className="row">
                  <div>
                    <label className="f">Ngân sách kế hoạch (VND)</label>
                    <input className="i" name="budget_planned" defaultValue="0" />
                  </div>
                  <div>
                    <label className="f">Đã chi (VND)</label>
                    <input className="i" name="budget_actual" defaultValue="0" />
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <button className="btn" type="submit">
                    Thêm việc
                  </button>
                </div>
              </form>
            </details>
          )}
        </div>

        {/* ---------- Lịch sử check-in ---------- */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Lịch sử check-in<HelpTip k="checkin" /></h3>
          {checkins.length === 0 && <p className="muted">Chưa có check-in.</p>}
          {checkins.map((c) => (
            <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <span
                className="badge"
                style={{ background: 'transparent', color: CONFIDENCE_COLOR[c.confidence], padding: 0 }}
              >
                ● {CONFIDENCE_LABEL[c.confidence]}
              </span>{' '}
              {c.value !== null && <b className="mono">{c.value}</b>} {c.note}
              <div className="obj-meta">
                {c.author_email} · {fmtDate(c.created_at)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
