import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/current-user';
import { getCurrentPeriod, getPeriod, listPeriods, PERIOD_KIND_LABEL } from '@/lib/periods';
import { okrLevelReport } from '@/lib/okr-report';
import { buildOkrReportWorkbook } from '@/lib/excel';

export const dynamic = 'force-dynamic';

// Xuất "Báo cáo đánh giá OKR theo cấp" của 1 kỳ ra Excel. Gác giống trang /report (nhân viên không xem).
export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (user.role === 'staff') {
    return NextResponse.json({ error: 'Bạn không có quyền xem báo cáo tổng hợp.' }, { status: 403 });
  }
  const periods = await listPeriods();
  const pid = req.nextUrl.searchParams.get('period');
  const period = pid ? await getPeriod(pid) : (await getCurrentPeriod()) ?? periods[0] ?? null;
  if (!period) {
    return NextResponse.json({ error: 'Chưa có kỳ OKR.' }, { status: 400 });
  }
  const rep = await okrLevelReport(period.id);
  const label = `${PERIOD_KIND_LABEL[period.kind]}: ${period.name}`;
  const buf = buildOkrReportWorkbook(label, rep);
  const safe = period.name.replace(/[^\p{L}\p{N}]+/gu, '-');
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="BaoCao-OKR-${safe}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
