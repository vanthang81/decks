// Tầng phân quyền theo NĂNG LỰC (capability) + NHÓM QUYỀN (permission group).
// Vai trò tổ chức (exec/division_lead/dept_lead/staff) giữ để tính PHẠM VI;
// Nhóm quyền quyết định NĂNG LỰC. CEO/CFO (exec) LUÔN toàn quyền.
import { getSetting } from './settings';
import { manageScope, objectiveViewScope, type Unit } from './org';
import type { OkrUser } from './users';
import type { Objective, Level } from './okr';
import {
  CAPABILITIES,
  DEFAULT_GROUPS,
  GROUP_KEYS,
  SUPER_ONLY_CAPS,
  SYSADMIN_DENY_CAPS,
  defaultGroupForRole,
  type CapKey,
  type GroupKey,
} from './capabilities';
import { isExec } from './rbac';

export const PERM_GROUPS_KEY = 'perm_groups';

// SUPER ADMIN — đỉnh quyền lực, chỉ 2 tài khoản của CFO (CFO 12/09). Hardcode để KHÔNG ai hạ quyền
// được (chống khoá nhầm/leo thang). Ngoài 2 email này, còn nhận nếu perm_group='super_admin'
// (chỉ Super Admin mới gán được nhóm này). Đổi/thêm tài khoản tối cao ⇒ sửa danh sách này.
export const SUPER_ADMIN_EMAILS = new Set<string>([
  'vanthang81@gmail.com',
  'nguyenvanthang@baotinmanhhai.vn',
]);
export function isSuperAdmin(user: Pick<OkrUser, 'email' | 'perm_group'>): boolean {
  if (user.email && SUPER_ADMIN_EMAILS.has(user.email.toLowerCase())) return true;
  return user.perm_group === 'super_admin';
}

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
  // ── BẤT BIẾN bảo mật (áp bất kể dữ liệu lưu / chỉnh tay ở UI) ──
  // 1) super_admin LUÔN có mọi năng lực.
  groups['super_admin'] = new Set<CapKey>(CAPABILITIES.map((c) => c.key));
  // 2) super.admin CHỈ super_admin có — bóc khỏi mọi nhóm khác.
  for (const k of Object.keys(groups)) {
    if (k === 'super_admin') continue;
    for (const c of SUPER_ONLY_CAPS) groups[k]?.delete(c as CapKey);
  }
  // 3) system_admin LUÔN có 'scope.all' = quyền QUẢN LÝ toàn phạm vi (OKR/KR/dự án/KPI mọi khối/phòng).
  //    Ép dương ở đây (bất kể dữ liệu lưu cũ / lần lưu tay trước) để KHÔNG tái diễn lỗi 12/09: siết riêng
  //    tư đã vô tình bỏ scope.all → quản trị hệ thống không sửa được OKR các khối/phòng.
  groups['system_admin']?.add('scope.all');
  // 4) system_admin KHÔNG bao giờ có các cap RIÊNG TƯ (xem toàn bộ công việc cá nhân / hồ sơ 360°).
  for (const c of SYSADMIN_DENY_CAPS) groups['system_admin']?.delete(c as CapKey);
  const access = { groups };
  _cache = { at: Date.now(), access };
  return access;
}

export function invalidateAccess() {
  _cache = null;
}

/** Nhóm quyền hiệu lực của user (Super Admin → super_admin; exec → system_admin; chưa gán → suy vai trò). */
export function userGroupKey(user: Pick<OkrUser, 'role' | 'perm_group' | 'email'>): GroupKey {
  if (isSuperAdmin(user)) return 'super_admin';
  if (isExec(user.role)) return 'system_admin';
  const g = user.perm_group;
  if (g && (GROUP_KEYS as readonly string[]).includes(g)) return g as GroupKey;
  return defaultGroupForRole(user.role);
}

