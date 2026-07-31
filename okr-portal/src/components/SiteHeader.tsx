import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { LOGO_WORDMARK } from '@/lib/brand';
import { ROLE_LABEL, canAdmin, type Role } from '@/lib/rbac';

export default async function SiteHeader({ active }: { active?: string }) {
  const session = await auth();
  const role = session?.user?.role as Role | undefined;
  const name = session?.user?.displayName || session?.user?.name || session?.user?.email;

  const link = (href: string, label: string, key: string) => (
    <Link href={href} className={active === key ? 'active' : ''}>
      {label}
    </Link>
  );

  return (
    <header className="site-header">
      <div className="inner">
        <Link href="/" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_WORDMARK} alt="Bảo Tín Mạnh Hải" className="brand-logo" />
          <span className="brand-sub">OKR</span>
        </Link>
        <nav className="nav">
          {link('/', 'Bảng điều khiển', 'home')}
          {link('/objectives', 'OKR', 'okr')}
          {link('/my', 'Của tôi', 'my')}
          {link('/guide', 'Hướng dẫn', 'guide')}
          {canAdmin(role) && link('/admin', 'Quản trị', 'admin')}
        </nav>
        <div className="spacer" />
        <div className="userchip">
          <span>
            {name}
            {role ? ` · ${ROLE_LABEL[role]}` : ''}
          </span>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button className="btn ghost sm" type="submit">
              Đăng xuất
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
