import Link from 'next/link';
import { CONSULTX_LOGO, PORTAL_NAME } from '@/lib/brand';

// Header thương hiệu ConsultX, dùng chung mọi trang portal.
// Logo + nút "Trang chủ" luôn đưa về Home (/). `actions` = nav/nút riêng của từng trang (bên phải).
export default function SiteHeader({
  subtitle,
  actions,
  showHome = true,
}: {
  subtitle?: string;
  actions?: React.ReactNode;
  showHome?: boolean;
}) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-brand" aria-label="Về trang chủ">
          <span className="logo-chip">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={CONSULTX_LOGO} alt="ConsultX" width={132} height={39} />
          </span>
          <span className="site-brand-text">
            <span className="site-brand-name">{PORTAL_NAME}</span>
            {subtitle && <span className="site-brand-sub">{subtitle}</span>}
          </span>
        </Link>
        <nav className="site-nav">
          {showHome && (
            <Link className="btn" href="/">
              <span aria-hidden>⌂</span> Trang chủ
            </Link>
          )}
          {actions}
        </nav>
      </div>
    </header>
  );
}
