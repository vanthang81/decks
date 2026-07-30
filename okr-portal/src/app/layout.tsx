import type { Metadata } from 'next';
import './globals.css';
import { FAVICON, BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: `${BRAND.full}`,
  description: 'Hệ thống OKR/KPI/kế hoạch hành động & ngân sách — BTMH.',
  icons: { icon: FAVICON },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
