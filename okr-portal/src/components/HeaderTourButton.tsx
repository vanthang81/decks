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
  return (
    <button
      type="button"
      className="hdr-tour-btn"
      title="Xem hướng dẫn nhanh của trang này"
      onClick={() => window.dispatchEvent(new Event('okr:start-tour'))}
    >
      <NavIcon name="help" className="nav-ic" />
      <span className="hdr-tour-txt">Hướng dẫn</span>
    </button>
  );
}
