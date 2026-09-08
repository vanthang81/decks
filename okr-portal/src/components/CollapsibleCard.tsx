'use client';

import { useEffect, useState, type ReactNode } from 'react';
import NavIcon from '@/components/NavIcon';

// Card có nút THU GỌN / MỞ RỘNG ở góc phải-trên (nhớ trạng thái theo trình duyệt).
// Dùng cho các mục tham chiếu không cần luôn hiển thị (Thư viện tài liệu, Thành viên dự án…).
// Header luôn hiện (kèm số đếm) để biết có nội dung bên trong; thân ẩn/hiện.
export default function CollapsibleCard({
  title,
  count,
  storageKey,
  defaultCollapsed = true,
  children,
}: {
  title: string;
  count?: number;
  storageKey: string;
  defaultCollapsed?: boolean;
  children: ReactNode;
}) {
  // Khởi tạo = defaultCollapsed để SSR và lần render client đầu KHỚP nhau (không nháy nội dung),
  // sau đó effect đọc lựa chọn đã lưu để ghi đè.
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v === '0' || v === '1') setCollapsed(v === '1');
    } catch {}
  }, [storageKey]);

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(storageKey, next ? '1' : '0'); } catch {}
      return next;
    });

  return (
    <div className="card">
      <div className="flexbtw" style={{ alignItems: 'center', gap: 10 }}>
        <h3 style={{ margin: 0 }}>
          {title}
          {count != null ? <span className="muted" style={{ fontWeight: 400 }}> ({count})</span> : null}
        </h3>
        <button
          type="button"
          className={`icon-btn cc-toggle${collapsed ? ' cc-collapsed' : ''}`}
          onClick={toggle}
          aria-expanded={!collapsed}
          title={collapsed ? 'Mở rộng' : 'Thu gọn'}
          aria-label={collapsed ? 'Mở rộng' : 'Thu gọn'}
        >
          <NavIcon name="chevron" />
        </button>
      </div>
      <div hidden={collapsed} style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}
