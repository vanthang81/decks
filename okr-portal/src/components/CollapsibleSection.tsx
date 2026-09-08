'use client';

import { useEffect, useRef, useState } from 'react';

// Khối nội dung DÀI có thể THU GỌN / MỞ RỘNG (vd Điều lệ dự án). Khi thu gọn: cắt chiều cao +
// phủ mờ dần ở đáy + nút "Mở rộng"; nhớ lựa chọn theo localStorage (mỗi khối 1 key). Chỉ hiện nút
// khi nội dung THỰC SỰ cao hơn ngưỡng (nội dung ngắn thì không vướng nút).
export default function CollapsibleSection({
  children,
  storageKey,
  collapsedHeight = 260,
  defaultCollapsed = true,
  moreLabel = 'Mở rộng toàn bộ',
  lessLabel = 'Thu gọn',
}: {
  children: React.ReactNode;
  storageKey: string;
  collapsedHeight?: number;
  defaultCollapsed?: boolean;
  moreLabel?: string;
  lessLabel?: string;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [overflowing, setOverflowing] = useState(false);
  const [ready, setReady] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Nạp lựa chọn đã lưu (nếu có).
  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v === '0') setCollapsed(false);
      else if (v === '1') setCollapsed(true);
    } catch {}
    setReady(true);
  }, [storageKey]);

  // Đo nội dung có cao quá ngưỡng không (để quyết định hiện nút).
  useEffect(() => {
    const measure = () => {
      if (ref.current) setOverflowing(ref.current.scrollHeight > collapsedHeight + 48);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [collapsedHeight, children]);

  const toggle = () => {
    setCollapsed((c) => {
      const n = !c;
      try { localStorage.setItem(storageKey, n ? '1' : '0'); } catch {}
      return n;
    });
  };

  const clamped = ready && collapsed && overflowing;

  return (
    <div>
      <div
        ref={ref}
        className="collapsible-body"
        style={{
          position: 'relative',
          maxHeight: clamped ? collapsedHeight : undefined,
          overflow: clamped ? 'hidden' : undefined,
        }}
      >
        {children}
        {clamped && <div className="collapsible-fade" aria-hidden />}
      </div>
      {overflowing && (
        <div className="collapsible-toggle-row">
          <button type="button" className="collapsible-toggle" onClick={toggle} aria-expanded={!collapsed}>
            <span>{collapsed ? moreLabel : lessLabel}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform .2s ease' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
