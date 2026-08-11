import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { BRAND } from '@/lib/brand';
import SiteFooter from '@/components/SiteFooter';
import BackToTop from '@/components/BackToTop';
import MobileGestures from '@/components/MobileGestures';
import AutoHideHeader from '@/components/AutoHideHeader';
import TopLoadingBar from '@/components/TopLoadingBar';
import ToastProvider from '@/components/ToastProvider';
import FlashToaster from '@/components/FlashToaster';

export const metadata: Metadata = {
  title: `${BRAND.full}`,
  description: 'Hệ thống OKR/KPI/kế hoạch hành động & ngân sách — BTMH.',
  manifest: '/manifest.webmanifest',
  icons: {
    // Tab trình duyệt: logo BTMH thật (PNG) — nhiều cỡ để nét.
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    // iOS "Thêm vào MH chính": PNG full-bleed (iOS tự bo góc).
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
        <ToastProvider>
          <TopLoadingBar />
          <Suspense fallback={null}>
            <FlashToaster />
          </Suspense>
          {children}
          <SiteFooter />
          <BackToTop />
          <MobileGestures />
          <AutoHideHeader />
        </ToastProvider>
      </body>
    </html>
  );
}
