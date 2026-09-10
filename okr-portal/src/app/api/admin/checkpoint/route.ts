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

// Đọc kết quả hạ tầng từ QUERY (cho cron n8n — tránh phải dựng JSON trong bash SSH):
//   ?smoke=okr.consultx.vn:200,okr.vanthang.io:200  ?containers=okr-portal:true,okr-portal-vt:false
//   ?hl=<HEAD local>  ?hr=<HEAD remote>
function infraFromQuery(req: NextRequest): InfraInput | undefined {
  const sp = req.nextUrl.searchParams;
  const smokeRaw = sp.get('smoke');
  const contRaw = sp.get('containers');
  const hl = sp.get('hl') || undefined;
  const hr = sp.get('hr') || undefined;
  if (!smokeRaw && !contRaw && !hl && !hr) return undefined;
  const infra: InfraInput = {};
  if (smokeRaw) {
    const smoke: Record<string, number> = {};
    for (const part of smokeRaw.split(',')) {
      const i = part.lastIndexOf(':');
      if (i > 0) smoke[part.slice(0, i)] = Number(part.slice(i + 1)) || 0;
    }
    infra.smoke = smoke;
  }
  if (contRaw) {
    infra.containers = contRaw.split(',').filter(Boolean).map((part) => {
      const i = part.lastIndexOf(':');
      const name = i > 0 ? part.slice(0, i) : part;
      const v = i > 0 ? part.slice(i + 1).toLowerCase() : '';
      return { name, up: v === 'true' || v === '1' || v === 'running' };
    });
  }
  if (hl) infra.headLocal = hl;
  if (hr) infra.headRemote = hr;
  return infra;
}

function opts(req: NextRequest, infra?: InfraInput) {
  const sp = req.nextUrl.searchParams;
  return {
    dryRun: sp.get('dry') === '1' || sp.get('dry') === 'true',
    notify: sp.get('notify') !== '0',
    infra: infra ?? infraFromQuery(req),
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
