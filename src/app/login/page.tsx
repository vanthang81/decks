import { signIn } from '@/auth';

export const dynamic = 'force-dynamic';

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="wrap" style={{ maxWidth: 420 }}>
      <div className="brand">Quản trị deck</div>
      <h1 style={{ fontSize: 30 }}>Đăng nhập</h1>
      <p className="sub">Chỉ tài khoản Google trong danh sách được phép mới vào được.</p>
      {searchParams.error && (
        <p style={{ color: '#b04a32', fontSize: 14 }}>
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
        <button className="btn primary" type="submit">Đăng nhập bằng Google</button>
      </form>
    </main>
  );
}
