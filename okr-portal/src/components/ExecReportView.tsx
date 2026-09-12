'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ExecReport, Counts, UnitRow } from '@/lib/exec-report';

const pct = (a: number, b: number): string => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—');
const rateColor = (a: number, b: number): string => {
  if (b === 0) return 'var(--muted)';
  const r = a / b;
  return r >= 0.8 ? '#15803d' : r >= 0.5 ? '#B45309' : '#B42318';
};

function Tile({ n, label, color }: { n: number | string; label: string; color?: string }) {
  return (
    <div className="er-tile">
      <div className="er-tile-n" style={color ? { color } : undefined}>{n}</div>
      <div className="er-tile-l">{label}</div>
    </div>
  );
}

// Hàng số liệu (đơn vị hoặc người): các cột đếm + % hoàn thành + % đúng hạn. "Chậm deadline" = trễ + quá hạn.
function CountCells({ c }: { c: Counts }) {
  const late = c.doneLate + c.overdue;
  return (
    <>
      <td className="right mono">{c.total}</td>
      <td className="right mono">{c.done}</td>
      <td className="right mono" style={{ color: c.doneOntime ? '#15803d' : 'var(--muted)' }}>{c.doneOntime}</td>
      <td className="right mono" style={{ color: c.doneLate ? '#B42318' : 'var(--muted)' }}>{c.doneLate}</td>
      <td className="right mono" style={{ color: c.overdue ? '#B42318' : 'var(--muted)' }}>{c.overdue}</td>
      <td className="right mono">{c.ontrack}</td>
      <td className="right"><b style={{ color: rateColor(c.done, c.total) }}>{pct(c.done, c.total)}</b></td>
      <td className="right"><b style={{ color: rateColor(c.doneOntime, c.done) }}>{pct(c.doneOntime, c.done)}</b></td>
      <td className="right mono"><b style={{ color: late ? '#B42318' : '#15803d' }}>{late}</b></td>
    </>
  );
}

function UnitBlock({ u }: { u: UnitRow }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="er-unit" onClick={() => setOpen((v) => !v)} title="Bấm để xem theo cá nhân">
        <td>
          <span className={`er-caret${open ? ' open' : ''}`}>▸</span>
          <b>{u.unitName}</b>
          <span className="muted" style={{ fontSize: 11.5, marginLeft: 6 }}>{u.people.length} người</span>
        </td>
        <CountCells c={u.counts} />
      </tr>
      {open && u.people.map((p) => (
        <tr key={p.email} className="er-person">
          <td><span className="er-person-name">{p.name}</span></td>
          <CountCells c={p.counts} />
        </tr>
      ))}
    </>
  );
}

export default function ExecReportView({ report, navBase }: { report: ExecReport; navBase: string }) {
  const t = report.totals;
  const late = t.doneLate + t.overdue;
  const link = (params: Record<string, string>) => {
    const sp = new URLSearchParams({ period: report.period, d: report.anchor, ...params });
    return `${navBase}?${sp.toString()}`;
  };

  return (
    <div>
      {/* Bộ chọn kỳ + điều hướng */}
      <div className="er-bar">
        <div className="er-seg">
          <Link href={link({ period: 'week', d: report.anchor })} className={`er-seg-btn${report.period === 'week' ? ' on' : ''}`}>Tuần</Link>
          <Link href={link({ period: 'month', d: report.anchor })} className={`er-seg-btn${report.period === 'month' ? ' on' : ''}`}>Tháng</Link>
        </div>
        <div className="er-nav">
          <Link href={link({ d: report.prevAnchor })} className="btn ghost sm" aria-label="Kỳ trước">‹</Link>
          <span className="er-period-label">{report.label}</span>
          <Link href={link({ d: report.nextAnchor })} className="btn ghost sm" aria-label="Kỳ sau">›</Link>
        </div>
        <span className="muted" style={{ fontSize: 12.5 }}>Phạm vi: <b>{report.scopeLabel}</b></span>
      </div>

      {/* Tiles tổng */}
      <div className="er-tiles">
        <Tile n={t.total} label="Tổng việc" />
        <Tile n={t.done} label="Hoàn thành" color="#15803d" />
        <Tile n={t.doneOntime} label="Đúng hạn" color="#15803d" />
        <Tile n={t.doneLate} label="Trễ hạn" color={t.doneLate ? '#B42318' : undefined} />
        <Tile n={t.overdue} label="Quá hạn (chưa xong)" color={t.overdue ? '#B42318' : undefined} />
        <Tile n={t.ontrack} label="Đang làm/đúng tiến độ" />
        <Tile n={pct(t.done, t.total)} label="% Hoàn thành" color={rateColor(t.done, t.total)} />
        <Tile n={late} label="⚠ Chậm deadline" color={late ? '#B42318' : '#15803d'} />
      </div>

      {report.units.length === 0 ? (
        <div className="card"><p className="muted" style={{ margin: 0 }}>Không có công việc nào trong kỳ này (theo phạm vi của bạn).</p></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-scroll wide-x">
            <table className="t er-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', minWidth: 220 }}>Đơn vị / Cá nhân</th>
                  <th className="right">Tổng</th>
                  <th className="right">Hoàn thành</th>
                  <th className="right">Đúng hạn</th>
                  <th className="right">Trễ hạn</th>
                  <th className="right">Quá hạn</th>
                  <th className="right">Đang làm</th>
                  <th className="right">% HT</th>
                  <th className="right">% Đúng hạn</th>
                  <th className="right">⚠ Chậm</th>
                </tr>
              </thead>
              <tbody>
                {report.units.map((u) => <UnitBlock key={u.unitId ?? '__none'} u={u} />)}
                <tr className="er-total">
                  <td><b>TỔNG CỘNG</b></td>
                  <CountCells c={t} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
        “Chậm deadline” = việc <b>hoàn thành trễ</b> (done sau hạn + {report.graceDays} ngày ân hạn) + việc <b>quá hạn chưa xong</b>.
        Bấm tên đơn vị để xem chi tiết theo từng người. Kỳ tính theo <b>ngày đến hạn</b> hoặc <b>ngày hoàn thành</b> trong kỳ.
      </p>
    </div>
  );
}
