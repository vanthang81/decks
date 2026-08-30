'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Mở một link CÓ HASH (vd từ chuông thông báo → /meetings/<id>#access-requests) sẽ CUỘN tới đúng
// khu vực cần xử lý + NHÁY nhẹ để người dùng thấy ngay chỗ cần thao tác. Chờ nội dung render xong
// mới cuộn (retry tối đa ~3s) vì trang tải dữ liệu bất đồng bộ. Mount 1 lần ở layout → áp cho MỌI trang.
export default function HashScroller() {
  const pathname = usePathname();
  useEffect(() => {
    const go = () => {
      const raw = window.location.hash.replace(/^#/, '');
      if (!raw) return;
      let id = raw;
      try { id = decodeURIComponent(raw); } catch { /* giữ nguyên */ }
      let tries = 0;
      const tick = () => {
        const el = document.getElementById(id);
        if (el) {
          el.style.scrollMarginTop = '72px'; // chừa thanh menu dính
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          el.classList.add('hash-flash');
          window.setTimeout(() => el.classList.remove('hash-flash'), 2300);
          return;
        }
        if (tries++ < 30) window.setTimeout(tick, 100);
      };
      tick();
    };
    go();
    window.addEventListener('hashchange', go);
    return () => window.removeEventListener('hashchange', go);
  }, [pathname]);
  return null;
}
