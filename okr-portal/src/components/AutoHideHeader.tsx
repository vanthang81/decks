'use client';

import { useEffect } from 'react';

// Tự ẩn thanh menu (site-header) khi cuộn XUỐNG, hiện lại khi cuộn LÊN — CHỈ mobile
// (≤760px) để xem được nhiều nội dung hơn. Desktop luôn hiện đầy đủ.
export default function AutoHideHeader() {
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)');
    const root = document.documentElement;
    let lastY = window.scrollY;
    let ticking = false;

    const apply = () => {
      const y = window.scrollY;
      if (!mq.matches) {
        root.classList.remove('hdr-up');
      } else {
        const dy = y - lastY;
        if (y < 64) root.classList.remove('hdr-up'); // gần đỉnh: luôn hiện
        else if (dy > 6) root.classList.add('hdr-up'); // cuộn xuống: ẩn
        else if (dy < -6) root.classList.remove('hdr-up'); // cuộn lên: hiện
      }
      lastY = y;
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    };
    const onResize = () => {
      if (!mq.matches) root.classList.remove('hdr-up');
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      root.classList.remove('hdr-up');
    };
  }, []);

  return null;
}
