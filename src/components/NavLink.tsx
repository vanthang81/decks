'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Link điều hướng có tô sáng khi ĐANG Ở trang đó. Active khi: pathname == href, HOẶC khớp 1 prefix
// (dùng prefix cho trang con, vd /admin/decks/[id] vẫn sáng mục "Decks"). KHÔNG dùng href làm prefix
// tự động để tránh '/admin' hoặc '/' nuốt hết các mục khác.
export default function NavLink({
  href,
  prefixes = [],
  className = 'btn',
  children,
}: {
  href: string;
  prefixes?: string[];
  className?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '/';
  const active =
    pathname === href || prefixes.some((p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`));
  return (
    <Link className={`${className}${active ? ' active' : ''}`} href={href} aria-current={active ? 'page' : undefined}>
      {children}
    </Link>
  );
}