export function userCaps(user: OkrUser, access: Access): Set<CapKey> {
  if (isSuperAdmin(user)) return ALL_CAPS; // Super Admin (2 tài khoản tối cao) toàn quyền, không thể tự khoá
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
export function canApproveUsers(user: OkrUser, access: Access): boolean {
  return hasCap(user, 'user.approve', access);
}
/** Xem ĐẦY ĐỦ hồ sơ 360° của người khác (chi tiết nhiệm vụ, check-in, lịch sử đăng nhập). */
export function canViewFullProfile(user: OkrUser, access: Access): boolean {
  return hasCap(user, 'user.view360', access);
}
export function canImportData(user: OkrUser, access: Access): boolean {
  return hasCap(user, 'data.import', access);
}
export function canSyncKpi(user: OkrUser, access: Access): boolean {
  return hasCap(user, 'kpi.sync', access);
}
export function canManageKpi(user: OkrUser, access: Access): boolean {
  return hasCap(user, 'kpi.manage', access);
}
export function canInputKpi(user: OkrUser, access: Access): boolean {
  return hasCap(user, 'kpi.input', access);
}
export function canManageStrategy(user: OkrUser, access: Access): boolean {
  return hasCap(user, 'strategy.manage', access);
}
/** Quyền quản trị MỌI cuộc họp (không cần là chủ trì/thư ký). Người tạo/host/thư ký vẫn quản họp của mình. */
export function canManageAnyMeeting(user: OkrUser, access: Access): boolean {
  return hasCap(user, 'meeting.manage', access);
}
export function canManageBudget(user: OkrUser, access: Access): boolean {
  return hasCap(user, 'budget.manage', access);
}
/** Xem/xuất trang "Báo cáo" (roll-up theo cấp). Nhân viên (role staff) không có nếu chưa được cấp. */
export function canViewReports(user: OkrUser, access: Access): boolean {
  return hasCap(user, 'report.view', access);
}
/** Xem lịch TOÀN công ty (thay vì chỉ của mình/đơn vị mình). */
export function canViewAllCalendar(user: OkrUser, access: Access): boolean {
  return hasCap(user, 'calendar.viewall', access) || hasCap(user, 'scope.all', access);
}
/** Thuộc nhóm ĐƯỢC nhận Bản tin điều hành tuần (email). */
export function canReceiveWeeklyDigest(user: OkrUser, access: Access): boolean {
  return hasCap(user, 'digest.weekly', access);
}

// ---- Kiểm quyền theo OKR (năng lực × phạm vi) ----
// level tuỳ chọn: có → bật ngoại lệ "chủ nhân OKR cá nhân tự cập nhật"; thiếu → giữ hành vi cũ.
type ObjScope = Pick<Objective, 'unit_id' | 'owner_email' | 'created_by'> & { level?: Level };

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
  // Chủ nhân OKR CÁ NHÂN tự cập nhật (check-in / sửa KR / nội dung) OKR của chính mình — kể cả nhân viên
  // (CFO 10/08). Vẫn KHÔNG đổi được cấp/đơn vị/liên kết cha (khoá ở editObjectiveAction cho nhân viên).
  if (obj.level === 'individual' && ownerOrCreator(user, obj)) return true;
  // Nhân viên = CHỈ XEM OKR đơn vị/công ty — TRỪ KHI được cấp năng lực 'okr.edit' (vd gán nhóm Quản trị).
  if (user.role === 'staff' && !hasCap(user, 'okr.edit', access)) return false;
  if (ownerOrCreator(user, obj)) return true; // chủ trì/người tạo luôn sửa OKR của mình
  if (!hasCap(user, 'okr.edit', access)) return false;
  return inScope(user, obj.unit_id, units, access);
}
export function canDeleteObjective(user: OkrUser, obj: ObjScope, units: Unit[], access: Access): boolean {
  // Nhân viên chỉ xem — trừ khi được cấp 'okr.delete'. (Kiểm cap ngay dưới cũng chặn, để rõ ý.)
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
  if (level === 'individual') return true; // OKR CÁ NHÂN: ai cũng tạo cho mình (kể cả nhân viên)
  // Nhân viên KHÔNG tạo OKR đơn vị/công ty — trừ khi được cấp 'okr.create' (cap dưới chặn nếu thiếu).
  if (!hasCap(user, 'okr.create', access)) return false;
  return inScope(user, unitId, units, access);
}

