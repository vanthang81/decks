'use client';

import { useState } from 'react';
import { StackedBar } from '@/components/charts';
import type { ProjectReport } from '@/lib/project-report';

const TS_C: Record<string, string> = {
  done: '#16a34a', in_progress: '#2563eb', blocked: '#dc2626', todo: '#94a3b8', canceled: '#cbd5e1',
};
const TS_L: Record<string, string> = {
  done: 'Xong', in_progress: 'Đang làm', blocked: 'Vướng', todo: 'Chưa làm', canceled: 'Huỷ',
};

function Tile({ label, value, color, sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <div style={{
      flex: '1 1 120px', minWidth: 110, border: '1px solid var(--line, #e7e2d9)', borderRadius: 10,
      padding: '10px 12px', background: 'var(--card, #fff)',
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color ?? 'var(--ink, #241c1a)', lineHeight: 1.1 }}>{value}</div>
      <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{label}</div>
      {sub ? <div className="muted" style={{ fontSize: 11.5, marginTop: 1 }}>{sub}</div> : null}
    </div>
  );
}

// Thanh ngang tỷ lệ (đến hạn / hoàn thành theo tháng).
function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 8, background: 'var(--line, #eee)', borderRadius: 6, overflow: 'hidden', minWidth: 40 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 6 }} />
      </div>
      <span style={{ width: 22, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 12.5 }}>{value}</span>
    </div>
  );
}

