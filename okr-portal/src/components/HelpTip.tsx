import Link from 'next/link';
import { helpFor } from '@/lib/guide';

// Chấm trợ giúp "ⓘ": hover xem tooltip ngắn, bấm mở đúng mục trong trang Hướng dẫn.
// Dùng: <HelpTip k="key-result" /> (key khớp FEATURES trong src/lib/guide.ts).
export default function HelpTip({ k }: { k: string }) {
  const f = helpFor(k);
  if (!f) return null;
  return (
    <Link
      href={`/guide#feat-${k}`}
      title={f.help}
      className="helptip"
      aria-label={`Hướng dẫn: ${f.title}`}
    >
      ⓘ
    </Link>
  );
}
