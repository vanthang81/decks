import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getUser, type OkrUser } from './users';

/** Lấy OkrUser hiện tại (đã đăng nhập + còn active). Nếu không → về /login. */
export async function requireUser(): Promise<OkrUser> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect('/login');
  const u = await getUser(email);
  if (!u || !u.is_active) redirect('/login?error=AccessDenied');
  return u;
}
