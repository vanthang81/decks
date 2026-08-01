'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

// Thanh tiến trình mảnh trên đỉnh trang — hiện ngay khi bấm link điều hướng nội bộ,
// chạy tới ~90% rồi hoàn tất khi trang mới sẵn sàng. Giúp thao tác "mượt", không còn
// cảm giác "bấm mà không phản hồi" (best-practice giống Control Tower price-engine).
export default function TopLoadingBar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timers = useRef<number[]>([]);
  const prevPath = useRef(pathname);

  // Bộ điều khiển đặt trong ref để 2 effect dùng chung, tránh stale closure.
  const ctrl = useRef({
    clear() {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    },
    start() {
      this.clear();
      setVisible(true);
      setProgress(10);
      let p = 10;
      const tick = () => {
        p += Math.max(0.4, (92 - p) * 0.09);
        if (p > 92) p = 92;
        setProgress(p);
        if (p < 92) timers.current.push(window.setTimeout(tick, 170));
      };
      timers.current.push(window.setTimeout(tick, 170));
    },
    finish() {
      this.clear();
      setProgress(100);
      timers.current.push(window.setTimeout(() => setVisible(false), 240));
      timers.current.push(window.setTimeout(() => setProgress(0), 520));
    },
  });

  // Bắt click vào <a> nội bộ để KHỞI ĐỘNG thanh (capture để chạy trước điều hướng).
  useEffect(() => {
    const c = ctrl.current;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const a = (e.target as HTMLElement | null)?.closest?.('a');
      if (!a) return;
      const href = a.getAttribute('href');
      const target = a.getAttribute('target');
      if (
        !href ||
        target === '_blank' ||
        a.hasAttribute('download') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')
      )
        return;
      try {
        const url = new URL(href, location.href);
        if (url.origin !== location.origin) return; // link ngoài → để trình duyệt lo
        if (url.pathname === location.pathname && url.search === location.search) return; // cùng trang
      } catch {
        return;
      }
      c.start();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // HOÀN TẤT khi đường dẫn đổi (trang mới đã render).
  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;
    ctrl.current.finish();
  }, [pathname]);

  // Dọn timer khi unmount.
  useEffect(() => () => ctrl.current.clear(), []);

  return (
    <div className={`toploader ${visible ? 'on' : ''}`} aria-hidden>
      <div className="toploader-bar" style={{ width: `${progress}%` }} />
    </div>
  );
}
