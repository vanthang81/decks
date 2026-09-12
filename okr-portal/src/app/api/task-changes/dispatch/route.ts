import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getUser } from '@/lib/users';
import { loadAccess, canManageSystem } from '@/lib/access';
import { dispatchTaskChangeDigests } from '@/lib/task-changes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Gửi tổng hợp "thay đổi công việc" — cron n8n gọi mỗi 30' (giờ VN 5–22) bằng header x-sync-key;
// mỗi user chỉ nhận vào ĐÚNG mốc giờ đã cấu hình. Admin gọi ?test=1 để "Gửi thử cho tôi" ngay.
async function handle(req: NextRequest) {
  const key = process.env.SYNC_KEY;
  const viaKey = !!key && req.headers.get('x-sync-key') === key;
  let adminEmail: string | null = null;
  if (!viaKey) {
    const s = await auth();
    const u = s?.user?.email ? await getUser(s.user.email) : null;
    if (!u || !canManageSystem(u, await loadAccess())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    adminEmail = u.email;
  }
  const test = req.nextUrl.searchParams.get('test');
  try {
    if (test && adminEmail) {
      const r = await dispatchTaskChangeDigests({ force: true, onlyEmail: adminEmail });
      return NextResponse.json({ ok: true, test: true, ...r });
    }
    const r = await dispatchTaskChangeDigests();
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) { return handle(req); }
export async function GET(req: NextRequest) { return handle(req); }
