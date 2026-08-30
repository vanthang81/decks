import { getSetting, setSetting } from './settings';
import { isRole, type Role } from './rbac';
import { DEFAULT_GROUPS } from './capabilities';

// VỊ TRÍ / CHỨC DANH (preset tự phục vụ — CFO 30/08). Một "Vị trí" = nhãn chức danh tự do +
// CẤP QUYỀN HẠN NỀN (base_role, quyết định phạm vi quản lý) + Nhóm quyền mặc định (năng lực).
// Khi thêm/sửa người dùng, chọn Vị trí → tự điền Vai trò (cấp quyền) + Nhóm quyền + gợi ý Chức danh.
// KHÔNG đụng logic phân quyền (chỉ là preset điền nhanh) → an toàn, admin tự thêm/bớt trong Phân quyền.
// Lưu ở okr_settings key 'positions' (jsonb) — btmh_app ghi được, không cần DDL.

export const POSITIONS_KEY = 'positions';

export type Position = {
  key: string;        // định danh ổn định (slug)
  label: string;      // tên chức danh hiển thị (vd "Quản lý vùng", "Phó phòng")
  base_role: Role;    // cấp quyền hạn nền → phạm vi (ceo/cfo/division_lead/dept_lead/function_lead/staff)
  perm_group: string; // nhóm quyền mặc định (key trong DEFAULT_GROUPS / nhóm đã cấu hình); '' = mặc định theo vai trò
  sort?: number;
};

function slug(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || `vt-${Date.now()}`;
}

const GROUP_KEYS = new Set(DEFAULT_GROUPS.map((g) => g.key));

/** Đọc danh sách Vị trí (đã sắp xếp). */
export async function listPositions(): Promise<Position[]> {
  const raw = await getSetting<Position[] | null>(POSITIONS_KEY, null);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && typeof p.key === 'string' && typeof p.label === 'string' && isRole(p.base_role))
    .map((p) => ({ key: p.key, label: p.label, base_role: p.base_role, perm_group: typeof p.perm_group === 'string' ? p.perm_group : '', sort: typeof p.sort === 'number' ? p.sort : 0 }))
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.label.localeCompare(b.label));
}

/** Thêm/sửa 1 Vị trí. `key` rỗng = tạo mới (sinh slug từ label). Trả về danh sách mới. */
export async function upsertPosition(input: { key?: string; label: string; base_role: string; perm_group: string; sort?: number }): Promise<Position[]> {
  const label = (input.label || '').trim();
  if (!label) throw new Error('Nhập tên Vị trí / chức danh.');
  if (!isRole(input.base_role)) throw new Error('Chọn Cấp quyền hạn nền hợp lệ.');
  const perm_group = input.perm_group && GROUP_KEYS.has(input.perm_group) ? input.perm_group : '';
  const list = await listPositions();
  const key = input.key && list.some((p) => p.key === input.key) ? input.key : slug(label);
  if (!input.key && list.some((p) => p.key === key)) throw new Error('Vị trí trùng tên — đổi tên khác.');
  const next: Position = { key, label, base_role: input.base_role, perm_group, sort: input.sort ?? (list.length ? Math.max(...list.map((p) => p.sort ?? 0)) + 1 : 0) };
  const idx = list.findIndex((p) => p.key === key);
  if (idx >= 0) list[idx] = { ...next, sort: list[idx].sort }; else list.push(next);
  await setSetting(POSITIONS_KEY, list);
  return list;
}

/** Xoá 1 Vị trí (không ảnh hưởng user đã gán — vì Vị trí chỉ là preset điền nhanh). */
export async function deletePosition(key: string): Promise<Position[]> {
  const list = (await listPositions()).filter((p) => p.key !== key);
  await setSetting(POSITIONS_KEY, list);
  return list;
}
