'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import ProductTour from '@/components/ProductTour';
import { PAGE_TOURS, tourKeyForPath } from '@/lib/page-tours';

// Bộ TOUR TỰ ĐỘNG THEO TRANG — mount 1 lần ở layout gốc. Tự nhận diện trang qua đường dẫn rồi chạy
// đúng tour của trang đó (nếu có trong PAGE_TOURS). Nhờ vậy THÊM TRANG MỚI chỉ cần khai báo ở
// src/lib/page-tours.ts — không phải sửa từng trang. `?tour=1` ép mở lại (dùng cho link/nút).
export default function AutoPageTour() {
  const pathname = usePathname();
  const key = tourKeyForPath(pathname);
  const [force, setForce] = useState(false);

  useEffect(() => {
    try { setForce(new URLSearchParams(window.location.search).get('tour') === '1'); } catch { setForce(false); }
  }, [pathname]);

  if (!key) return null;
  const steps = PAGE_TOURS[key];
  if (!steps || steps.length === 0) return null;
  // key vào React để đổi trang là remount → tour trang mới tự khởi động.
  return <ProductTour key={key} steps={steps} tourKey={key} force={force} />;
}
