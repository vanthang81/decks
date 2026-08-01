// Chính sách sửa/xoá bình luận & check-in (CFO 01/08):
//  - Quản lý (exec = "admin", hoặc lead quản OKR = "editor"): sửa + xoá bất kỳ lúc nào.
//  - Người dùng thường: CHỈ được sửa bình luận/check-in của CHÍNH MÌNH trong 3 giờ
//    kể từ lúc đăng; KHÔNG được xoá.
import { getObjective } from './okr';
import { listUnits } from './org';
import { loadAccess, canEditObjective } from './access';
import { objectiveIdOfEntity, type EntityType } from './comments';
import type { OkrUser } from './users';

/** Cửa sổ tự sửa cho người dùng thường: 3 giờ. */
export const EDIT_WINDOW_MS = 3 * 60 * 60 * 1000;

/** Còn trong hạn 3 giờ kể từ thời điểm đăng không? */
export function withinEditWindow(createdAtIso: string): boolean {
  const t = new Date(createdAtIso).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= EDIT_WINDOW_MS;
}

/** User có quyền quản lý (admin/editor) trên 1 OKR cụ thể không? */
export async function canManageObjectiveId(
  user: OkrUser,
  objectiveId: string | null,
): Promise<boolean> {
  if (!objectiveId) return false;
  const [obj, units, access] = await Promise.all([
    getObjective(objectiveId),
    listUnits(),
    loadAccess(),
  ]);
  if (!obj) return false;
  return canEditObjective(user, obj, units, access);
}

/** User có quyền quản lý bình luận/việc gắn với 1 thực thể không? */
export async function canModerateEntity(
  user: OkrUser,
  entityType: EntityType,
  entityId: string,
): Promise<boolean> {
  const objId = await objectiveIdOfEntity(entityType, entityId);
  return canManageObjectiveId(user, objId);
}
