import { Fragment } from 'react';
import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { LOGO_WORDMARK } from '@/lib/brand';
import { ROLE_LABEL, type Role } from '@/lib/rbac';
import NotifBell from '@/components/NotifBell';
import { unreadCount } from '@/lib/notifications';
import { getUser } from '@/lib/users';
import { loadAccess, canManageSystem } from '@/lib/access';

export default async function SiteHeader({ active }: { active?: string }) {
  const session = await auth();
  const role = session?.user?.role as Role | undefined;
  const email = session?.user?.email ?? undefined;
  const name = session?.user?.displayName || session?.user?.name || session?.user?.email;
  const who = `${name ?? ''}${role ? ` · ${ROLE_LABEL[role]}` : ''}`;
  const notifCount = email ? await unreadCount(email).catch(() => 0) : 0;
  const me = email ? await getUser(email).catch(() => null) : null;
  const access = await loadAccess();
  const showAdmin = me ? canManageSystem(me, access) : false;

  // Sắp xếp theo dòng chảy: Tổng quan → Chiến lược & Đo lường → Thực thi → Cá nhân → Trợ giúp.
  const links = [
    { href: '/', label: 'Bảng điều khiển', key: 'home', group: 'overview', show: true },
    { href: '/review', label: 'Họp điều hành', key: 'review', group: 'overview', show: true },
    { href: '/strategy', label: 'Chiến lược', key: 'strategy', group: 'strategy', show: true },
    { href: '/map', label: 'Bản đồ', key: 'map', group: 'strategy', show: true },
    { href: '/objectives', label: 'OKR', key: 'okr', group: 'strategy', show: true },
    { href: '/kpi', label: 'KPI', key: 'kpi', group: 'strategy', show: true },
    { href: '/projects', label: 'Dự án', key: 'projects', group: 'exec', show: true },
    { href: '/tasks', label: 'Công việc', key: 'tasks', group: 'exec', show: true },
    { href: '/my', label: 'Của tôi', key: 'my', group: 'personal', show: true },
    { href: '/guide', label: 'Hướng dẫn', key: 'guide', group: 'util', show: true },
    { href: '/admin', label: 'Quản trị', key: 'admin', group: 'util', show: showAdmin },
  ].filter((l) => l.show);

  const GROUP_LABEL: Record<string, string> = {
    overview: 'Tổng quan',
    strategy: 'Chiến lược & Đo lường',
    exec: 'Thực thi',
    personal: 'Cá nhân',
    util: 'Trợ giúp',
  };

  return (
    <header className="site-header">
      <div className="inner">
        <Link href="/" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_WORDMARK} alt="Bảo Tín Mạnh Hải" className="brand-logo" />
          <span className="brand-sub">OKR</span>
        </Link>

        {/* ---- Desktop (có vạch ngăn giữa các nhóm) ---- */}
        <nav className="nav nav-desktop">
          {links.map((l, i) => (
            <Fragment key={l.key}>
              {i > 0 && links[i - 1].group !== l.group && <span className="nav-div" aria-hidden />}
              <Link href={l.href} className={active === l.key ? 'active' : ''}>
                {l.label}
              </Link>
            </Fragment>
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
              {links.map((l, i) => (
                <Fragment key={l.key}>
                  {(i === 0 || links[i - 1].group !== l.group) && (
                    <div className="mobile-nav-group">{GROUP_LABEL[l.group]}</div>
                  )}
                  <Link href={l.href} className={active === l.key ? 'active' : ''}>
                    {l.label}
                  </Link>
                </Fragment>
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
