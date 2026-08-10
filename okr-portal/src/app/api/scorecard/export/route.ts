import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/current-user';
import { buildScorecardWorkbook } from '@/lib/excel';

export const dynamic = 'force-dynamic';

// Xuất Scorecard KPI ra Excel (.xlsx). Lọc theo ?period & ?unit (mặc định toàn bộ giá trị đã nhập).
export async function GET(req: NextRequest) {
  await requireUser();
  const period = req.nextUrl.searchParams.get('period');
  const unit = req.nextUrl.searchParams.get('unit');
  const bsc = req.nextUrl.searchParams.get('bsc');
  const buf = await buildScorecardWorkbook(period || null, unit || null, bsc || null);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Scorecard-BTMH-${stamp}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
