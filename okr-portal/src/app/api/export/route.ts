import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/current-user';
import { buildOkrWorkbook } from '@/lib/excel';

export const dynamic = 'force-dynamic';

// Xuất OKR ra Excel (.xlsx) — mọi người đăng nhập đều xuất được (OKR minh bạch).
export async function GET(req: NextRequest) {
  await requireUser();
  const period = req.nextUrl.searchParams.get('period');
  const unit = req.nextUrl.searchParams.get('unit');
  const buf = await buildOkrWorkbook(period || null, unit || null);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="OKR-BTMH-${stamp}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
