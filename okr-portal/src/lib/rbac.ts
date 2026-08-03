// Vai trò theo cây tổ chức BTMH.
// CEO/CFO (đồng cấp điều hành, toàn quyền) > division_lead (Giám đốc khối) > dept_lead (Trưởng phòng) > staff.
// 'exec' = giá trị CŨ (gộp CEO/CFO) — GIỮ để tương thích dữ liệu cũ; coi như cấp điều hành qua isExec().
export type Role = 'exec' | 'ceo' | 'cfo' | 'division_lead' | 'dept_lead' | 'staff';

export const ROLE_ORDER: Record<Role, number> = {
  exec: 4,
  ceo: 4,
  cfo: 4,
  division_lead: 3,
  dept_lead: 2,
  staff: 1,
};

export const ROLE_LABEL: Record<Role, string> = {
  exec: 'CEO/CFO',
  ceo: 'CEO',
  cfo: 'CFO',
  division_lead: 'Giám đốc khối',
  dept_lead: 'Trưởng phòng',
  staff: 'Nhân viên',
};

// Danh sách CHỌN được ở dropdown (tách riêng CEO & CFO; 'exec' cũ không còn cho chọn mới).
export const ROLES: Role[] = ['ceo', 'cfo', 'division_lead', 'dept_lead', 'staff'];

export function isRole(x: unknown): x is Role {
  return typeof x === 'string' && x in ROLE_ORDER;
}

/** Cấp ĐIỀU HÀNH (toàn quyền): CEO, CFO, hoặc 'exec' cũ. */
export function isExec(role: Role | string | undefined): boolean {
  return role === 'exec' || role === 'ceo' || role === 'cfo';
}

/** Vai trò a có "cao hơn hoặc bằng" b không. */
export function roleAtLeast(a: Role | undefined, b: Role): boolean {
  if (!a) return false;
  return ROLE_ORDER[a] >= ROLE_ORDER[b];
}

/** Chỉ cấp điều hành (CEO/CFO) mới được quản trị hệ thống (người dùng, cây tổ chức, kỳ). */
export function canAdmin(role: Role | undefined): boolean {
  return isExec(role);
}
