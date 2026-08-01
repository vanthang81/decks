'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/current-user';
import { listUnits } from '@/lib/org';
import {
  getObjective,
  getKeyResult,
  setObjectiveBsc,
  setObjectiveParent,
  linkKrKpi,
  syncKrFromKpi,
  type BscPerspective,
} from '@/lib/okr';
import { loadAccess, canEditObjective } from '@/lib/access';

// Guard: chỉ người được quyền SỬA OKR mới đổi liên kết của nó trên Bản đồ.
async function assertManage(objectiveId: string) {
  const user = await requireUser();
  const [units, obj, access] = await Promise.all([listUnits(), getObjective(objectiveId), loadAccess()]);
  if (!obj) throw new Error('Không tìm thấy OKR.');
  if (!canEditObjective(user, obj, units, access)) throw new Error('Bạn không có quyền sửa OKR này.');
  return obj;
}

const BSC_KEYS = ['financial', 'customer', 'process', 'learning'];

/** Gắn OKR vào 1 viễn cảnh BSC (kéo–thả sang làn khác). */
export async function mapSetBscAction(objectiveId: string, bsc: string) {
  await assertManage(objectiveId);
  const valid = BSC_KEYS.includes(bsc) ? (bsc as BscPerspective) : null;
  await setObjectiveBsc(objectiveId, valid);
  revalidatePath('/map');
  revalidatePath('/');
}

/** Đặt/gỡ OKR cha (cascade). Chặn vòng lặp ở tầng dữ liệu. */
export async function mapSetParentAction(objectiveId: string, parentId: string) {
  await assertManage(objectiveId);
  const ok = await setObjectiveParent(objectiveId, parentId || null);
  if (!ok) throw new Error('Không thể chọn OKR này làm cấp trên (sẽ tạo vòng lặp).');
  revalidatePath('/map');
  revalidatePath('/objectives');
}

/** Gắn/gỡ KPI thư viện cho 1 KR (rồi kéo số về theo kỳ). */
export async function mapLinkKpiAction(krId: string, kpiId: string) {
  const kr = await getKeyResult(krId);
  if (!kr) throw new Error('Không tìm thấy Key Result.');
  await assertManage(kr.objective_id);
  await linkKrKpi(krId, kpiId || null);
  if (kpiId) await syncKrFromKpi(krId);
  revalidatePath('/map');
  revalidatePath(`/objectives/${kr.objective_id}`);
}
