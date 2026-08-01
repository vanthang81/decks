import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getUser } from '@/lib/users';
import { loadAccess, canSyncKpi } from '@/lib/access';
import { syncAllKpi } from '@/lib/kpi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Đồng bộ KPI (plan+actual từ BigQuery). Cho phép:
//  - Cron/n8n: header x-sync-key = SYNC_KEY
//  - Admin (exec) đăng nhập: gọi từ UI
async function handle(req: NextRequest) {
  const key = process.env.SYNC_KEY;
  const viaKey = !!key && req.headers.get('x-sync-key') === key;
  if (!viaKey) {
    const s = await auth();
    const u = s?.user?.email ? await getUser(s.user.email) : null;
    if (!u || !canSyncKpi(u, await loadAccess())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  try {
    const r = await syncAllKpi();
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  return handle(req);
}
export async function GET(req: NextRequest) {
  return handle(req);
}
