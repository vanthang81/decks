import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/current-user';
import { listUnits, objectiveViewScope } from '@/lib/org';
import { buildOkrWorkbook, buildOkrTemplateWorkbook } from '@/lib/excel';

export const dynamic = 'force-dynamic';

// Xuất OKR ra Excel (.xlsx) — mọi người đăng nhập đều xuất được (OKR minh bạch).
// ?template=1 → tải FORM MẪU rỗng (kèm sheet Hướng dẫn + ví dụ) để điền rồi import.
export async function GET(req: NextRequest) {
  const user = await requireUser();
  const stamp = new Date().toISOString().slice(0, 10);

  if (req.nextUrl.searchParams.get('template')) {
    const buf = buildOkrTemplateWorkbook();
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="OKR-BTMH-form-mau.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  // Chấp nhận NHIỀU kỳ + NHIỀU đơn vị: ?period=..&period=.. HOẶC ?periods=csv (tương tự unit/units).
  const sp = req.nextUrl.searchParams;
  const periodIds = [...sp.getAll('period'), ...(sp.get('periods')?.split(',') ?? [])].map((s) => s.trim()).filter(Boolean);
  const unitIds = [...sp.getAll('unit'), ...(sp.get('units')?.split(',') ?? [])].map((s) => s.trim()).filter(Boolean);
  // Áp ĐÚNG phạm vi xem như giao diện: nhân viên chỉ xuất OKR trong đơn vị mình (+ cấp Công ty +
  // OKR mình chủ trì); điều hành/quản lý xuất tất cả. Tránh rò rỉ OKR khối khác qua file Excel.
  const units = await listUnits();
  const viewScope = objectiveViewScope(user, units);
  const scope = viewScope === null ? null : { unitIds: [...viewScope], email: user.email };
  const buf = await buildOkrWorkbook(periodIds, unitIds, scope);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="OKR-BTMH-${stamp}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
