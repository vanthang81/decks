import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getUser } from '@/lib/users';
import { canAdmin } from '@/lib/rbac';
import { runCheckinReminders } from '@/lib/reminders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Nhắc check-in. Cron n8n gọi hàng ngày (app tự gác theo weekday cấu hình);
// ?force=1 để gửi ngay bỏ qua điều kiện ngày (dùng cho nút "Gửi thử").
async function handle(req: NextRequest) {
  const key = process.env.SYNC_KEY;
  const viaKey = !!key && req.headers.get('x-sync-key') === key;
  if (!viaKey) {
    const s = await auth();
    const u = s?.user?.email ? await getUser(s.user.email) : null;
    if (!u || !canAdmin(u.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  const force = req.nextUrl.searchParams.get('force') === '1';
  try {
    const r = await runCheckinReminders({ force });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return handle(req);
}
export async function GET(req: NextRequest) {
  return handle(req);
}
