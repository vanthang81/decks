'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { helpFor } from '@/lib/guide';

// Chấm trợ giúp "ⓘ": hover xem tooltip ngắn; BẤM mở popup hướng dẫn chi tiết.
// Toàn bộ nội dung được quy hoạch trong FEATURES (src/lib/guide.ts) và liệt kê ở trang /guide.
// Dùng: <HelpTip k="key-result" /> (key khớp FEATURES).
export default function HelpTip({ k }: { k: string }) {
  const f = helpFor(k);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!f) return null;

  return (
    <>
      <button
        type="button"
        className="helptip"
        title={f.help}
        aria-label={`Hướng dẫn: ${f.title}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        ⓘ
      </button>

      {open && (
        <div className="okr-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div className="okr-modal help-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="okr-modal-head">
              <b>{f.title}</b>
              <button type="button" className="okr-modal-x" onClick={() => setOpen(false)} aria-label="Đóng">
                ✕
              </button>
            </div>
            {f.where && <div className="help-where">📍 {f.where}</div>}
            {Array.isArray(f.detail) ? (
              <ul className="help-list">
                {f.detail.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            ) : (
              <p className="help-detail">{f.detail}</p>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <Link className="btn ghost sm" href={`/guide#feat-${k}`} onClick={() => setOpen(false)}>
                Mở trang Hướng dẫn đầy đủ →
              </Link>
              <button className="btn sm" type="button" onClick={() => setOpen(false)}>
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
