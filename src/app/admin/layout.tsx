import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';
import { getAdmin } from '@/lib/admins';
import SiteHeader from '@/components/SiteHeader';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) redirect('/login');
  const me = await getAdmin(session.user.email).catch(() => null);
  // Chỉ admin allowlist (đang hoạt động) mới vào khu quản trị. Viewer đăng nhập Google (không phải admin)
  // có phiên nhưng bị chặn ở đây → về /login (họ chỉ xem được deck qua /d, không thấy khu quản trị).
  if (!me || !me.is_active) redirect('/login?error=AccessDenied');
  const isOwner = me.role === 'admin';

  return (
    <>
      <SiteHeader
        subtitle="Quản trị"
        actions={
          <>
            <Link className="btn" href="/admin">Decks</Link>
            <Link className="btn" href="/admin/groups">Nhóm người xem</Link>
            {isOwner && <Link className="btn" href="/admin/admins">Quản trị viên</Link>}
            <span className="muted">{session.user.email}{me ? ` · ${me.role}` : ''}</span>
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/login' });
              }}
            >
              <button className="btn" type="submit">Đăng xuất</button>
            </form>
          </>
        }
      />
      <main className="wrap">{children}</main>
    </>
  );
}
