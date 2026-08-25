'use client';

import { useState } from 'react';

// Ô "Kết quả" ở Thư viện KPI: hiện thực hiện kỳ này ngay tại chỗ (màu theo W/A/E),
// bấm → popup chi tiết (mục tiêu · % đạt · trạng thái · nguồn · ngưỡng · ghi chú) + sparkline xu hướng.

type Status = 'ok' | 'watch' | 'alert' | 'escalate';
type HistPoint = { period: string; kind: string; starts_on: string; actual: number | null; target: number | null };
export type KpiResultData = {
  code: string | null;
  name: string;
  unit_label: string | null;
  direction: 'up' | 'down';
  source: string;
  threshold_watch: number | null;
  threshold_alert: number | null;
  threshold_escalate: number | null;
  target: number | null;
  actual: number | null;
  note: string | null;
  updated_at: string | null;
  status: Status | null;
  att: number | null;
  history: HistPoint[];
};

const STATUS_LABEL: Record<Status, string> = { ok: 'Ổn', watch: 'Theo dõi', alert: 'Cảnh báo', escalate: 'Khẩn' };
const STATUS_CLS: Record<Status, string> = { ok: 'green', watch: 'amber', alert: 'amber', escalate: 'red' };
const STATUS_COLOR: Record<Status, string> = { ok: '#16a34a', watch: '#d97706', alert: '#ea580c', escalate: '#dc2626' };
const SOURCE_LABEL: Record<string, string> = { manual: 'Nhập tay', bigquery: 'Tự động · BigQuery', postgres: 'Tự động · Postgres' };
const KIND_LABEL: Record<string, string> = { multiyear: 'Nhiều năm', year: 'Năm', quarter: 'Quý', month: 'Tháng' };

// Định dạng giá trị theo đơn vị đo. Tiền (đ) → gọn tỷ/tr; % → 1 số lẻ; còn lại → số vi-VN.
function fmtVal(n: number | null, unit: string | null): string {
  if (n == null) return '—';
  const u = (unit || '').trim();
  const isMoney = /đ|vnd|₫/i.test(u);
  if (isMoney) {
    const abs = Math.abs(n);
    if (abs >= 1e9) return `${trim(n / 1e9)} tỷ`;
    if (abs >= 1e6) return `${trim(n / 1e6)} tr`;
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n)} đ`;
  }
  const num = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(n);
  return u && u !== 'đ' ? `${num} ${u}` : num;
}
function trim(n: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(Math.round(n * 100) / 100);
}
function fmtPct(att: number | null): string {
  return att == null ? '—' : `${Math.round(att * 100)}%`;
}
function fmtWhen(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso.slice(0, 16).replace('T', ' ');
  }
}

// Sparkline SVG thuần (không thư viện) — đường actual qua các kỳ, chấm điểm cuối theo màu trạng thái.
function Sparkline({ points, color }: { points: HistPoint[]; color: string }) {
  const vals = points.map((p) => p.actual).filter((v): v is number => v != null);
  if (vals.length < 2) return null;
  const W = 300, H = 64, PAD = 8;
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const n = vals.length;
  const x = (i: number) => PAD + (i * (W - 2 * PAD)) / (n - 1);
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - 2 * PAD);
  const d = vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = `${d} L ${x(n - 1).toFixed(1)} ${H - PAD} L ${x(0).toFixed(1)} ${H - PAD} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="kpi-spark" preserveAspectRatio="none" role="img" aria-label="Xu hướng">
      <path d={area} fill={color} fillOpacity={0.08} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {vals.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === n - 1 ? 3.5 : 2} fill={i === n - 1 ? color : '#fff'} stroke={color} strokeWidth={1.5} />
      ))}
    </svg>
  );
}

