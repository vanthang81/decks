'use server';

import { requireUser } from '@/lib/current-user';
import { loadAccess, canManageBudget } from '@/lib/access';
import { importBudgetCsv, syncBudgetActualsFromBigQuery, type ImportResult } from '@/lib/budget';
import { revalidatePath } from 'next/cache';

// Người có năng lực "Quản lý Ngân sách" (mặc định CEO/CFO + Quản trị OKR) mới nhập/đồng bộ ngân sách.
async function requireBudget() {
  const user = await requireUser();
  if (!canManageBudget(user, await loadAccess())) throw new Error('Bạn không có quyền quản lý ngân sách.');
  return user;
}

/** Import ngân sách từ nội dung CSV (client đọc file → gửi text). */
export async function importBudgetAction(csvText: string): Promise<ImportResult> {
  const user = await requireBudget();
  const res = await importBudgetCsv(csvText, user.email);
  revalidatePath('/budget');
  return res;
}

/** Đồng bộ thực chi từ BigQuery (hiện trả thông báo chờ BI chốt nguồn). */
export async function syncBudgetBqAction(periodId: string): Promise<{ ok: boolean; message: string; updated: number }> {
  await requireBudget();
  const res = await syncBudgetActualsFromBigQuery(periodId);
  if (res.updated > 0) revalidatePath('/budget');
  return res;
}
