'use server';

import { requireUser } from '@/lib/current-user';
import { isExec } from '@/lib/rbac';
import { importBudgetCsv, syncBudgetActualsFromBigQuery, type ImportResult } from '@/lib/budget';
import { revalidatePath } from 'next/cache';

async function requireExec() {
  const user = await requireUser();
  if (!isExec(user.role)) throw new Error('Chỉ CEO/CFO được thao tác ngân sách.');
  return user;
}

/** Import ngân sách từ nội dung CSV (client đọc file → gửi text). */
export async function importBudgetAction(csvText: string): Promise<ImportResult> {
  const user = await requireExec();
  const res = await importBudgetCsv(csvText, user.email);
  revalidatePath('/budget');
  return res;
}

/** Đồng bộ thực chi từ BigQuery (hiện trả thông báo chờ BI chốt nguồn). */
export async function syncBudgetBqAction(periodId: string): Promise<{ ok: boolean; message: string; updated: number }> {
  await requireExec();
  const res = await syncBudgetActualsFromBigQuery(periodId);
  if (res.updated > 0) revalidatePath('/budget');
  return res;
}
