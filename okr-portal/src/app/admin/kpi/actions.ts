'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/current-user';
import { loadAccess, canManageKpi } from '@/lib/access';
import {
  createKpi,
  updateKpi,
  deleteKpi,
  setKpiActive,
  type KpiInput,
  type KpiTier,
  type KpiSource,
  type KpiDirection,
  type KpiAgg,
} from '@/lib/kpis';
import type { BscPerspective } from '@/lib/okr';

const str = (fd: FormData, k: string) => (fd.get(k) as string | null)?.trim() ?? '';
const orNull = (v: string) => (v === '' ? null : v);
const numOrNull = (fd: FormData, k: string): number | null => {
  const v = str(fd, k).replace(/[^0-9.\-]/g, '');
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const intVal = (fd: FormData, k: string): number => {
  const n = Number(str(fd, k).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? Math.round(n) : 0;
};

const ONE_OF = <T extends string>(v: string, allowed: readonly T[], dflt: T): T =>
  (allowed as readonly string[]).includes(v) ? (v as T) : dflt;

async function guard() {
  const user = await requireUser();
  if (!canManageKpi(user, await loadAccess())) throw new Error('Bạn không có quyền quản lý Thư viện KPI.');
  return user;
}

function readInput(fd: FormData): KpiInput {
  const bsc = orNull(str(fd, 'bsc_perspective'));
  return {
    name: str(fd, 'name'),
    description: orNull(str(fd, 'description')),
    unit_label: orNull(str(fd, 'unit_label')),
    bsc_perspective:
      bsc && ['financial', 'customer', 'process', 'learning'].includes(bsc)
        ? (bsc as BscPerspective)
        : null,
    module: orNull(str(fd, 'module')),
    tier: orNull(str(fd, 'tier')) as KpiTier | null,
    weight: intVal(fd, 'weight'),
    direction: ONE_OF<KpiDirection>(str(fd, 'direction'), ['up', 'down'], 'up'),
    agg: ONE_OF<KpiAgg>(str(fd, 'agg'), ['sum', 'avg', 'last'], 'last'),
    source: ONE_OF<KpiSource>(str(fd, 'source'), ['manual', 'bigquery', 'postgres'], 'manual'),
    source_ref: orNull(str(fd, 'source_ref')),
    unit_id: orNull(str(fd, 'unit_id')),
    business_owner: orNull(str(fd, 'business_owner')),
    measurement_owner: orNull(str(fd, 'measurement_owner')),
    cadence: orNull(str(fd, 'cadence')),
    threshold_watch: numOrNull(fd, 'threshold_watch'),
    threshold_alert: numOrNull(fd, 'threshold_alert'),
    threshold_escalate: numOrNull(fd, 'threshold_escalate'),
  };
}

export async function createKpiAction(fd: FormData) {
  const user = await guard();
  const input = readInput(fd);
  if (!input.name) throw new Error('Thiếu tên KPI.');
  await createKpi(input, user.email);
  revalidatePath('/admin/kpi');
}

export async function updateKpiAction(fd: FormData) {
  await guard();
  const id = str(fd, 'id');
  const input = readInput(fd);
  if (!input.name) throw new Error('Thiếu tên KPI.');
  await updateKpi(id, input);
  revalidatePath('/admin/kpi');
}

export async function toggleKpiActiveAction(fd: FormData) {
  await guard();
  await setKpiActive(str(fd, 'id'), str(fd, 'active') === '1');
  revalidatePath('/admin/kpi');
}

export async function deleteKpiAction(fd: FormData) {
  await guard();
  await deleteKpi(str(fd, 'id'));
  revalidatePath('/admin/kpi');
}
