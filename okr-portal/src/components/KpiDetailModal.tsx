'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';

// Bấm vào TÊN KPI ở Thư viện → mở box xem ĐẦY ĐỦ thông tin KPI (chỉ đọc) + trace-back "đang dùng
// bởi thước đo (KR) nào". `actions` (Sửa/Xoá) do trang truyền vào, chỉ hiện khi được phép.
export default function KpiDetailModal({
  name,
  code,
  rows,
  links,
  actions,
}: {
  name: string;
  code: string | null;
  rows: { label: string; value: string }[];
  links: { href: string; label: string }[];
  actions?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="kpi-name-btn" onClick={() => setOpen(true)} title="Xem chi tiết KPI">
        {name}
      </button>
      {open && (
        <div className="okr-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div className="okr-modal okr-modal-wide" onMouseDown={(e) => e.stopPropagation()}>
            <div className="okr-modal-head">
              <b>{code ? `${code} · ` : ''}{name}</b>
              <button type="button" className="okr-modal-x" onClick={() => setOpen(false)} aria-label="Đóng">✕</button>
            </div>

            <div className="kpi-detail-grid">
              {rows.map((r, i) => (
                <div className="kpi-detail-row" key={i}>
                  <div className="kpi-detail-lbl">{r.label}</div>
                  <div className="kpi-detail-val">{r.value || <span className="muted">—</span>}</div>
                </div>
              ))}
            </div>

            <div className="kpi-detail-links">
              <div className="kpi-detail-lbl" style={{ marginBottom: 4 }}>
                Đang dùng bởi {links.length} thước đo (KR)
              </div>
              {links.length === 0 ? (
                <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
                  Chưa gắn thước đo (KR) nào → có thể sửa/xoá tự do.
                </p>
              ) : (
                <ul style={{ margin: '2px 0 0', paddingLeft: 18, fontSize: 13 }}>
                  {links.map((l, i) => (
                    <li key={i}><Link href={l.href} onClick={() => setOpen(false)}>{l.label}</Link></li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              {actions}
              <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
