import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { LOGO_WORDMARK } from '@/lib/brand';
import { ROLE_LABEL, canAdmin, type Role } from '@/lib/rbac';
import NotifBell from '@/components/NotifBell';
import { unreadCount } from '@/lib/notifications';

export default async function SiteHeader({ active }: { active?: string }) {
  const session = await auth();
  const role = session?.user?.role as Role | undefined;
  const email = session?.user?.email ?? undefined;
  const name = session?.user?.displayName || session?.user?.name || session?.user?.email;
  const who = `${name ?? ''}${role ? ` · ${ROLE_LABEL[role]}` : ''}`;
  const notifCount = email ? await unreadCount(email).catch(() => 0) : 0;

  const links = [
    { href: '/', label: 'Bảng điều khiển', key: 'home', show: true },
    { href: '/objectives', label: 'OKR', key: 'okr', show: true },
    { href: '/projects', label: 'Dự án', key: 'projects', show: true },
    { href: '/my', label: 'Của tôi', key: 'my', show: true },
    { href: '/guide', label: 'Hướng dẫn', key: 'guide', show: true },
    { href: '/admin', label: 'Quản trị', key: 'admin', show: canAdmin(role) },
  ].filter((l) => l.show);

  return (
    <header className="site-header">
      <div className="inner">
        <Link href="/" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_WORDMARK} alt="Bảo Tín Mạnh Hải" className="brand-logo" />
          <span className="brand-sub">OKR</span>
        </Link>

        {/* ---- Desktop ---- */}
        <nav className="nav nav-desktop">
          {links.map((l) => (
            <Link key={l.key} href={l.href} className={active === l.key ? 'active' : ''}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="spacer" />
        {email && <NotifBell initialCount={notifCount} />}
        <div className="userchip userchip-desktop">
          {session?.user?.image && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img className="hdr-av" src={session.user.image} alt="" referrerPolicy="no-referrer" />
          )}
          <span>{who}</span>
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

        {/* ---- Mobile (hamburger + panel, không cần JS nhờ <details>) ---- */}
        <details className="mobile-menu">
          <summary className="hamburger" aria-label="Menu">
            <span />
            <span />
            <span />
          </summary>
          <div className="mobile-panel">
            <div className="mobile-user">{who}</div>
            <nav className="mobile-nav">
              {links.map((l) => (
                <Link key={l.key} href={l.href} className={active === l.key ? 'active' : ''}>
                  {l.label}
                </Link>
              ))}
            </nav>
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/login' });
              }}
            >
              <button className="btn mobile-logout" type="submit">
                Đăng xuất
              </button>
            </form>
          </div>
        </details>
      </div>
    </header>
  );
}
