'use client';

import { useEffect } from 'react';
import Link from 'next/link';

// Error boundary cấp ứng dụng: bắt lỗi render/Server Action, TỰ BÁO về /api/errlog (ghi nhật ký
// lỗi để tự phát hiện & sửa nhanh), rồi hiện thông báo thân thiện + nút thử lại.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
    <div className="wrap">
      <div className="card" style={{ maxWidth: 560, margin: '48px auto', textAlign: 'center', borderLeft: '4px solid #dc2626' }}>
        <h2 style={{ marginTop: 0, color: 'var(--primary)' }}>Đã có lỗi xảy ra</h2>
        <p className="muted" style={{ margin: '6px 0 14px' }}>
          Hệ thống đã tự ghi nhận lỗi này để kiểm tra &amp; khắc phục. Bạn thử lại thao tác vừa rồi; nếu vẫn lỗi, vui lòng báo lại.
        </p>
        {error.digest && <p className="mono muted" style={{ fontSize: 12 }}>Mã lỗi: {error.digest}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={() => reset()}>Thử lại</button>
          <Link className="btn ghost" href="/">Về trang chủ</Link>
        </div>
      </div>
    </div>
  );
}