// ---- Quyền XEM công việc (need-to-know) — dùng cho trang "Công việc" /tasks ----
// Cây OKR vẫn minh bạch (mọi người xem); nhưng danh sách công việc tổng hợp áp
// nguyên tắc "cần-mới-biết": chỉ hiện việc bạn có liên quan (được giao / giao /
// chủ trì OKR / thành viên dự án) hoặc trong phạm vi quản lý của bạn. Nhóm có
// năng lực "Xem toàn bộ công việc" (task.viewall) và CEO/CFO xem TẤT CẢ.
type TaskView = {
  id: string;
  owner_email: string | null;
  created_by: string | null;
  unit_id: string | null;
  objective_owner: string | null;
  objective_unit_id: string | null;
  project_id: string | null;
  project_owner: string | null;
};

export type TaskViewCtx = { seeAll: boolean; scope: Set<string> | null; myProjects: Set<string>; mentioned: Set<string> };

/** Tính ngữ cảnh xem MỘT LẦN cho cả danh sách (tránh lặp): phạm vi lead + dự án user là thành viên. */
export function buildTaskViewCtx(
  user: OkrUser,
  tasks: TaskView[],
  units: Unit[],
  access: Access,
  mentioned: Set<string> = new Set(),
): TaskViewCtx {
  // NHÂN VIÊN (staff) = phạm vi XEM theo VAI TRÒ (đơn vị mình + hậu duệ + tổ tiên). Vai trò khác:
  // xem TẤT CẢ công việc chỉ khi có cap RIÊNG TƯ 'task.viewall' (KHÁC 'scope.all' = quyền quản lý).
  // → Quản trị hệ thống (có scope.all nhưng KHÔNG có task.viewall) chỉ thấy việc cần-mới-biết (CFO 12/09).
  const staff = user.role === 'staff';
  const seeAll = staff ? false : hasCap(user, 'task.viewall', access);
  const scope = staff ? objectiveViewScope(user, units) : manageScope(user, units); // null = exec (không giới hạn)
  const e = user.email.toLowerCase();
  const myProjects = new Set<string>();
  for (const t of tasks) {
    if (!t.project_id) continue;
    if (
      (t.owner_email && t.owner_email.toLowerCase() === e) ||
      (t.project_owner && t.project_owner.toLowerCase() === e)
    ) {
      myProjects.add(t.project_id);
    }
  }
  return { seeAll, scope, myProjects, mentioned };
}

/**
 * Ai được XEM 1 công việc (need-to-know):
 *  - "Xem toàn bộ công việc" (task.viewall) hoặc CEO/CFO (scope=null): xem tất cả;
 *  - người ĐƯỢC GIAO (owner_email) hoặc người GIAO/TẠO (created_by);
 *  - CHỦ TRÌ OKR gốc của việc (objective_owner);
 *  - THÀNH VIÊN dự án (chủ trì dự án, hoặc có việc được giao trong dự án đó);
 *  - LEAD: việc thuộc phạm vi đơn vị mình quản (unit của việc HOẶC unit của OKR).
 */
export function canViewInitiative(user: OkrUser, t: TaskView, ctx: TaskViewCtx): boolean {
  if (ctx.seeAll || ctx.scope === null) return true;
  if (ctx.mentioned.has(t.id)) return true; // được @tag tên trong bình luận việc → xem được
  const e = user.email.toLowerCase();
  if (t.owner_email && t.owner_email.toLowerCase() === e) return true;
  if (t.created_by && t.created_by.toLowerCase() === e) return true;
  if (t.objective_owner && t.objective_owner.toLowerCase() === e) return true;
  if (t.project_id && ctx.myProjects.has(t.project_id)) return true;
  if (t.unit_id && ctx.scope.has(t.unit_id)) return true;
  if (t.objective_unit_id && ctx.scope.has(t.objective_unit_id)) return true;
  return false;
}
