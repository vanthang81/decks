'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/current-user';
import { listUnits, manageScope } from '@/lib/org';
import { loadAccess, canInputKpi, hasCap } from '@/lib/access';
import { upsertKpiValue } from '@/lib/kpi-values';

const str = (fd: FormData, k: string) => (fd.get(k) as string | null)?.trim() ?? '';
const numOrNull = (fd: FormData, k: string): number | null => {
  const v = str(fd, k).replace(/[^0-9.\-]/g, '');
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Kiểm quyền nhập số KPI cho 1 đơn vị: cần năng lực kpi.input + trong phạm vi đơn vị (hoặc scope.all/exec). */
async function assertCanInput(unitId: string) {
  const user = await requireUser();
  const access = await loadAccess();
  if (!canInputKpi(user, access)) throw new Error('Bạn không có quyền nhập số KPI.');
  const units = await listUnits();
  const scope = manageScope(user, units);
  const inScope = hasCap(user, 'scope.all', access) || scope === null || scope.has(unitId);
  if (!inScope) throw new Error('Đơn vị này ngoài phạm vi bạn được nhập.');
  return user;
}

export async function upsertKpiValueAction(fd: FormData) {
  const kpiId = str(fd, 'kpi_id');
  const periodId = str(fd, 'period_id');
  const unitId = str(fd, 'unit_id');
  if (!kpiId || !periodId || !unitId) throw new Error('Thiếu thông tin.');
  const user = await assertCanInput(unitId);
  await upsertKpiValue(
    kpiId,
    periodId,
    unitId,
    {
      target: numOrNull(fd, 'target'),
      actual: numOrNull(fd, 'actual'),
      note: str(fd, 'note') || null,
    },
    user.email,
  );
  revalidatePath('/kpi');
}
