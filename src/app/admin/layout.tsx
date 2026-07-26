import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';
import { getAdmin } from '@/lib/admins';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) redirect('/login');
  const me = await getAdmin(session.user.email).catch(() => null);
  const isOwner = me?.role === 'admin';

  return (
    <div className="wrap">
      <div className="topbar">
        <div>
          <div className="brand">Quản trị deck</div>
          <h2 style={{ margin: 0 }}>deck.consultx.vn</h2>
        </div>
        <div className="row">
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
        </div>
      </div>
      {children}
    </div>
  );
}
