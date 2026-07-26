import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Deck Library · deck.consultx.vn',
  description: 'Kho slide deck BTMH — có kiểm soát truy cập.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
