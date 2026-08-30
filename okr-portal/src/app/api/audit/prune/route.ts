import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getUser } from '@/lib/users';
import { loadAccess, canManageSystem } from '@/lib/access';
import { pruneAuditByRetention, deleteAuditBefore, logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// TỰ ĐỘNG DỌN nhật ký hoạt động theo retention đã cấu hình (okr_settings 'audit_retention_days').
// Cron n8n gọi hàng ngày. Gác bằng x-sync-key (cron) HOẶC session quản trị hệ thống.
// ?days=<N> để ép mốc dọn (bỏ qua cấu hình) — dùng khi cần dọn tay qua API.
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
    const daysParam = req.nextUrl.searchParams.get('days');
    if (daysParam !== null) {
      const days = Math.max(0, Math.floor(Number(daysParam) || 0));
      const deleted = await deleteAuditBefore(days);
      await logAudit({ actor: 'he-thong@okr', action: 'audit.autoprune', entity: 'system', detail: { days, deleted } }).catch(() => {});
      return NextResponse.json({ ok: true, mode: 'param', retentionDays: days, deleted });
    }
    const r = await pruneAuditByRetention();
    if (r.deleted > 0) {
      await logAudit({ actor: 'he-thong@okr', action: 'audit.autoprune', entity: 'system', detail: r }).catch(() => {});
    }
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
