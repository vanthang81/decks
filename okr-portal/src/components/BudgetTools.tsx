'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NavIcon from '@/components/NavIcon';
import { fmtVnd } from '@/lib/format';
import { importBudgetAction, syncBudgetBqAction } from '@/app/budget/actions';

type Line = { id: string; category: string; planned: number; actual: number; note: string | null; source: string };
export type UnitProject = {
  id: string; code: string | null; name: string; status: string;
  statusLabel: string; statusCls: string; planned: number; actual: number; lines: Line[];
};

const pct = (a: number, p: number) => (p > 0 ? Math.round((a / p) * 100) : 0);

// ── Thanh công cụ ngân sách (chỉ CEO/CFO): Xuất template · Import CSV · Đồng bộ BigQuery ──
export function BudgetToolbar({ periodId, status }: { periodId: string; status: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: 'ok' | 'warn' | 'err'; text: string } | null>(null);

  const exportUrl = `/api/budget/export?period=${encodeURIComponent(periodId)}&status=${encodeURIComponent(status)}`;

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setMsg(null);
      startTransition(async () => {
        try {
          const res = await importBudgetAction(text);
          router.refresh();
          const parts = [`Cập nhật ${res.updated} dòng`, res.skipped ? `bỏ qua ${res.skipped}` : ''].filter(Boolean);
          if (res.errors.length) setMsg({ kind: 'warn', text: `${parts.join(', ')}. Lỗi: ${res.errors.slice(0, 3).join(' · ')}${res.errors.length > 3 ? '…' : ''}` });
          else setMsg({ kind: 'ok', text: `✓ ${parts.join(', ')}.` });
        } catch (err) {
          setMsg({ kind: 'err', text: err instanceof Error ? err.message : String(err) });
        }
      });
    };
    reader.readAsText(f, 'utf-8');
    e.target.value = '';
  };

  const syncBq = () => {
    setMsg(null);
    startTransition(async () => {
      try {
        const res = await syncBudgetBqAction(periodId);
        if (res.updated > 0) { router.refresh(); setMsg({ kind: 'ok', text: `✓ Đồng bộ ${res.updated} dòng thực chi.` }); }
        else setMsg({ kind: 'warn', text: res.message });
      } catch (err) {
        setMsg({ kind: 'err', text: err instanceof Error ? err.message : String(err) });
      }
    });
  };

  return (
    <div className="bud-tools">
      <div className="row-actions">
        <a className="btn ghost sm" href={exportUrl} title="Tải template ngân sách (CSV) để sửa trong Excel">
          <NavIcon name="download" className="nav-ic btn-ic" /> Xuất template
        </a>
        <button type="button" className="btn ghost sm" onClick={() => fileRef.current?.click()} disabled={pending}
          title="Nạp ngân sách từ file CSV (khớp theo mã dự án + hạng mục)">
          <NavIcon name="upload" className="nav-ic btn-ic" /> {pending ? 'Đang xử lý…' : 'Import CSV'}
        </button>
        <button type="button" className="btn ghost sm" onClick={syncBq} disabled={pending}
          title="Đồng bộ thực chi từ BigQuery">
          <NavIcon name="database" className="nav-ic btn-ic" /> Đồng bộ BigQuery
        </button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
      </div>
      {msg && (
        <div className={`bud-msg bud-${msg.kind}`}>{msg.text}</div>
      )}
    </div>
  );
}

// ── Nút "Chi tiết" theo khối/đơn vị → popup cơ cấu chi phí (dự án + hạng mục) ──
export function UnitDetailButton({ unit, projects }: { unit: string; projects: UnitProject[] }) {
  const [open, setOpen] = useState(false);
  const planned = projects.reduce((a, p) => a + p.planned, 0);
  const actual = projects.reduce((a, p) => a + p.actual, 0);
  return (
    <>
      <button type="button" className="tbl-link bud-detail-link" onClick={() => setOpen(true)}>
        Chi tiết
      </button>
      {open && (
        <div className="okr-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div className="okr-modal" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="okr-modal-head">
              <div style={{ fontWeight: 700 }}>Cơ cấu ngân sách · {unit}</div>
              <button type="button" className="okr-modal-x" onClick={() => setOpen(false)} aria-label="Đóng">✕</button>
            </div>
            <div className="stat" style={{ margin: '4px 0 10px' }}>
              <div><div className="n" style={{ color: 'var(--primary)', fontSize: 18 }}>{fmtVnd(planned)}</div><div className="l">Kế hoạch</div></div>
              <div><div className="n" style={{ fontSize: 18 }}>{fmtVnd(actual)}</div><div className="l">Đã chi</div></div>
              <div><div className="n" style={{ fontSize: 18 }}>{pct(actual, planned)}%</div><div className="l">Đã dùng</div></div>
              <div><div className="n" style={{ fontSize: 18 }}>{projects.length}</div><div className="l">Dự án</div></div>
            </div>
            <div className="bud-detail-list">
              {projects.map((p) => {
                const up = pct(p.actual, p.planned);
                return (
                  <div key={p.id} className="bud-detail-proj">
                    <div className="bud-detail-projhead">
                      <Link href={`/projects/${p.id}`} className="tbl-link" target="_blank" rel="noopener">
                        {p.code && <span className="okr-code" style={{ marginRight: 6 }}>{p.code}</span>}{p.name}
                      </Link>
                      <span className={`badge ${p.statusCls}`} style={{ fontSize: 10.5 }}>{p.statusLabel}</span>
                      <span className="bud-detail-nums mono">
                        {fmtVnd(p.actual)} / {fmtVnd(p.planned)} · {up}%
                      </span>
                    </div>
                    {p.lines.length > 0 ? (
                      <table className="t bud-detail-lines">
                        <thead><tr><th style={{ textAlign: 'left' }}>Hạng mục</th><th className="right">Kế hoạch</th><th className="right">Đã chi</th><th style={{ textAlign: 'left' }}>Ghi chú</th></tr></thead>
                        <tbody>
                          {p.lines.map((l) => (
                            <tr key={l.id}>
                              <td>{l.category}{l.source === 'bigquery' && <span className="badge blue" style={{ fontSize: 9.5, marginLeft: 5 }}>BQ</span>}{l.source === 'import' && <span className="badge gray" style={{ fontSize: 9.5, marginLeft: 5 }}>CSV</span>}</td>
                              <td className="right mono">{fmtVnd(l.planned)}</td>
                              <td className="right mono">{fmtVnd(l.actual)}</td>
                              <td style={{ fontSize: 12 }}>{l.note || <span className="muted">—</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="muted" style={{ fontSize: 12, margin: '2px 0 0' }}>
                        Chưa tách hạng mục — dùng ngân sách dự án + thực chi gom từ công việc. Import CSV để tách chi tiết.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
