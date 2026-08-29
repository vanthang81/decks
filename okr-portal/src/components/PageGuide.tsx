'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PAGE_GUIDES } from '@/lib/page-guides';

// Khung "HƯỚNG DẪN NHANH" cố định đầu mỗi trang: người mới nhìn là dùng được ngay.
// Thu gọn được + nhớ theo từng trang (localStorage `pg_<key>`). Nội dung ở src/lib/page-guides.ts.
export default function PageGuide({ pageKey }: { pageKey: string }) {
  const g = PAGE_GUIDES[pageKey];
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(`pg_${pageKey}`) === '1');
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [pageKey]);

  if (!g) return null;

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(`pg_${pageKey}`, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={`pgd${collapsed ? ' pgd-collapsed' : ''}`}>
      <button type="button" className="pgd-head" onClick={toggle} aria-expanded={!collapsed}>
        <span className="pgd-ic" aria-hidden>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
          </svg>
        </span>
        <b className="pgd-title">Hướng dẫn nhanh</b>
        <span className="pgd-sub">{g.title}</span>
        <span className="pgd-chev" aria-hidden>{collapsed ? '▸' : '▾'}</span>
      </button>
      {/* ready → tránh nháy; server render mở, client đọc localStorage rồi mới ẩn nếu đã thu gọn */}
      {(!ready || !collapsed) && (
        <div className="pgd-body">
          {g.intro && <p className="pgd-intro">{g.intro}</p>}
          <ul className="pgd-list">
            {g.tips.map((t, i) => (
              <li key={i}><b>{t.k}</b> — {t.v}</li>
            ))}
          </ul>
          {g.guideHref && (
            <Link href={g.guideHref} className="pgd-more">Xem hướng dẫn đầy đủ →</Link>
          )}
        </div>
      )}
    </div>
  );
}
