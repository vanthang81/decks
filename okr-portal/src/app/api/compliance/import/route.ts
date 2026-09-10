import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/current-user';
import { loadAccess } from '@/lib/access';
import { listUnits } from '@/lib/org';
import { getProject, canManageProject } from '@/lib/projects';
import { importChecklistWorkbook, hasProjectFunction } from '@/lib/compliance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Import Bảng kiểm (.xlsx) vào 1 dự án — upsert theo mã tiêu chí, tự sinh Vấn đề + Task khắc phục.
// Quyền: quản dự án HOẶC vai trò chức năng Pháp chế / KH&QLDA của dự án.
export async function POST(req: NextRequest) {
  const user = await requireUser();
  const form = await req.formData();
  const projectId = String(form.get('project_id') ?? '');
  const file = form.get('file');
  if (!projectId) return NextResponse.json({ ok: false, error: 'Thiếu mã dự án.' }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: 'Thiếu file .xlsx.' }, { status: 400 });

  const p = await getProject(projectId);
  if (!p) return NextResponse.json({ ok: false, error: 'Không tìm thấy dự án.' }, { status: 404 });
  if (!p.compliance_enabled) return NextResponse.json({ ok: false, error: 'Dự án chưa bật Bảng kiểm tuân thủ.' }, { status: 400 });

  const [units, access] = await Promise.all([listUnits(), loadAccess()]);
  const allowed =
    canManageProject(user, p, units, access) ||
    (await hasProjectFunction(projectId, user.email, 'phap_che')) ||
    (await hasProjectFunction(projectId, user.email, 'qlda'));
  if (!allowed) return NextResponse.json({ ok: false, error: 'Bạn không có quyền import Bảng kiểm cho dự án này.' }, { status: 403 });

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const result = await importChecklistWorkbook(projectId, buf, user.email);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
