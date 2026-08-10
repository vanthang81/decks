'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/current-user';
import { listUnits, manageScope } from '@/lib/org';
import { loadAccess, canInputKpi, canManageKpi, hasCap } from '@/lib/access';
import { upsertKpiValue } from '@/lib/kpi-values';
import { createKpi, type KpiInput, type KpiTier, type KpiDirection } from '@/lib/kpis';
import type { BscPerspective } from '@/lib/okr';

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

// Tạo chỉ tiêu KPI mới NGAY trên Scorecard (popup) — gác canManageKpi (quản lý Thư viện KPI).
// KPI = định nghĩa dùng chung (không buộc gắn đơn vị); nguồn mặc định 'manual' (nhập tay).
export async function createKpiAction(fd: FormData) {
  const user = await requireUser();
  if (!canManageKpi(user, await loadAccess())) throw new Error('Bạn không có quyền tạo KPI (cần quyền quản lý Thư viện KPI).');
  const name = str(fd, 'name');
  if (!name) throw new Error('Thiếu tên KPI.');
  const bsc = str(fd, 'bsc_perspective');
  const tier = str(fd, 'tier');
  const dir = str(fd, 'direction');
  const w = Number(str(fd, 'weight').replace(/[^0-9.\-]/g, ''));
  const input: KpiInput = {
    name,
    description: str(fd, 'description') || null,
    unit_label: str(fd, 'unit_label') || null,
    bsc_perspective: (['financial', 'customer', 'process', 'learning'].includes(bsc) ? bsc : null) as BscPerspective | null,
    module: str(fd, 'module') || null,
    tier: (['result', 'driver', 'enabler'].includes(tier) ? tier : null) as KpiTier | null,
    weight: Number.isFinite(w) ? Math.max(0, Math.round(w)) : 0,
    direction: (dir === 'down' ? 'down' : 'up') as KpiDirection,
    agg: 'last',
    source: 'manual',
    source_ref: null,
    unit_id: null,
    business_owner: null,
    measurement_owner: null,
    cadence: null,
    threshold_watch: numOrNull(fd, 'threshold_watch'),
    threshold_alert: numOrNull(fd, 'threshold_alert'),
    threshold_escalate: numOrNull(fd, 'threshold_escalate'),
  };
  await createKpi(input, user.email);
  revalidatePath('/kpi');
  revalidatePath('/admin/kpi');
}
