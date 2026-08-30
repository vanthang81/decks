// Client-safe: dựng OPTIONS đơn vị theo CÂY tổ chức cho SearchSelect (KHÔNG import pg).
// Công ty → mỗi Khối → các Phòng THUỘC khối đó (thụt cấp, dấu ↳) — thay vì gom phẳng
// tất cả Phòng xuống cuối. Dùng chung MỌI dropdown chọn/lọc đơn vị để nhất quán.
import type { SSOption } from '@/components/SearchSelect';

export type UnitLite = {
  id: string;
  name: string;
  type: 'company' | 'division' | 'department';
  parent_id?: string | null;
  sort?: number | null;
};

const TYPE_LABEL: Record<string, string> = { company: 'Công ty', division: 'Khối', department: 'Phòng' };

type Node = UnitLite & { children: Node[] };

/**
 * Trả về options SearchSelect theo cây tổ chức, có thụt cấp.
 * - Nếu units có `parent_id` → nest đúng theo cây (DFS, sort theo `sort` rồi tên).
 * - Nếu thiếu parent_id (chỉ {id,name,type}) → fallback: Công ty → Khối → Phòng (phẳng theo type),
 *   vẫn thụt cấp theo type để dễ đọc.
 */
export function unitTreeOptions(units: UnitLite[], opts?: { excludeCompany?: boolean }): SSOption[] {
  if (opts?.excludeCompany) units = units.filter((u) => u.type !== 'company');
  if (units.length === 0) return [];
  const hasParent = units.some((u) => u.parent_id != null);
  const label = (u: UnitLite, depth: number) =>
    `${'  '.repeat(depth)}${depth > 0 ? '↳ ' : ''}${u.name} (${TYPE_LABEL[u.type] ?? u.type})`;

  if (!hasParent) {
    // Fallback phẳng theo type (khi caller chưa truyền parent_id) — thụt theo cấp type.
    const depthOf = (t: string) => (t === 'company' ? 0 : t === 'division' ? 1 : 2);
    const order = (t: string) => (t === 'company' ? 0 : t === 'division' ? 1 : 2);
    return [...units]
      .sort((a, b) => order(a.type) - order(b.type) || (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name))
      .map((u) => ({ value: u.id, label: label(u, depthOf(u.type)) }));
  }

  // Dựng cây từ parent_id.
  const map = new Map<string, Node>();
  units.forEach((u) => map.set(u.id, { ...u, children: [] }));
  const roots: Node[] = [];
  map.forEach((n) => {
    const p = n.parent_id != null ? map.get(n.parent_id) : undefined;
    if (p) p.children.push(n);
    else roots.push(n);
  });
  const sortRec = (ns: Node[]) => {
    ns.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name));
    ns.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);

  const out: SSOption[] = [];
  // `sub` = đường dẫn CẤP TRÊN (Khối…, bỏ Công ty) → (1) HIỆN ngữ cảnh phòng thuộc khối nào;
  // (2) TÌM KIẾM: SearchSelect tìm cả `sub` nên gõ tên KHỐI ("Tài chính") sẽ ra MỌI phòng thuộc khối đó
  // (trước đây gõ "tài" chỉ ra "Phòng Tài chính", sót "Phòng Kế toán/Kế hoạch" vì tên phòng không chứa "tài").
  const walk = (ns: Node[], depth: number, ancestors: string[]) => {
    for (const n of ns) {
      out.push({ value: n.id, label: label(n, depth), sub: ancestors.length ? ancestors.join(' › ') : undefined });
      // Tích luỹ tên cấp trên cho con (bỏ Công ty cho gọn — chỉ giữ Khối/Phòng cha).
      if (n.children.length) walk(n.children, depth + 1, n.type === 'company' ? ancestors : [...ancestors, n.name]);
    }
  };
  walk(roots, 0, []);
  return out;
}
