'use client';

import { useEffect } from 'react';

// Bắt lỗi ở CẤP GỐC (khi cả layout gốc lỗi) — phải tự render <html>/<body>. Cũng tự báo /api/errlog.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    try {
      fetch('/api/errlog', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          digest: error.digest ?? null,
          message: error.message ?? null,
          path: typeof window !== 'undefined' ? window.location.pathname : null,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* best-effort */
    }
  }, [error]);

  return (
    <html lang="vi">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#FAF6F0', color: '#241C1A', margin: 0 }}>
        <div style={{ maxWidth: 520, margin: '80px auto', padding: 24, background: '#fff', border: '1px solid #EDE7E0', borderLeft: '4px solid #dc2626', borderRadius: 12, textAlign: 'center' }}>
          <h2 style={{ marginTop: 0, color: '#7C0312' }}>Đã có lỗi xảy ra</h2>
          <p style={{ color: '#7A6F6A' }}>Hệ thống đã ghi nhận lỗi để kiểm tra. Vui lòng thử lại.</p>
          {error.digest && <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#7A6F6A' }}>Mã lỗi: {error.digest}</p>}
          <button type="button" onClick={() => reset()} style={{ marginTop: 10, background: '#7C0312', color: '#fff', border: 0, borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontWeight: 700 }}>Thử lại</button>
        </div>
      </body>
    </html>
  );
}
