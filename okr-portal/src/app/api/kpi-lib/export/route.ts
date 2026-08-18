import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/current-user';
import { loadAccess, canManageKpi } from '@/lib/access';
import { buildKpiWorkbook } from '@/lib/excel';

export const dynamic = 'force-dynamic';

// Xuất Thư viện KPI ra Excel. ?template=1 → file MẪU (trống + 1 dòng ví dụ) để nhập hàng loạt.
export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!canManageKpi(user, await loadAccess())) {
    return NextResponse.json({ error: 'Bạn không có quyền quản lý KPI.' }, { status: 403 });
  }
  const template = req.nextUrl.searchParams.get('template') === '1';
  const buf = await buildKpiWorkbook(template ? 'template' : 'data');
  const stamp = new Date().toISOString().slice(0, 10);
  const name = template ? `Mau-KPI-BTMH.xlsx` : `ThuVien-KPI-BTMH-${stamp}.xlsx`;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  });
}
