import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getUser } from '@/lib/users';
import { query } from '@/lib/db';
import { listNotifications, markRead, markAllRead } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function me() {
  const s = await auth();
  const email = s?.user?.email;
  if (!email) return null;
  const u = await getUser(email);
  return u && u.is_active ? u : null;
}

export async function GET() {
  const u = await me();
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const items = await listNotifications(u.email);
  return NextResponse.json({ items, notifyEmail: u.notify_email });
}

// Đánh dấu đã đọc (1 hoặc tất cả) / đổi tuỳ chọn nhận email.
export async function POST(req: NextRequest) {
  const u = await me();
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (b?.action === 'read' && b.id) {
    await markRead(u.email, String(b.id));
  } else if (b?.action === 'read_all') {
    await markAllRead(u.email);
  } else if (b?.action === 'set_email') {
    await query('UPDATE okr_users SET notify_email=$2 WHERE email=$1', [u.email, !!b.value]);
  } else {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
