import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUser } from '@/lib/users';
import { unreadCount } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await auth();
  const email = s?.user?.email;
  if (!email) return NextResponse.json({ count: 0 });
  const u = await getUser(email);
  if (!u || !u.is_active) return NextResponse.json({ count: 0 });
  return NextResponse.json({ count: await unreadCount(u.email) });
}