export default function KpiResultCell({ data }: { data: KpiResultData }) {
  const [open, setOpen] = useState(false);
  const { actual, target, status, att, unit_label, history } = data;
  const color = status ? STATUS_COLOR[status] : '#94a3b8';
  const hasVal = actual != null;

  return (
    <>
      <button
        type="button"
        className={`kpi-result-chip ${hasVal ? '' : 'empty'}`}
        style={hasVal ? { borderColor: color, color } : undefined}
        onClick={() => setOpen(true)}
        title={hasVal ? 'Xem chi tiết kết quả & xu hướng' : 'Chưa có số kỳ này — bấm xem chi tiết'}
      >
        {hasVal ? (
          <>
            <span className="kpi-result-num">{fmtVal(actual, unit_label)}</span>
            {att != null && <span className="kpi-result-att" style={{ background: color }}>{fmtPct(att)}</span>}
          </>
        ) : (
          <span className="kpi-result-empty">Chưa có số</span>
        )}
      </button>

      {open && (
        <div className="okr-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div className="okr-modal kpi-result-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="okr-modal-head">
              <b>
                {data.code && <span className="okr-code" style={{ marginRight: 6 }}>{data.code}</span>}
                {data.name}
              </b>
              <button type="button" className="okr-modal-x" onClick={() => setOpen(false)} aria-label="Đóng">✕</button>
            </div>

            {/* Dải số chính: Thực hiện · Mục tiêu · % đạt · Trạng thái */}
            <div className="kpi-result-grid">
              <div className="kpi-rg-cell">
                <span className="kpi-rg-lbl">Thực hiện</span>
                <span className="kpi-rg-big" style={{ color }}>{fmtVal(actual, unit_label)}</span>
              </div>
              <div className="kpi-rg-cell">
                <span className="kpi-rg-lbl">Mục tiêu</span>
                <span className="kpi-rg-big muted">{fmtVal(target, unit_label)}</span>
              </div>
              <div className="kpi-rg-cell">
                <span className="kpi-rg-lbl">% đạt</span>
                <span className="kpi-rg-big" style={{ color }}>{fmtPct(att)}</span>
              </div>
              <div className="kpi-rg-cell">
                <span className="kpi-rg-lbl">Trạng thái</span>
                {status
                  ? <span className={`badge ${STATUS_CLS[status]}`}>{STATUS_LABEL[status]}</span>
                  : <span className="muted">Chưa đánh giá</span>}
              </div>
            </div>

            {/* Thanh % đạt */}
            {att != null && (
              <div className="kpi-rg-bar">
                <div className="kpi-rg-bar-fill" style={{ width: `${Math.min(att * 100, 100)}%`, background: color }} />
                <span className="kpi-rg-bar-tick" title="Mục tiêu 100%" />
              </div>
            )}

            {/* Xu hướng */}
            <div className="kpi-rg-sec">
              <div className="kpi-rg-sec-h">Xu hướng qua các kỳ</div>
              {history.filter((h) => h.actual != null).length >= 2 ? (
                <>
                  <Sparkline points={history} color={color} />
                  <div className="table-scroll" style={{ marginTop: 8 }}>
                    <table className="t kpi-hist-t">
                      <thead><tr><th>Kỳ</th><th className="right">Thực hiện</th><th className="right">Mục tiêu</th></tr></thead>
                      <tbody>
                        {history.map((h, i) => (
                          <tr key={i}>
                            <td>{h.period} <span className="muted" style={{ fontSize: 11 }}>{KIND_LABEL[h.kind] || h.kind}</span></td>
                            <td className="right mono">{fmtVal(h.actual, unit_label)}</td>
                            <td className="right mono muted">{fmtVal(h.target, unit_label)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                  Chưa đủ dữ liệu để vẽ xu hướng (cần ≥ 2 kỳ có số thực hiện).
                </p>
              )}
            </div>

            {/* Chi tiết */}
            <div className="kpi-rg-meta">
              <div><span className="muted">Nguồn:</span> {SOURCE_LABEL[data.source] || data.source}</div>
              <div><span className="muted">Hướng tốt:</span> {data.direction === 'down' ? 'Càng thấp càng tốt' : 'Càng cao càng tốt'}</div>
              {(data.threshold_watch != null || data.threshold_alert != null || data.threshold_escalate != null) && (
                <div>
                  <span className="muted">Ngưỡng W/A/E:</span>{' '}
                  {fmtVal(data.threshold_watch, unit_label)} · {fmtVal(data.threshold_alert, unit_label)} · {fmtVal(data.threshold_escalate, unit_label)}
                </div>
              )}
              {data.updated_at && <div><span className="muted">Cập nhật:</span> {fmtWhen(data.updated_at)}</div>}
              {data.note && <div><span className="muted">Ghi chú:</span> {data.note}</div>}
            </div>

            <p className="muted" style={{ fontSize: 12, margin: '12px 0 0' }}>
              Nhập/đồng bộ số ở <a href="/kpi">Scorecard</a>. Số hiển thị ở cấp Công ty, kỳ hiện tại.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
