import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getUser } from '@/lib/users';
import { loadAccess, canManageSystem } from '@/lib/access';
import { sendWeeklyDigest } from '@/lib/digest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Bản tin điều hành tuần — cron n8n gọi hằng tuần bằng header x-sync-key; admin gọi được để gửi thử.
async function handle(req: NextRequest) {
  const key = process.env.SYNC_KEY;
  const viaKey = !!key && req.headers.get('x-sync-key') === key;
  if (!viaKey) {
    const s = await auth();
    const u = s?.user?.email ? await getUser(s.user.email) : null;
    if (!u || !canManageSystem(u, await loadAccess())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  try {
    const r = await sendWeeklyDigest();
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
