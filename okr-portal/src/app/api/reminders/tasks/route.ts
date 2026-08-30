import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getUser } from '@/lib/users';
import { loadAccess, canManageSystem } from '@/lib/access';
import { remindTasksDueSoon, remindTasksOverdue, weeklyOverdueDigest } from '@/lib/task-reminders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Nhắc CÔNG VIỆC qua email + chuông. Cron n8n gọi:
//  - ?kind=due_soon  (hàng ngày) → việc đến hạn ngày mai
//  - ?kind=overdue   (hàng ngày) → việc quá hạn (một lần/lần quá hạn)
//  - ?kind=weekly    (hàng tuần) → tổng hợp việc quá hạn của mỗi người
// Không có kind → chạy cả due_soon + overdue. Gác bằng x-sync-key (cron) HOẶC session quản trị.
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
  const kind = req.nextUrl.searchParams.get('kind') || 'daily';
  try {
    const out: Record<string, number> = {};
    if (kind === 'due_soon' || kind === 'daily') out.due_soon = await remindTasksDueSoon();
    if (kind === 'overdue' || kind === 'daily') out.overdue = await remindTasksOverdue();
    if (kind === 'weekly') out.weekly = await weeklyOverdueDigest();
    return NextResponse.json({ ok: true, kind, ...out });
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
