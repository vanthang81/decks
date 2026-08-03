// Bộ ICON line đơn sắc cho menu (stroke = currentColor) → ăn theo màu chữ:
// vàng BTMH trên nền maroon (nav trên) · maroon trên nền trắng (dropdown/mobile).
// Dùng line-icon thay emoji để icon SẮC NÉT, ĐỒNG BỘ, nổi bật & hợp tông thương hiệu.
import type { ReactNode } from 'react';

const P: Record<string, ReactNode> = {
  home: <><path d="M4 11.4 12 4l8 7.4" /><path d="M6 10.2V20h12V10.2" /></>,
  review: (
    <>
      <path d="M3 4h18" />
      <path d="M4 4v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V4" />
      <path d="M12 14v4" />
      <path d="M9 21l3-3 3 3" />
    </>
  ),
  compass: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2.2 4.8-4.8 2.2 2.2-4.8z" /></>,
  map: (
    <>
      <path d="M9 4.5 3.5 6.4v13.1L9 17.6l6 1.9 5.5-1.9V4.5L15 6.4 9 4.5z" />
      <path d="M9 4.5v13.1M15 6.4v13.1" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="4.3" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  chart: (
    <>
      <path d="M4 4v16h16" />
      <rect x="7" y="14" width="2.6" height="6" rx="0.5" />
      <rect x="11.2" y="10" width="2.6" height="10" rx="0.5" />
      <rect x="15.4" y="7" width="2.6" height="13" rx="0.5" />
    </>
  ),
  folder: <path d="M3.5 7.5a1.5 1.5 0 0 1 1.5-1.5h3.6l1.6 1.8H19a1.5 1.5 0 0 1 1.5 1.5v8.7a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" />,
  check: <><rect x="4" y="4" width="16" height="16" rx="2.5" /><path d="M8 12.2l2.6 2.6L16 9.4" /></>,
  user: <><circle cx="12" cy="8.2" r="3.8" /><path d="M5 19.5c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" /></>,
  book: <><path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2z" /><path d="M12 6.5v12" /></>,
  sliders: (
    <>
      <path d="M5 8h9M18 8h1M5 16h1M10 16h9" />
      <circle cx="16" cy="8" r="2.2" />
      <circle cx="8" cy="16" r="2.2" />
    </>
  ),
  bolt: <path d="M13 3 5 13.5h5.5L9.5 21 19 10h-5.5z" />,
  pencil: <><path d="M16.5 4.5l3 3L8 19l-4 1 1-4z" /><path d="M14 7l3 3" /></>,
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5.6A1.6 1.6 0 0 1 10.6 4h2.8A1.6 1.6 0 0 1 15 5.6V7" />
      <path d="M6.2 7l.9 12a2 2 0 0 0 2 1.9h5.8a2 2 0 0 0 2-1.9l.9-12" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  eye: <><path d="M2.6 12S6 5.8 12 5.8 21.4 12 21.4 12 18 18.2 12 18.2 2.6 12 2.6 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: (
    <>
      <path d="M4 4l16 16" />
      <path d="M9.6 9.7A3 3 0 0 0 14.3 13.9" />
      <path d="M7 7.3C4.4 8.9 2.6 12 2.6 12s3.4 6.2 9.4 6.2c1.5 0 2.9-.4 4-1" />
      <path d="M17.4 16.2C20 14.6 21.4 12 21.4 12S18 5.8 12 5.8c-.7 0-1.3.1-1.9.2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  wallet: (
    <>
      <path d="M3.5 7.5a1.5 1.5 0 0 1 1.5-1.5h12a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" />
      <path d="M16 6V4.8a1.3 1.3 0 0 0-1.6-1.25L4.6 6" />
      <path d="M20.5 11h-4a1.6 1.6 0 0 0 0 3.2h4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3.2 2.6-5 5.5-5s5.5 1.8 5.5 5" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 19c0-2.6-1.2-4.2-3-4.8" />
    </>
  ),
};

export default function NavIcon({ name, className = 'nav-ic' }: { name: string; className?: string }) {
  const body = P[name];
  if (!body) return null;
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false"
      fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {body}
    </svg>
  );
}
