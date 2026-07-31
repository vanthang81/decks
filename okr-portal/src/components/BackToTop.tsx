'use client';

import { useEffect, useState } from 'react';

// Nút nổi "Lên đầu trang" — hiện khi cuộn xuống, cuộn mượt về đầu.
export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      className={`backtop ${show ? 'show' : ''}`}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Lên đầu trang"
      title="Lên đầu trang"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
        <path d="M12 19V6M6 12l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
