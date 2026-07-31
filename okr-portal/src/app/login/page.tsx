import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';
import { FAVICON, BRAND } from '@/lib/brand';

export const metadata = { title: `Đăng nhập · ${BRAND.full}` };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const session = await auth();
  if (session?.user) redirect('/');
  const denied = searchParams.error === 'AccessDenied';

  return (
    <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 20 }}>
      <div className="card" style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={FAVICON} alt="" width={48} height={48} style={{ marginBottom: 8 }} />
        <h2 style={{ margin: '4px 0' }}>{BRAND.full}</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Hệ thống OKR · KPI · Kế hoạch hành động · Ngân sách
        </p>
        {denied && (
          <p className="badge red" style={{ display: 'block', padding: 10, margin: '12px 0' }}>
            Tài khoản chưa được cấp quyền. Liên hệ CEO/CFO để thêm bạn vào hệ thống.
          </p>
        )}
        <form
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: '/' });
          }}
        >
          <button className="btn" type="submit" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>
            Đăng nhập bằng Google
          </button>
        </form>
      </div>
    </div>
  );
}
