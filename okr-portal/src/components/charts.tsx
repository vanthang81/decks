// Biểu đồ SVG nhẹ, server-render (không cần thư viện, khớp theme indigo).
import type { ReactNode } from 'react';

export type Seg = { value: number; color: string; label?: string };

/** Vòng tròn tiến độ / cơ cấu (donut). */
export function Donut({
  segments,
  size = 132,
  thickness = 16,
  centerTop,
  centerSub,
}: {
  segments: Seg[];
  size?: number;
  thickness?: number;
  centerTop?: ReactNode;
  centerSub?: ReactNode;
}) {
  const total = segments.reduce((a, s) => a + Math.max(0, s.value), 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={thickness} />
          {segments
            .filter((s) => s.value > 0)
            .map((s, i) => {
              const len = (s.value / total) * c;
              const el = (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })}
        </g>
        {centerTop != null && (
          <text x="50%" y="47%" textAnchor="middle" className="donut-top">
            {centerTop}
          </text>
        )}
        {centerSub != null && (
          <text x="50%" y="63%" textAnchor="middle" className="donut-sub">
            {centerSub}
          </text>
        )}
      </svg>
    </div>
  );
}

/** Chú thích màu cho donut/stacked. */
export function Legend({ items }: { items: { color: string; label: string; value?: number | string }[] }) {
  return (
    <div className="legend">
      {items.map((it, i) => (
        <div className="lg-row" key={i}>
          <span className="lg-dot" style={{ background: it.color }} />
          <span className="lg-lbl">{it.label}</span>
          {it.value != null && <span className="lg-val">{it.value}</span>}
        </div>
      ))}
    </div>
  );
}

/** Danh sách thanh ngang (so sánh nhóm/khối). */
export function BarList({
  items,
  max = 100,
  suffix = '%',
}: {
  items: { label: ReactNode; value: number; color?: string; sub?: ReactNode }[];
  max?: number;
  suffix?: string;
}) {
  const m = Math.max(max, ...items.map((i) => i.value), 1);
  return (
    <div className="barlist">
      {items.map((it, i) => (
        <div className="bl-row" key={i}>
          <span className="bl-lbl">{it.label}</span>
          <div className="bl-track">
            <span
              className="bl-fill"
              style={{ width: `${(it.value / m) * 100}%`, background: it.color ?? 'var(--primary)' }}
            />
          </div>
          <span className="bl-val">
            {it.value.toFixed(0)}
            {suffix}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Thanh xếp chồng ngang (phân bố theo nhóm). */
export function StackedBar({ segments, height = 12 }: { segments: Seg[]; height?: number }) {
  const total = segments.reduce((a, s) => a + Math.max(0, s.value), 0) || 1;
  return (
    <div className="stacked" style={{ height }}>
      {segments
        .filter((s) => s.value > 0)
        .map((s, i) => (
          <span
            key={i}
            className="st-seg"
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
            title={s.label ? `${s.label}: ${s.value}` : String(s.value)}
          />
        ))}
    </div>
  );
}

/** Đường xu hướng nhỏ (sparkline) — giá trị theo thời gian. */
export function Sparkline({
  points,
  width = 132,
  height = 34,
  color = 'var(--primary)',
}: {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pad = 3;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const step = w / (points.length - 1);
  const xy = points.map((p, i) => [pad + i * step, pad + h - ((p - min) / range) * h] as const);
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${pad},${pad + h} ${line} ${pad + w},${pad + h}`;
  const last = xy[xy.length - 1];
  return (
    <svg width={width} height={height} className="spark">
      <polygon points={area} fill={color} opacity={0.1} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.6} fill={color} />
    </svg>
  );
}
