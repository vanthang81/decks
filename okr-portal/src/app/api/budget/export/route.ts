import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/current-user';
import { isExec } from '@/lib/rbac';
import { budgetCsv } from '@/lib/budget';
import { getPeriod, getCurrentPeriod } from '@/lib/periods';
import type { ProjectStatus } from '@/lib/projects';

export const dynamic = 'force-dynamic';

// Xuất TEMPLATE ngân sách ra CSV (chỉ CEO/CFO) — sửa trong Excel rồi import lại.
export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!isExec(user.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const pid = req.nextUrl.searchParams.get('period');
  const period = pid ? await getPeriod(pid) : await getCurrentPeriod();
  if (!period) return NextResponse.json({ error: 'no period' }, { status: 400 });
  const status = (req.nextUrl.searchParams.get('status') || 'all') as ProjectStatus | 'all';
  const csv = await budgetCsv(period.id, status);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="NganSach-BTMH-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
