'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/current-user';
import { loadAccess, canManageSystem } from '@/lib/access';
import {
  setAuditRetentionDays, deleteAuditBefore, clearAllAudit, logAudit,
} from '@/lib/audit';
import type { OkrUser } from '@/lib/users';

async function guard(): Promise<OkrUser> {
  const me = await requireUser();
  if (!canManageSystem(me, await loadAccess())) redirect('/');
  return me;
}

/** Lưu cấu hình tự động xoá (retention) — số ngày giữ nhật ký. */
export async function saveAuditRetentionAction(fd: FormData) {
  const me = await guard();
  const days = Number(fd.get('days') ?? 180);
  await setAuditRetentionDays(days);
  await logAudit({ actor: me.email, action: 'audit.retention', entity: 'system', detail: { days } });
  revalidatePath('/admin/activity');
}

/** Xoá thủ công nhật ký CŨ HƠN N ngày (dòng thao tác này được ghi lại sau khi xoá). */
export async function pruneAuditNowAction(fd: FormData) {
  const me = await guard();
  const days = Number(fd.get('days') ?? 90);
  const deleted = await deleteAuditBefore(days);
  await logAudit({ actor: me.email, action: 'audit.prune', entity: 'system', detail: { days, deleted } });
  redirect(`/admin/activity?pruned=${deleted}`);
}

/** Xoá SẠCH toàn bộ nhật ký (yêu cầu gõ đúng "XOA" để xác nhận). */
export async function clearAllAuditAction(fd: FormData) {
  const me = await guard();
  if (String(fd.get('confirm') ?? '').trim().toUpperCase() !== 'XOA') {
    redirect('/admin/activity?err=confirm');
  }
  const deleted = await clearAllAudit();
  await logAudit({ actor: me.email, action: 'audit.clear', entity: 'system', detail: { deleted } });
  redirect(`/admin/activity?cleared=${deleted}`);
}
