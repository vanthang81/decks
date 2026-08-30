import { query, queryOne } from './db';
import type { OkrUser } from './users';
import { isExec, type Role } from './rbac';

export type UnitType = 'company' | 'division' | 'department';
export type Unit = {
  id: string;
  name: string;
  code: string | null;
  type: UnitType;
  parent_id: string | null;
  sort: number;
  is_active: boolean;
};
export type UnitNode = Unit & { children: UnitNode[] };

export async function listUnits(): Promise<Unit[]> {
  return query<Unit>(
    `SELECT id, name, code, type, parent_id, sort, is_active
       FROM okr_units ORDER BY type, sort, name`,
  );
}

export async function getUnit(id: string): Promise<Unit | null> {
  return queryOne<Unit>(
    `SELECT id, name, code, type, parent_id, sort, is_active FROM okr_units WHERE id=$1`,
    [id],
  );
}

/** Dựng cây từ danh sách phẳng (company là gốc). */
export function buildTree(units: Unit[]): UnitNode[] {
  const map = new Map<string, UnitNode>();
  units.forEach((u) => map.set(u.id, { ...u, children: [] }));
  const roots: UnitNode[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) map.get(node.parent_id)!.children.push(node);
    else roots.push(node);
  });
  const sortRec = (ns: UnitNode[]) => {
    ns.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
    ns.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

/** Trả về id của unit + toàn bộ hậu duệ (subtree). */
export function subtreeIds(units: Unit[], rootId: string): Set<string> {
  const childrenOf = new Map<string, string[]>();
  units.forEach((u) => {
    if (u.parent_id) {
      const arr = childrenOf.get(u.parent_id) ?? [];
      arr.push(u.id);
      childrenOf.set(u.parent_id, arr);
    }
  });
  const out = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    (childrenOf.get(id) ?? []).forEach((c) => stack.push(c));
  }
  return out;
}

