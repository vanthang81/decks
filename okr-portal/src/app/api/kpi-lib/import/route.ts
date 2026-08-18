import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/current-user';
import { loadAccess, canManageKpi } from '@/lib/access';
import { importKpiWorkbook } from '@/lib/excel';

export const dynamic = 'force-dynamic';

// Nhập Thư viện KPI hàng loạt từ Excel (.xlsx) — cần quyền quản lý KPI.
// Khớp theo Mã: có Mã tồn tại → cập nhật; Mã trống/không thấy → tạo mới.
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!canManageKpi(user, await loadAccess())) {
    return NextResponse.json({ error: 'Bạn không có quyền quản lý KPI.' }, { status: 403 });
  }
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Thiếu file .xlsx.' }, { status: 400 });
  }
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const result = await importKpiWorkbook(buf, user.email);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
