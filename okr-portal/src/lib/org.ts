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

/** Chuỗi id tổ tiên của unit (gồm chính nó). */
export function ancestorIds(units: Unit[], unitId: string): Set<string> {
  const byId = new Map(units.map((u) => [u.id, u]));
  const out = new Set<string>();
  let cur: Unit | undefined = byId.get(unitId);
  while (cur) {
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
  if (user.role === 'division_lead' || user.role === 'dept_lead') {
    return subtreeIds(units, user.unit_id);
  }
  return new Set([user.unit_id]); // staff
}

export async function createUnit(input: {
  name: string;
  code: string | null;
  type: UnitType;
  parent_id: string | null;
  sort: number;
}): Promise<void> {
  await query(
    `INSERT INTO okr_units (name, code, type, parent_id, sort)
     VALUES ($1, NULLIF($2,''), $3, $4, $5)`,
    [input.name, input.code ?? '', input.type, input.parent_id, input.sort],
  );
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

export const ROLE_CAN_MANAGE_ROLE: Record<Role, boolean> = {
  exec: true,
  ceo: true,
  cfo: true,
  division_lead: false,
  dept_lead: false,
  staff: false,
};
