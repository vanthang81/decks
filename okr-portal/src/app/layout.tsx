import type { Metadata, Viewport } from 'next';
import './globals.css';
import { FAVICON, BRAND } from '@/lib/brand';
import SiteFooter from '@/components/SiteFooter';
import BackToTop from '@/components/BackToTop';
import MobileGestures from '@/components/MobileGestures';

export const metadata: Metadata = {
  title: `${BRAND.full}`,
  description: 'Hệ thống OKR/KPI/kế hoạch hành động & ngân sách — BTMH.',
  icons: { icon: FAVICON },
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
        {children}
        <SiteFooter />
        <BackToTop />
        <MobileGestures />
      </body>
    </html>
  );
}
