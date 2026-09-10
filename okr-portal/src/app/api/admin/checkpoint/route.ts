import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUser } from '@/lib/users';
import { isExec } from '@/lib/rbac';
import { runCheckpoint, type InfraInput } from '@/lib/checkpoint';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// CHECKPOINT AUDIT định kỳ (CFO 10/09): tự phát hiện → tự sửa (điền đơn vị + sinh mã việc) →
// QC → chỉ email CFO khi CÒN vấn đề. Gác: header x-sync-key = SYNC_KEY (cron) HOẶC phiên exec.
//   GET  ?dry=1     → chỉ QC (không sửa, không gửi mail); ?notify=0 → chạy nhưng không gửi mail.
//   POST { infra }  → cron n8n truyền kết quả hạ tầng (smoke/container/HEAD) để gộp vào cảnh báo.
async function guard(req: NextRequest): Promise<NextResponse | null> {
  const key = process.env.SYNC_KEY;
  if (!!key && req.headers.get('x-sync-key') === key) return null;
  const s = await auth();
  const u = s?.user?.email ? await getUser(s.user.email) : null;
  if (!u || !isExec(u.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return null;
}

function opts(req: NextRequest, infra?: InfraInput) {
  const sp = req.nextUrl.searchParams;
  return {
    dryRun: sp.get('dry') === '1' || sp.get('dry') === 'true',
    notify: sp.get('notify') !== '0',
    infra,
  };
}

export async function GET(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;
  try {
    const r = await runCheckpoint(opts(req));
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;
  let infra: InfraInput | undefined;
  try {
    const body = await req.json().catch(() => null);
    if (body && typeof body === 'object' && body.infra) infra = body.infra as InfraInput;
  } catch {
    /* body rỗng/không phải JSON → bỏ qua, chạy audit dữ liệu bình thường */
  }
  try {
    const r = await runCheckpoint(opts(req, infra));
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
