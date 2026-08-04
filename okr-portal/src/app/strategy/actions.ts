'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/current-user';
import { loadAccess, canManageSystem } from '@/lib/access';
import { setCompanyStrategy, reorderPillars } from '@/lib/strategy';

// Chỉ CEO/CFO (quản trị hệ thống) mới khai báo/sửa chiến lược công ty.
async function requireExec() {
  const user = await requireUser();
  if (!canManageSystem(user, await loadAccess())) throw new Error('Bạn không có quyền khai báo chiến lược.');
  return user;
}

export async function saveStrategyAction(fd: FormData) {
  await requireExec();
  const s = (k: string) => String(fd.get(k) ?? '').trim();
  const values = s('values')
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean);
  await setCompanyStrategy({
    vision: s('vision'),
    mission: s('mission'),
    ambition: s('ambition'),
    horizon: s('horizon'),
    values,
  });
  revalidatePath('/strategy');
  revalidatePath('/');
}

// Sắp xếp lại thứ tự trụ cột chiến lược (kéo–thả / nút lên–xuống). Chỉ CEO/CFO.
export async function reorderPillarsAction(orderedIds: string[]) {
  await requireExec();
  await reorderPillars(orderedIds);
  revalidatePath('/strategy');
}
