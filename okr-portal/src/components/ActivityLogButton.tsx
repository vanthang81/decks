'use client';

import { useState } from 'react';
import NavIcon from '@/components/NavIcon';
import type { AuditRow } from '@/app/audit/actions';

// Nút NHỎ mở popup "Nhật ký thay đổi" của 1 thực thể (ai làm gì khi nào). Đặt ở góc phải-trên
// các box input (OKR/KPI/dự án/cuộc họp/công việc…). Nạp dữ liệu khi mở (server action).
export default function ActivityLogButton({
  entity, entityId, load, title = 'Nhật ký thay đổi', compact = true,
}: {
  entity: string;
  entityId: string;
  load: (entity: string, entityId: string) => Promise<AuditRow[]>;
  title?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const openIt = async () => {
    setOpen(true);
    if (rows) return;
    setLoading(true); setErr('');
    try { setRows(await load(entity, entityId)); }
    catch { setErr('Không tải được nhật ký.'); }
    finally { setLoading(false); }
  };

  const fmt = (iso: string) => {
    const d = new Date(iso.replace(' ', 'T'));
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <button
        type="button"
        className={compact ? 'icon-btn' : 'btn ghost sm'}
        onClick={openIt}
        title={title}
        aria-label={title}
      >
        <NavIcon name="history" />
        {!compact && <span>Nhật ký</span>}
      </button>
      {open && (
        <div className="okr-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div className="okr-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="okr-modal-head">
              <b>{title}</b>
              <button type="button" className="okr-modal-x" onClick={() => setOpen(false)} aria-label="Đóng">✕</button>
            </div>
            {loading ? (
              <p className="muted">Đang tải…</p>
            ) : err ? (
              <p className="badge red" style={{ display: 'block', padding: 10 }}>{err}</p>
            ) : !rows || rows.length === 0 ? (
              <p className="muted">Chưa có thay đổi nào được ghi nhận cho mục này.</p>
            ) : (
              <ul className="audit-log">
                {rows.map((r, i) => (
                  <li key={i} className="audit-item">
                    <span className="audit-dot" aria-hidden />
                    <div className="audit-body">
                      <div className="audit-text">{r.text}</div>
                      <div className="audit-meta">
                        <b>{r.actor}</b> · {fmt(r.at)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
