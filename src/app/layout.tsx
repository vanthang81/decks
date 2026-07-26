import type { Metadata } from 'next';
import './globals.css';
import { CONSULTX_FAVICON } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Deck Portal · deck.consultx.vn',
  description: 'Kho slide deck BTMH / ConsultX — có kiểm soát truy cập.',
  icons: { icon: CONSULTX_FAVICON },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
