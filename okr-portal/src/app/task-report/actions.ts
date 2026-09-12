'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/current-user';
import { loadAccess, isSuperAdmin, userGroupKey } from '@/lib/access';
import { setLateGraceDays } from '@/lib/exec-report';

/** Chỉ Super Admin / Quản trị hệ thống / Quản trị OKR được sửa số ngày ân hạn deadline. */
async function canEditGrace(): Promise<boolean> {
  const me = await requireUser();
  if (isSuperAdmin(me)) return true;
  const g = userGroupKey(me);
  return g === 'system_admin' || g === 'okr_admin';
}

export async function saveLateGraceAction(fd: FormData) {
  if (!(await canEditGrace())) throw new Error('Bạn không có quyền sửa số ngày ân hạn.');
  const days = Number(fd.get('grace_days') ?? 0);
  await setLateGraceDays(Number.isFinite(days) ? days : 0);
  revalidatePath('/task-report');
}
