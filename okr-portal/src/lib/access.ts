// Tầng phân quyền theo NĂNG LỰC (capability) + NHÓM QUYỀN (permission group).
// Vai trò tổ chức (exec/division_lead/dept_lead/staff) giữ để tính PHẠM VI;
// Nhóm quyền quyết định NĂNG LỰC. CEO/CFO (exec) LUÔN toàn quyền.
import { getSetting } from './settings';
import { manageScope, type Unit } from './org';
import type { OkrUser } from './users';
import type { Objective, Level } from './okr';
import {
  CAPABILITIES,
  DEFAULT_GROUPS,
  GROUP_KEYS,
  defaultGroupForRole,
  type CapKey,
  type GroupKey,
} from './capabilities';

export const PERM_GROUPS_KEY = 'perm_groups';

const ALL_CAPS = new Set<CapKey>(CAPABILITIES.map((c) => c.key));
const VALID_CAP = (x: unknown): x is CapKey => typeof x === 'string' && ALL_CAPS.has(x as CapKey);

export type Access = { groups: Record<string, Set<CapKey>> };

// Cache ngắn để nhiều lần gọi trong 1 request (SiteHeader + page) không đọc DB lặp.
let _cache: { at: number; access: Access } | null = null;
const TTL = 15_000;

/** Nạp Nhóm quyền: mặc định trong code + ghi đè caps từ okr_settings (nếu có). */
export async function loadAccess(): Promise<Access> {
  if (_cache && Date.now() - _cache.at < TTL) return _cache.access;
  const stored = await getSetting<Record<string, unknown> | null>(PERM_GROUPS_KEY, null);
  const groups: Record<string, Set<CapKey>> = {};
  for (const g of DEFAULT_GROUPS) groups[g.key] = new Set(g.caps);
  if (stored && typeof stored === 'object') {
    for (const [k, caps] of Object.entries(stored)) {
      if (Array.isArray(caps)) groups[k] = new Set(caps.filter(VALID_CAP));
    }
  }
  const access = { groups };
  _cache = { at: Date.now(), access };
  return access;
}

export function invalidateAccess() {
  _cache = null;
}

/** Nhóm quyền hiệu lực của user (exec luôn = system_admin; chưa gán → suy từ vai trò). */
export function userGroupKey(user: Pick<OkrUser, 'role' | 'perm_group'>): GroupKey {
  if (user.role === 'exec') return 'system_admin';
  const g = user.perm_group;
  if (g && (GROUP_KEYS as readonly string[]).includes(g)) return g as GroupKey;
  return defaultGroupForRole(user.role);
}

export function userCaps(user: OkrUser, access: Access): Set<CapKey> {
  if (user.role === 'exec') return ALL_CAPS; // CEO/CFO không thể tự khoá
  return access.groups[userGroupKey(user)] ?? new Set<CapKey>();
}

export function hasCap(user: OkrUser, cap: CapKey, access: Access): boolean {
  return userCaps(user, access).has(cap);
}

// ---- Kiểm quyền hệ thống ----
export function canManageSystem(user: OkrUser, access: Access): boolean {
  return hasCap(user, 'system.admin', access);
}
export function canAssignPerms(user: OkrUser, access: Access): boolean {
  return hasCap(user, 'system.permissions', access);
}
export function canImportData(user: OkrUser, access: Access): boolean {
  return hasCap(user, 'data.import', access);
}
export function canSyncKpi(user: OkrUser, access: Access): boolean {
  return hasCap(user, 'kpi.sync', access);
}

// ---- Kiểm quyền theo OKR (năng lực × phạm vi) ----
type ObjScope = Pick<Objective, 'unit_id' | 'owner_email' | 'created_by'>;

function ownerOrCreator(user: OkrUser, obj: ObjScope): boolean {
  const e = user.email.toLowerCase();
  return (
    (!!obj.owner_email && obj.owner_email.toLowerCase() === e) ||
    (!!obj.created_by && obj.created_by.toLowerCase() === e)
  );
}
function inScope(user: OkrUser, unitId: string | null, units: Unit[], access: Access): boolean {
  if (hasCap(user, 'scope.all', access)) return true;
  const scope = manageScope(user, units);
  if (scope === null) return true; // exec
  return !!(unitId && scope.has(unitId));
}

export function canEditObjective(user: OkrUser, obj: ObjScope, units: Unit[], access: Access): boolean {
  if (ownerOrCreator(user, obj)) return true; // chủ trì/người tạo luôn sửa OKR của mình
  if (!hasCap(user, 'okr.edit', access)) return false;
  return inScope(user, obj.unit_id, units, access);
}
export function canDeleteObjective(user: OkrUser, obj: ObjScope, units: Unit[], access: Access): boolean {
  if (!hasCap(user, 'okr.delete', access)) return false;
  return inScope(user, obj.unit_id, units, access);
}
export function canCreateObjective(
  user: OkrUser,
  level: Level,
  unitId: string | null,
  units: Unit[],
  access: Access,
): boolean {
  if (level === 'individual') return true; // OKR cá nhân: ai cũng tạo cho mình
  if (!hasCap(user, 'okr.create', access)) return false;
  return inScope(user, unitId, units, access);
}
