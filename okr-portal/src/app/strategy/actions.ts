'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/current-user';
import { loadAccess, canManageStrategy } from '@/lib/access';
import { setCompanyStrategy, reorderPillars } from '@/lib/strategy';

// Người có năng lực "Quản lý Chiến lược công ty" (mặc định CEO/CFO + Quản trị OKR) mới khai báo/sửa.
async function requireStrategy() {
  const user = await requireUser();
  if (!canManageStrategy(user, await loadAccess())) throw new Error('Bạn không có quyền khai báo chiến lược.');
  return user;
}

export async function saveStrategyAction(fd: FormData) {
  await requireStrategy();
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
  await requireStrategy();
  await reorderPillars(orderedIds);
  revalidatePath('/strategy');
}
