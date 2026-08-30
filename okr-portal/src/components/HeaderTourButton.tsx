'use client';

import { usePathname } from 'next/navigation';
import NavIcon from '@/components/NavIcon';
import { PAGE_TOURS, tourKeyForPath } from '@/lib/page-tours';

// Nút "Hướng dẫn" trên header — CHỈ hiện ở trang CÓ tour (khớp PAGE_TOURS), bấm để mở lại tour trang đó.
// Tự động phủ trang mới: chỉ cần trang có entry trong page-tours.ts là nút xuất hiện.
export default function HeaderTourButton() {
  const pathname = usePathname();
  const key = tourKeyForPath(pathname);
  if (!key || !PAGE_TOURS[key]) return null;
  // Nút CHỈ-ICON (?) để tránh trùng nhãn với mục "Hướng dẫn" (tài liệu) trên thanh nav.
  // Bấm = chạy lại hướng dẫn nhanh (walkthrough khoét sáng) của ĐÚNG màn hình hiện tại.
  return (
    <button
      type="button"
      className="hdr-tour-btn"
      title="Hướng dẫn nhanh trên màn hình này"
      aria-label="Hướng dẫn nhanh trên màn hình này"
      onClick={() => window.dispatchEvent(new Event('okr:start-tour'))}
    >
      <NavIcon name="help" className="nav-ic" />
    </button>
  );
}
