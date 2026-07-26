import { signIn } from '@/auth';
import { CONSULTX_LOGO, PORTAL_NAME } from '@/lib/brand';

export const dynamic = 'force-dynamic';

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="login-card">
      <span className="logo-chip">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={CONSULTX_LOGO} alt="ConsultX" />
      </span>
      <div className="brand">{PORTAL_NAME} · deck.consultx.vn</div>
      <h1 style={{ fontSize: 28, margin: '8px 0 2px' }}>Đăng nhập</h1>
      <p className="sub" style={{ margin: '6px auto 22px' }}>
        Chỉ tài khoản Google trong danh sách được phép mới vào được.
      </p>
      {searchParams.error && (
        <p style={{ color: 'var(--bad)', fontSize: 14, marginTop: 0 }}>
          {searchParams.error === 'AccessDenied'
            ? 'Email này chưa được cấp quyền quản trị.'
            : 'Đăng nhập thất bại, thử lại.'}
        </p>
      )}
      <form
        action={async () => {
          'use server';
          await signIn('google', { redirectTo: '/admin' });
        }}
      >
        <button className="btn primary" type="submit" style={{ width: '100%', justifyContent: 'center', padding: '11px 16px' }}>
          Đăng nhập bằng Google
        </button>
      </form>
    </main>
  );
}
