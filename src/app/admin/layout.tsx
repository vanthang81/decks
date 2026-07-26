import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="wrap">
      <div className="topbar">
        <div>
          <div className="brand">Quản trị deck</div>
          <h2 style={{ margin: 0 }}>deck.consultx.vn</h2>
        </div>
        <div className="row">
          <Link className="btn" href="/admin">Decks</Link>
          <span className="muted">{session.user.email}</span>
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