/** Chuỗi id tổ tiên của unit (gồm chính nó). An toàn với vòng lặp cha↔con (thoát khi gặp id đã thăm). */
export function ancestorIds(units: Unit[], unitId: string): Set<string> {
  const byId = new Map(units.map((u) => [u.id, u]));
  const out = new Set<string>();
  let cur: Unit | undefined = byId.get(unitId);
  while (cur && !out.has(cur.id)) {
    out.add(cur.id);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return out;
}

/**
 * Phạm vi QUẢN TRỊ (được tạo/sửa OKR) của một người, tính theo cây tổ chức:
 *  - exec: toàn bộ (null = không giới hạn)
 *  - division_lead / dept_lead: đơn vị "nhà" + toàn bộ hậu duệ
 *  - staff: chỉ chính đơn vị mình (OKR cá nhân xử lý riêng theo owner_email)
 * Trả về null nghĩa là KHÔNG giới hạn (exec).
 */
export function manageScope(user: OkrUser, units: Unit[]): Set<string> | null {
  if (isExec(user.role)) return null;
  if (!user.unit_id) return new Set();
  if (user.role === 'division_lead' || user.role === 'dept_lead' || user.role === 'function_lead') {
    return subtreeIds(units, user.unit_id);
  }
  return new Set([user.unit_id]); // staff
}

/**
 * Phạm vi ĐỌC OKR. Điều hành + Giám đốc khối + Trưởng phòng = null (xem TẤT CẢ — giữ minh bạch
 * quản lý xuyên đơn vị). NHÂN VIÊN (staff) = CHỈ trong phạm vi đơn vị mình: đơn vị + hậu duệ +
 * chuỗi TỔ TIÊN (để vẫn thấy OKR cấp Công ty/Khối mà mình align lên) — KHÔNG thấy OKR các khối khác.
 */
export function objectiveViewScope(user: OkrUser, units: Unit[]): Set<string> | null {
  if (user.role !== 'staff') return null;
  if (!user.unit_id) return new Set();
  const s = subtreeIds(units, user.unit_id);
  for (const a of ancestorIds(units, user.unit_id)) s.add(a);
  return s;
}

/** Người này có được XEM 1 OKR không (theo objectiveViewScope). Luôn thấy OKR cấp Công ty + OKR mình chủ trì. */
export function canViewObjectiveUnit(
  scope: Set<string> | null,
  o: { unit_id: string | null; owner_email: string | null; level: string },
  email: string,
): boolean {
  if (scope === null) return true;
  if (o.level === 'company') return true;
  if (o.unit_id && scope.has(o.unit_id)) return true;
  if (o.owner_email && o.owner_email.toLowerCase() === email.toLowerCase()) return true;
  return false;
}

export async function createUnit(input: {
  name: string;
  code: string | null;
  type: UnitType;
  parent_id: string | null;
  sort: number;
}): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO okr_units (name, code, type, parent_id, sort)
     VALUES ($1, NULLIF($2,''), $3, $4, $5) RETURNING id`,
    [input.name, input.code ?? '', input.type, input.parent_id, input.sort],
  );
  return row!.id;
}

export async function updateUnit(
  id: string,
  input: { name: string; code: string | null; parent_id: string | null; sort: number; is_active: boolean },
): Promise<void> {
  await query(
    `UPDATE okr_units SET name=$2, code=NULLIF($3,''), parent_id=$4, sort=$5,
            is_active=$6, updated_at=now() WHERE id=$1`,
    [id, input.name, input.code ?? '', input.parent_id, input.sort, input.is_active],
  );
}

export async function deleteUnit(id: string): Promise<void> {
  await query('DELETE FROM okr_units WHERE id=$1', [id]);
}

// ─── LỊCH SỬ CƠ CẤU (effective-dated) — db/450_unit_history ───
export type UnitVersionInput = {
  name: string; code: string | null; parent_id: string | null; sort: number; is_active: boolean;
  effective_from: string; // 'YYYY-MM-DD'
  note?: string | null; created_by?: string | null;
};

/** Ghi 1 phiên bản cơ cấu cho đơn vị (mỗi lần thêm/sửa có ngày hiệu lực). */
export async function recordUnitVersion(unitId: string, v: UnitVersionInput): Promise<void> {
  await query(
    `INSERT INTO okr_unit_versions (unit_id, effective_from, name, code, parent_id, sort, is_active, note, created_by)
     VALUES ($1,$2,$3,NULLIF($4,''),$5,$6,$7,$8,$9)`,
    [unitId, v.effective_from, v.name, v.code ?? '', v.parent_id, v.sort, v.is_active, v.note ?? null, v.created_by ?? null],
  );
}

/** Cơ cấu tổ chức TẠI THỜI ĐIỂM `dateIso` (YYYY-MM-DD): mỗi đơn vị lấy phiên bản hiệu lực ≤ ngày, mới nhất.
 *  Đơn vị chưa có phiên bản nào ≤ ngày (chưa tồn tại) sẽ bị loại. type lấy từ okr_units (không đổi). */
export async function listUnitsAsOf(dateIso: string): Promise<Unit[]> {
  return query<Unit>(
    `SELECT u.id, v.name, v.code, u.type, v.parent_id, v.sort, v.is_active
       FROM okr_units u
       JOIN LATERAL (
         SELECT name, code, parent_id, sort, is_active
           FROM okr_unit_versions vv
          WHERE vv.unit_id = u.id AND vv.effective_from <= $1
          ORDER BY vv.effective_from DESC, vv.created_at DESC LIMIT 1
       ) v ON true
      ORDER BY u.type, v.sort, v.name`,
    [dateIso],
  );
}

/** Áp các phiên bản ĐÃ ĐẾN HẠN (effective_from ≤ hôm nay) vào ảnh hiện tại okr_units.
 *  Gọi khi mở trang Cây tổ chức để thay đổi đặt lịch tương lai tự có hiệu lực đúng ngày. Idempotent. */
export async function applyDueUnitVersions(): Promise<void> {
  await query(
    `UPDATE okr_units u
        SET name=v.name, code=v.code, parent_id=v.parent_id, sort=v.sort, is_active=v.is_active, updated_at=now()
       FROM (
         SELECT DISTINCT ON (unit_id) unit_id, name, code, parent_id, sort, is_active
           FROM okr_unit_versions
          WHERE effective_from <= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
          ORDER BY unit_id, effective_from DESC, created_at DESC
       ) v
      WHERE u.id = v.unit_id
        AND (u.name, COALESCE(u.code,''), COALESCE(u.parent_id::text,''), u.sort, u.is_active)
            IS DISTINCT FROM (v.name, COALESCE(v.code,''), COALESCE(v.parent_id::text,''), v.sort, v.is_active)`,
  );
}

/** Lịch sử phiên bản của 1 đơn vị (mới nhất trước) — cho panel "Lịch sử thay đổi". */
export async function listUnitVersions(unitId: string): Promise<Array<UnitVersionInput & { id: string; created_at: string }>> {
  return query(
    `SELECT id, effective_from::text AS effective_from, name, code, parent_id, sort, is_active, note, created_by, created_at::text AS created_at
       FROM okr_unit_versions WHERE unit_id=$1 ORDER BY effective_from DESC, created_at DESC`,
    [unitId],
  );
}


export const ROLE_CAN_MANAGE_ROLE: Record<Role, boolean> = {
  exec: true,
  ceo: true,
  cfo: true,
  division_lead: false,
  dept_lead: false,
  function_lead: false,
  staff: false,
};
