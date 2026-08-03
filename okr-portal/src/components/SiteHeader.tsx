import { Fragment } from 'react';
import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { LOGO_WORDMARK } from '@/lib/brand';
import { ROLE_LABEL, type Role } from '@/lib/rbac';
import NavIcon from '@/components/NavIcon';
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

  // Sắp xếp theo dòng chảy: Tổng quan → Chiến lược & Đo lường → Thực thi → Cá nhân → Quản trị.
  // icon = biểu tượng nhận diện nhanh (hiện ở cả dropdown desktop lẫn menu mobile).
  const links = [
    { href: '/', label: 'Bảng điều khiển', key: 'home', group: 'overview', icon: 'home', show: true },
    { href: '/review', label: 'Họp điều hành', key: 'review', group: 'overview', icon: 'review', show: true },
    { href: '/strategy', label: 'Chiến lược', key: 'strategy', group: 'strategy', icon: 'compass', show: true },
    { href: '/map', label: 'Bản đồ', key: 'map', group: 'strategy', icon: 'map', show: true },
    { href: '/objectives', label: 'OKR', key: 'okr', group: 'strategy', icon: 'target', show: true },
    { href: '/kpi', label: 'KPI', key: 'kpi', group: 'strategy', icon: 'chart', show: true },
    { href: '/projects', label: 'Dự án', key: 'projects', group: 'exec', icon: 'folder', show: true },
    { href: '/tasks', label: 'Công việc', key: 'tasks', group: 'exec', icon: 'check', show: true },
    { href: '/my', label: 'Của tôi', key: 'my', group: 'personal', icon: 'user', show: true },
    { href: '/guide', label: 'Hướng dẫn', key: 'guide', group: 'personal', icon: 'book', show: true },
    { href: '/admin', label: 'Quản trị', key: 'admin', group: 'admin', icon: 'sliders', show: showAdmin },
  ].filter((l) => l.show);

  const GROUP_LABEL: Record<string, string> = {
    overview: 'Tổng quan',
    strategy: 'Chiến lược & Đo lường',
    exec: 'Thực thi',
    personal: 'Cá nhân',
    admin: 'Quản trị',
  };
  const GROUP_ICON: Record<string, string> = {
    overview: 'home',
    strategy: 'compass',
    exec: 'bolt',
    personal: 'user',
    admin: 'sliders',
  };

  // Desktop: gom link thành CỤM DROPDOWN (giống Control Tower) → thanh menu gọn 1 hàng.
  const GROUP_ORDER = ['overview', 'strategy', 'exec', 'personal', 'admin'];
  const groups = GROUP_ORDER.map((gk) => ({
    key: gk,
    label: GROUP_LABEL[gk],
    icon: GROUP_ICON[gk],
    items: links.filter((l) => l.group === gk),
  })).filter((g) => g.items.length > 0);

  return (
    <header className="site-header">
      <div className="inner">
        <Link href="/" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_WORDMARK} alt="Bảo Tín Mạnh Hải" className="brand-logo" />
          <span className="brand-sub">
            <span className="brand-name">Performance Management</span>
            <span className="brand-tag">Từ chiến lược tới thực thi</span>
          </span>
        </Link>

        {/* ---- Desktop: cụm dropdown (mở khi hover/focus) ---- */}
        <nav className="nav nav-desktop">
          {groups.map((g) => {
            const groupActive = g.items.some((it) => it.key === active);
            // Cụm 1 mục → link thẳng (không dropdown)
            if (g.items.length === 1) {
              const it = g.items[0];
              return (
                <Link key={g.key} href={it.href} className={`nav-top ${groupActive ? 'active' : ''}`}>
                  <NavIcon name={it.icon} />
                  {it.label}
                </Link>
              );
            }
            return (
              <div key={g.key} className="nav-group">
                <button type="button" className={`nav-top nav-grp-btn ${groupActive ? 'active' : ''}`}>
                  <NavIcon name={g.icon} />
                  {g.label}
                  <span className="nav-caret" aria-hidden>▾</span>
                </button>
                <div className="nav-menu" role="menu">
                  {g.items.map((it) => (
                    <Link key={it.key} href={it.href} className={active === it.key ? 'active' : ''}>
                      <NavIcon name={it.icon} />
                      {it.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="spacer" />
        {email && <NotifBell initialCount={notifCount} />}
        <div className="userchip userchip-desktop">
          {session?.user?.image && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img className="hdr-av" src={session.user.image} alt="" referrerPolicy="no-referrer" />
          )}
          <Link href="/settings" className="userchip-name" title="Cài đặt cá nhân">{who}</Link>
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
            <Link href="/settings" className="mobile-user mobile-user-link">⚙ {who} · Cài đặt</Link>
            <nav className="mobile-nav">
              {links.map((l, i) => (
                <Fragment key={l.key}>
                  {(i === 0 || links[i - 1].group !== l.group) && (
                    <div className="mobile-nav-group">
                      <NavIcon name={GROUP_ICON[l.group]} /> {GROUP_LABEL[l.group]}
                    </div>
                  )}
                  <Link href={l.href} className={active === l.key ? 'active' : ''}>
                    <NavIcon name={l.icon} />
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
