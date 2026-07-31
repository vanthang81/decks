'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Chuông thông báo góc phải: số chưa đọc, tự làm mới mỗi 60s.
export default function NotifBell({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch('/api/notifications/count');
        if (r.ok && alive) {
          const j = await r.json();
          setCount(j.count ?? 0);
        }
      } catch {
        /* ignore */
      }
    };
    const iv = setInterval(tick, 60000);
    const onFocus = () => tick();
    window.addEventListener('focus', onFocus);
    return () => {
      alive = false;
      clearInterval(iv);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      className="notif-bell"
      title="Thông báo"
      aria-label={count > 0 ? `Thông báo: ${count} chưa đọc` : 'Thông báo'}
    >
      <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden>
        <path
          d="M12 3a6 6 0 0 0-6 6v3.5L4.5 15h15L18 12.5V9a6 6 0 0 0-6-6zM9.5 18a2.5 2.5 0 0 0 5 0"
          fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
      {count > 0 && <span className="notif-badge">{count > 99 ? '99+' : count}</span>}
    </Link>
  );
}
