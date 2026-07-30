// Vai trò theo cây tổ chức BTMH.
// exec (CEO/CFO) > division_lead (Giám đốc khối) > dept_lead (Trưởng phòng) > staff (Nhân viên)
export type Role = 'exec' | 'division_lead' | 'dept_lead' | 'staff';

export const ROLE_ORDER: Record<Role, number> = {
  exec: 4,
  division_lead: 3,
  dept_lead: 2,
  staff: 1,
};

export const ROLE_LABEL: Record<Role, string> = {
  exec: 'CEO/CFO',
  division_lead: 'Giám đốc khối',
  dept_lead: 'Trưởng phòng',
  staff: 'Nhân viên',
};

export const ROLES: Role[] = ['exec', 'division_lead', 'dept_lead', 'staff'];

export function isRole(x: unknown): x is Role {
  return typeof x === 'string' && x in ROLE_ORDER;
}

/** Vai trò a có "cao hơn hoặc bằng" b không. */
export function roleAtLeast(a: Role | undefined, b: Role): boolean {
  if (!a) return false;
  return ROLE_ORDER[a] >= ROLE_ORDER[b];
}

/** Chỉ exec mới được quản trị hệ thống (người dùng, cây tổ chức, kỳ). */
export function canAdmin(role: Role | undefined): boolean {
  return role === 'exec';
}
