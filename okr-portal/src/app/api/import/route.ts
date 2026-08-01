import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/current-user';
import { loadAccess, canImportData } from '@/lib/access';
import { importOkrWorkbook } from '@/lib/excel';

export const dynamic = 'force-dynamic';

// Nhập OKR từ Excel (.xlsx) — cần năng lực "Nhập Excel". Cập nhật theo Mã, tạo mới công việc (Mã trống).
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!canImportData(user, await loadAccess())) {
    return NextResponse.json({ error: 'Bạn không có quyền nhập dữ liệu.' }, { status: 403 });
  }
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Thiếu file .xlsx.' }, { status: 400 });
  }
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const result = await importOkrWorkbook(buf);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
