import type { Metadata, Viewport } from 'next';
import './globals.css';
import { FAVICON, BRAND } from '@/lib/brand';
import SiteFooter from '@/components/SiteFooter';
import BackToTop from '@/components/BackToTop';
import MobileGestures from '@/components/MobileGestures';
import AutoHideHeader from '@/components/AutoHideHeader';
import TopLoadingBar from '@/components/TopLoadingBar';

export const metadata: Metadata = {
  title: `${BRAND.full}`,
  description: 'Hệ thống OKR/KPI/kế hoạch hành động & ngân sách — BTMH.',
  manifest: '/manifest.webmanifest',
  icons: {
    // Tab trình duyệt: ưu tiên SVG (nét ở mọi cỡ) + PNG dự phòng.
    icon: [
      { url: FAVICON, type: 'image/svg+xml' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    // iOS "Thêm vào MH chính": PNG (Safari không nhận data-URI cho apple-touch-icon).
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#7C0312',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <TopLoadingBar />
        {children}
        <SiteFooter />
        <BackToTop />
        <MobileGestures />
        <AutoHideHeader />
      </body>
    </html>
  );
}
