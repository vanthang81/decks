// Phân quyền Sửa/Xoá/Tạo OKR — cấu hình được ở Quản trị (CFO 01/08).
// Mô hình: VAI TRÒ × PHẠM VI tổ chức + danh sách "Quản trị OKR" (toàn quyền).
//  - Quản trị OKR (exec luôn nằm trong nhóm này, + email được thêm ở config):
//    Sửa/Xoá/Tạo MỌI OKR, bỏ qua phạm vi.
//  - Vai trò trong danh sách cho phép: được Sửa/Xoá/Tạo NHƯNG chỉ trong phạm vi
//    tổ chức của mình (lead → nhánh đơn vị; chủ sở hữu/người tạo luôn được Sửa).
import { getSetting } from './settings';
import { manageScope, type Unit } from './org';
import type { Role } from './rbac';
import type { OkrUser } from './users';
import type { Objective, Level } from './okr';

export type OkrPerms = {
  editRoles: Role[];
  deleteRoles: Role[];
  createRoles: Role[];
  admins: string[]; // email (lowercase) — toàn quyền OKR
};

export const OKR_PERM_KEYS = {
  edit: 'okr_edit_roles',
  delete: 'okr_delete_roles',
  create: 'okr_create_roles',
  admins: 'okr_admins',
} as const;

// Mặc định (theo lựa chọn CFO 01/08): Sửa = quản lý cấp; Xoá = chỉ CEO/CFO (+admin);
// Tạo = quản lý cấp (nhân viên vẫn luôn tạo được OKR cá nhân của mình — xem canCreateWith).
export const DEFAULT_EDIT_ROLES: Role[] = ['exec', 'division_lead', 'dept_lead'];
export const DEFAULT_DELETE_ROLES: Role[] = ['exec'];
export const DEFAULT_CREATE_ROLES: Role[] = ['exec', 'division_lead', 'dept_lead'];

function cleanRoles(v: unknown, fallback: Role[]): Role[] {
  // null/undefined = CHƯA cấu hình → dùng mặc định.
  // Mảng rỗng = ĐÃ cấu hình cố ý (chỉ CEO/CFO + Quản trị OKR) → tôn trọng, KHÔNG khôi phục mặc định.
  if (v == null) return fallback;
  if (!Array.isArray(v)) return fallback;
  const ok: Role[] = ['exec', 'division_lead', 'dept_lead', 'staff'];
  const out = v.filter((x): x is Role => typeof x === 'string' && (ok as string[]).includes(x));
  return Array.from(new Set(out));
}

export async function loadOkrPerms(): Promise<OkrPerms> {
  const [edit, del, create, admins] = await Promise.all([
    getSetting<unknown>(OKR_PERM_KEYS.edit, null),
    getSetting<unknown>(OKR_PERM_KEYS.delete, null),
    getSetting<unknown>(OKR_PERM_KEYS.create, null),
    getSetting<unknown>(OKR_PERM_KEYS.admins, null),
  ]);
  return {
    editRoles: cleanRoles(edit, DEFAULT_EDIT_ROLES),
    deleteRoles: cleanRoles(del, DEFAULT_DELETE_ROLES),
    createRoles: cleanRoles(create, DEFAULT_CREATE_ROLES),
    admins: Array.isArray(admins)
      ? admins.map((e) => String(e).toLowerCase()).filter(Boolean)
      : [],
  };
}

/** Quản trị OKR = exec (CEO/CFO) HOẶC email nằm trong danh sách admin config. */
export function isOkrAdmin(user: OkrUser, perms: OkrPerms): boolean {
  return user.role === 'exec' || perms.admins.includes(user.email.toLowerCase());
}

type ObjScope = Pick<Objective, 'unit_id' | 'owner_email' | 'created_by'>;

function inScope(user: OkrUser, obj: ObjScope, units: Unit[]): boolean {
  const scope = manageScope(user, units);
  if (scope === null) return true; // exec
  return !!(obj.unit_id && scope.has(obj.unit_id));
}

/** Được SỬA OKR này không (config-aware). */
export function canEditObjectiveP(
  user: OkrUser,
  obj: ObjScope,
  units: Unit[],
  perms: OkrPerms,
): boolean {
  if (isOkrAdmin(user, perms)) return true;
  const email = user.email.toLowerCase();
  // Chủ sở hữu / người tạo luôn được sửa OKR của mình.
  if (obj.owner_email && obj.owner_email.toLowerCase() === email) return true;
  if (obj.created_by && obj.created_by.toLowerCase() === email) return true;
  if (!perms.editRoles.includes(user.role)) return false;
  return inScope(user, obj, units);
}

/** Được XOÁ OKR này không (config-aware). */
export function canDeleteObjectiveP(
  user: OkrUser,
  obj: ObjScope,
  units: Unit[],
  perms: OkrPerms,
): boolean {
  if (isOkrAdmin(user, perms)) return true;
  if (!perms.deleteRoles.includes(user.role)) return false;
  return inScope(user, obj, units);
}

/** Được TẠO OKR ở level/unit này không (config-aware; cá nhân luôn tạo được của mình). */
export function canCreateWith(
  user: OkrUser,
  level: Level,
  unitId: string | null,
  units: Unit[],
  perms: OkrPerms,
): boolean {
  if (isOkrAdmin(user, perms)) return true;
  if (level === 'individual') return true; // OKR cá nhân: ai cũng tạo cho mình
  if (!perms.createRoles.includes(user.role)) return false;
  const scope = manageScope(user, units);
  if (scope === null) return true;
  return Boolean(unitId && scope.has(unitId));
}