export default function ProjectReportView({ report }: { report: ProjectReport }) {
  const [tab, setTab] = useState<'total' | 'time'>('total');
  const r = report;
  const donePct = r.total ? Math.round((r.done / r.total) * 100) : 0;

  const tabBtn = (key: 'total' | 'time', label: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={tab === key ? 'btn' : 'btn ghost'}
      style={{ padding: '6px 14px' }}
    >
      {label}
    </button>
  );

  return (
    <div className="card">
      <div className="flexbtw" style={{ alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ marginTop: 0, marginBottom: 0 }}>Báo cáo tiến độ</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {tabBtn('total', 'Tổng dự án')}
          {tabBtn('time', 'Theo thời gian')}
        </div>
      </div>

      {tab === 'total' && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Tile label="Tổng việc" value={r.total} />
            <Tile label="Đã xong" value={r.done} color="#16a34a" sub={`${donePct}% số việc`} />
            <Tile label="Đang làm" value={r.byStatus.in_progress} color="#2563eb" />
            <Tile label="Vướng" value={r.byStatus.blocked} color="#dc2626" />
            <Tile label="Chưa làm" value={r.byStatus.todo} color="#64748b" />
            <Tile label="Quá hạn" value={r.overdue} color={r.overdue ? '#dc2626' : undefined} />
            <Tile label="Tiến độ TB" value={`${r.avgProgress}%`} color="var(--primary)" />
          </div>

          {r.total > 0 && (
            <div style={{ marginTop: 14 }}>
              <StackedBar
                segments={(['done', 'in_progress', 'blocked', 'todo', 'canceled'] as const)
                  .filter((s) => r.byStatus[s])
                  .map((s) => ({ value: r.byStatus[s], color: TS_C[s], label: TS_L[s] }))}
                height={10}
              />
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                {(['done', 'in_progress', 'blocked', 'todo'] as const).map((s) =>
                  r.byStatus[s] ? (
                    <span key={s} style={{ fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 2, background: TS_C[s], display: 'inline-block' }} />
                      {TS_L[s]} {r.byStatus[s]}
                    </span>
                  ) : null,
                )}
              </div>
            </div>
          )}

          <h4 style={{ margin: '16px 0 6px' }}>Theo người phụ trách</h4>
          {r.owners.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>Chưa có việc nào để thống kê.</p>
          ) : (
            <div className="table-scroll">
              <table className="t">
                <thead>
                  <tr>
                    <th>Người phụ trách</th>
                    <th style={{ textAlign: 'right' }}>Tổng</th>
                    <th style={{ textAlign: 'right' }}>Xong</th>
                    <th style={{ textAlign: 'right' }}>Đang mở</th>
                    <th style={{ textAlign: 'right' }}>Quá hạn</th>
                    <th style={{ textAlign: 'right' }}>Tiến độ TB</th>
                  </tr>
                </thead>
                <tbody>
                  {r.owners.map((o) => (
                    <tr key={o.email ?? '__none__'}>
                      <td>{o.name}</td>
                      <td style={{ textAlign: 'right' }}>{o.total}</td>
                      <td style={{ textAlign: 'right', color: '#16a34a' }}>{o.done}</td>
                      <td style={{ textAlign: 'right' }}>{o.active}</td>
                      <td style={{ textAlign: 'right', color: o.overdue ? '#dc2626' : undefined }}>{o.overdue || '—'}</td>
                      <td style={{ textAlign: 'right' }}>{o.progress}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'time' && (
        <div style={{ marginTop: 12 }}>
          {!r.hasTimeline ? (
            <p className="muted" style={{ margin: 0 }}>
              Chưa có mốc thời gian để thống kê. Đặt <b>hạn</b> cho công việc (và đánh dấu <b>Xong</b>) để theo dõi tiến độ theo tháng.
            </p>
          ) : (
            <>
              {r.current && (
                <div style={{
                  border: '1px solid var(--line, #e7e2d9)', borderRadius: 10, padding: '10px 14px',
                  background: 'var(--bg, #faf6f0)', marginBottom: 12,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Tháng này · {r.current.label}</div>
                  <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13.5 }}>
                    <span>Đến hạn: <b>{r.current.due}</b></span>
                    <span>Đã xong (đến hạn): <b style={{ color: '#16a34a' }}>{r.current.dueDone}</b>
                      {r.current.due > 0 ? ` (${Math.round((r.current.dueDone / r.current.due) * 100)}%)` : ''}</span>
                    <span>Hoàn thành trong tháng: <b style={{ color: '#2563eb' }}>{r.current.completed}</b></span>
                    <span>Quá hạn (toàn dự án): <b style={{ color: r.current.overdue ? '#dc2626' : 'inherit' }}>{r.current.overdue}</b></span>
                  </div>
                </div>
              )}
              <div className="table-scroll">
                <table className="t">
                  <thead>
                    <tr>
                      <th>Tháng</th>
                      <th style={{ minWidth: 130 }}>Đến hạn</th>
                      <th style={{ minWidth: 130 }}>Hoàn thành</th>
                      <th style={{ textAlign: 'right' }}>Đúng hạn</th>
                      <th style={{ textAlign: 'right' }}>Tỷ lệ đúng hạn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.months.map((m) => (
                      <tr key={m.key} style={m.isCurrent ? { background: 'rgba(124,3,18,0.06)' } : undefined}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {m.label}{m.isCurrent ? <span className="muted" style={{ fontSize: 11 }}> · này</span> : m.isFuture ? <span className="muted" style={{ fontSize: 11 }}> · sắp tới</span> : ''}
                        </td>
                        <td><Bar value={m.due} max={r.maxMonthly} color="#b45309" /></td>
                        <td><Bar value={m.completed} max={r.maxMonthly} color="#16a34a" /></td>
                        <td style={{ textAlign: 'right' }}>{m.dueDone ? `${m.dueOnTime}/${m.dueDone}` : '—'}</td>
                        <td style={{ textAlign: 'right' }}>{m.dueDone ? `${Math.round((m.dueOnTime / m.dueDone) * 100)}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
                <b style={{ color: '#b45309' }}>Đến hạn</b>: số việc có hạn trong tháng. <b style={{ color: '#16a34a' }}>Hoàn thành</b>: số việc đánh dấu Xong trong tháng.
                <b> Đúng hạn</b>: trong số việc đến hạn đã xong, bao nhiêu xong trước/đúng hạn.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
