import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/current-user';
import { buildOkrWorkbook, buildOkrTemplateWorkbook } from '@/lib/excel';

export const dynamic = 'force-dynamic';

// Xuất OKR ra Excel (.xlsx) — mọi người đăng nhập đều xuất được (OKR minh bạch).
// ?template=1 → tải FORM MẪU rỗng (kèm sheet Hướng dẫn + ví dụ) để điền rồi import.
export async function GET(req: NextRequest) {
  await requireUser();
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

  const period = req.nextUrl.searchParams.get('period');
  const unit = req.nextUrl.searchParams.get('unit');
  const buf = await buildOkrWorkbook(period || null, unit || null);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="OKR-BTMH-${stamp}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
