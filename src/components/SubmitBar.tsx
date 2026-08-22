'use client';

import { useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';

// Nút submit + trạng thái cho form Server Action (upload nội dung deck).
// Khi đang xử lý: khoá nút (chống bấm lại), đổi chữ, hiện thanh tiến trình + đồng hồ giây.
// Xong: Server Action redirect → trang tải lại, hiện notice "✓ Đã cập nhật" (đã có sẵn ở trang).
export default function SubmitBar({
  label = 'Lưu nội dung',
  pendingLabel = 'Đang tải lên & xử lý…',
  className = 'btn',
}: {
  label?: string;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (!pending) return;
    setSecs(0);
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [pending]);

  return (
    <div style={{ marginTop: 12 }}>
      <button
        className={className}
        type="submit"
        disabled={pending}
        aria-busy={pending}
        style={pending ? { cursor: 'progress', opacity: 0.75 } : undefined}
      >
        {pending ? `⏳ ${pendingLabel}` : label}
      </button>
      {pending && (
        <div style={{ marginTop: 8, maxWidth: 420 }} role="status" aria-live="polite">
          <div style={{ height: 6, borderRadius: 4, background: 'var(--line)', overflow: 'hidden' }}>
            <div className="upbar" />
          </div>
          <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
            Đã nhận — đang tải lên &amp; xử lý trên máy chủ ({secs}s). Đừng đóng trang hay bấm lại; trang tự cập nhật khi xong.
          </p>
        </div>
      )}
    </div>
  );
}
