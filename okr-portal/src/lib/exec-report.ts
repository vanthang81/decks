// ── Báo cáo review thực hiện công việc TUẦN / THÁNG (CFO 12/09) ──
// Theo dõi status thực hiện tasks của tất cả bộ phận/phòng ban/cá nhân, PHÂN CẤP theo cây tổ chức
// (Khối → Phòng → …) với số liệu cuộn lên (roll-up). "Chậm deadline": việc chuyển done SAU (deadline hiệu
// lực + X ngày ân hạn) VẪN tính chậm. Deadline rơi CHỦ NHẬT → tự cộng 1 ngày ân hạn. X = late_grace_days
// config (super/system/okr admin sửa). Quyền xem: scope.all (super/system/okr/kpi admin) = toàn bộ; lãnh đạo
// = đơn vị mình + cấp dưới; nhân viên = chỉ việc mình.
import { query } from './db';
import { getSetting, setSetting } from './settings';
import { subtreeIds, type Unit } from './org';
import { isExec } from './rbac';
import { hasCap, type Access } from './access';
import type { OkrUser } from './users';

export const LATE_GRACE_KEY = 'late_grace_days';
export async function getLateGraceDays(): Promise<number> {
  const v = await getSetting<number>(LATE_GRACE_KEY, 0);
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}
export async function setLateGraceDays(days: number): Promise<void> {
  await setSetting(LATE_GRACE_KEY, Math.max(0, Math.floor(Number(days) || 0)));
}

export type ReportPeriod = 'week' | 'month';
export type Bucket = 'done_ontime' | 'done_late' | 'overdue' | 'ontrack';
export type Counts = { total: number; done: number; doneOntime: number; doneLate: number; overdue: number; ontrack: number };
export type PersonRow = { email: string; name: string; unitId: string | null; counts: Counts };
export type ReportNode = {
  unitId: string | null; unitName: string; depth: number;
  unitIds: string[];         // đơn vị này + mọi hậu duệ (để lọc popup theo nhánh)
  self: Counts;              // người trực thuộc TRỰC TIẾP đơn vị này
  roll: Counts;              // self + toàn bộ hậu duệ (số cuộn lên)
  people: PersonRow[];       // người trực thuộc trực tiếp
  children: ReportNode[];
};
export type TaskDetail = {
  id: string; code: string | null; title: string;
  owner_email: string; owner_name: string; unit_id: string | null; unit_name: string;
  due_on: string | null; done_on: string | null; status: string; bucket: Bucket; ctx: string;
};
export type ExecReport = {
  period: ReportPeriod; anchor: string; prevAnchor: string; nextAnchor: string;
  start: string; end: string; label: string;
  graceDays: number; scopeLabel: string;
  totals: Counts; tree: ReportNode[]; people: PersonRow[]; tasks: TaskDetail[];
};

const emptyCounts = (): Counts => ({ total: 0, done: 0, doneOntime: 0, doneLate: 0, overdue: 0, ontrack: 0 });
function add(c: Counts, b: Bucket) {
  c.total++;
  if (b === 'done_ontime') { c.done++; c.doneOntime++; }
  else if (b === 'done_late') { c.done++; c.doneLate++; }
  else if (b === 'overdue') c.overdue++;
  else c.ontrack++;
}
function addCounts(a: Counts, b: Counts) {
  a.total += b.total; a.done += b.done; a.doneOntime += b.doneOntime; a.doneLate += b.doneLate; a.overdue += b.overdue; a.ontrack += b.ontrack;
}

// VN date helpers (YYYY-MM-DD).
function vnToday(): string { return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10); }
function parse(iso: string): Date { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); }
function fmt(d: Date): string { return d.toISOString().slice(0, 10); }
function addDays(iso: string, n: number): string { const d = parse(iso); d.setUTCDate(d.getUTCDate() + n); return fmt(d); }
function isSunday(iso: string): boolean { return parse(iso).getUTCDay() === 0; }
/** Mốc TRỄ hiệu lực = due + (CN? +1) + graceDays. Done/quá hạn sau mốc này = chậm. */
function lateEdge(due: string, graceDays: number): string {
  const eff = isSunday(due) ? addDays(due, 1) : due;
  return addDays(eff, graceDays);
}

export function periodRange(period: ReportPeriod, anchor: string): { start: string; end: string; label: string } {
  const a = parse(anchor);
  if (period === 'week') {
    const dow = a.getUTCDay();
    const backToMon = dow === 0 ? 6 : dow - 1;
    const start = addDays(anchor, -backToMon);
    const end = addDays(start, 6);
    const s = start.split('-'); const e = end.split('-');
    return { start, end, label: `Tuần ${s[2]}/${s[1]} – ${e[2]}/${e[1]}/${e[0]}` };
  }
  const y = a.getUTCFullYear(); const m = a.getUTCMonth();
  return { start: fmt(new Date(Date.UTC(y, m, 1))), end: fmt(new Date(Date.UTC(y, m + 1, 0))), label: `Tháng ${String(m + 1).padStart(2, '0')}/${y}` };
}

export function shiftAnchor(period: ReportPeriod, anchor: string, dir: -1 | 1): string {
  if (period === 'week') return addDays(anchor, dir * 7);
  const a = parse(anchor);
  return fmt(new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + dir, 15)));
}

type Raw = {
  id: string; code: string | null; title: string;
  owner_email: string; owner_name: string | null; unit_id: string | null; unit_name: string | null;
  due_on: string | null; done_on: string | null; status: string;
  objective_title: string | null; project_name: string | null; meeting_title: string | null;
};

export async function buildExecReport(
  user: OkrUser, units: Unit[], access: Access,
  opts: { period: ReportPeriod; anchor?: string },
): Promise<ExecReport> {
  const period = opts.period === 'month' ? 'month' : 'week';
  const anchor = opts.anchor && /^\d{4}-\d{2}-\d{2}$/.test(opts.anchor) ? opts.anchor : vnToday();
  const { start, end, label } = periodRange(period, anchor);
  const graceDays = await getLateGraceDays();
  const today = vnToday();

  const viewAll = hasCap(user, 'scope.all', access);
  const isLead = user.role === 'division_lead' || user.role === 'dept_lead' || user.role === 'function_lead';
  let visibleUnits: Set<string> | null = null; // null = mọi đơn vị
  let selfOnly = false;
  let scopeLabel = 'Toàn công ty';
  if (!viewAll && !isExec(user.role)) {
    if (isLead && user.unit_id) { visibleUnits = subtreeIds(units, user.unit_id); scopeLabel = 'Đơn vị của bạn & cấp dưới'; }
    else { selfOnly = true; scopeLabel = 'Công việc của bạn'; }
  }

  const rows = await query<Raw>(
    `SELECT i.id, i.code, i.title, lower(i.owner_email) AS owner_email, u.display_name AS owner_name,
            u.unit_id, un.name AS unit_name, i.due_on::text, i.done_on::text, i.status,
            obj.title AS objective_title, pr.name AS project_name, mt.title AS meeting_title
       FROM okr_initiatives i
       JOIN okr_users u ON u.email = i.owner_email
       LEFT JOIN okr_units un ON un.id = u.unit_id
       LEFT JOIN okr_objectives obj ON obj.id = i.objective_id
       LEFT JOIN okr_projects pr ON pr.id = i.project_id
       LEFT JOIN okr_meetings mt ON mt.id = i.meeting_id
      WHERE i.owner_email IS NOT NULL AND i.status <> 'canceled'
        AND ( (i.due_on IS NOT NULL AND i.due_on BETWEEN $1 AND $2)
              OR (i.done_on IS NOT NULL AND i.done_on BETWEEN $1 AND $2) )`,
    [start, end],
  );

  const emailLc = user.email.toLowerCase();
  const direct = new Map<string, { self: Counts; people: Map<string, PersonRow> }>();
  const totals = emptyCounts();
  const tasks: TaskDetail[] = [];

  for (const r of rows) {
    if (!viewAll) {
      if (selfOnly) { if (r.owner_email !== emailLc) continue; }
      else if (visibleUnits) { if (!(r.unit_id && visibleUnits.has(r.unit_id)) && r.owner_email !== emailLc) continue; }
    }
    let bucket: Bucket;
    if (r.done_on) bucket = (r.due_on && r.done_on > lateEdge(r.due_on, graceDays)) ? 'done_late' : 'done_ontime';
    else if (r.due_on && lateEdge(r.due_on, graceDays) < today) bucket = 'overdue';
    else bucket = 'ontrack';

    const ctx = r.objective_title ? `OKR · ${r.objective_title}` : r.project_name ? `Dự án · ${r.project_name}` : r.meeting_title ? `Họp · ${r.meeting_title}` : 'Việc cá nhân';
    tasks.push({
      id: r.id, code: r.code, title: r.title, owner_email: r.owner_email, owner_name: r.owner_name || r.owner_email,
      unit_id: r.unit_id, unit_name: r.unit_name ?? 'Chưa gán đơn vị', due_on: r.due_on, done_on: r.done_on, status: r.status, bucket, ctx,
    });

    const uid = r.unit_id ?? '__none';
    let d = direct.get(uid);
    if (!d) { d = { self: emptyCounts(), people: new Map() }; direct.set(uid, d); }
    add(d.self, bucket);
    let p = d.people.get(r.owner_email);
    if (!p) { p = { email: r.owner_email, name: r.owner_name || r.owner_email, unitId: r.unit_id, counts: emptyCounts() }; d.people.set(r.owner_email, p); }
    add(p.counts, bucket);
    add(totals, bucket);
  }

  // Cây báo cáo (chỉ đơn vị trong phạm vi xem).
  const inView = (id: string): boolean => viewAll || (visibleUnits ? visibleUnits.has(id) : true);
  const byId = new Map<string, ReportNode>();
  for (const u of units) {
    if (selfOnly) { if (u.id !== user.unit_id) continue; }
    else if (!inView(u.id)) continue;
    const d = direct.get(u.id);
    byId.set(u.id, {
      unitId: u.id, unitName: u.name, depth: 0, unitIds: [u.id],
      self: d ? d.self : emptyCounts(), roll: emptyCounts(),
      people: d ? [...d.people.values()] : [], children: [],
    });
  }
  const order = new Map(units.map((u, i) => [u.id, i]));
  const roots: ReportNode[] = [];
  for (const u of units) {
    const node = byId.get(u.id);
    if (!node) continue;
    const parent = u.parent_id && byId.get(u.parent_id);
    if (parent) parent.children.push(node); else roots.push(node);
  }
  const sortNodes = (arr: ReportNode[]) => arr.sort((a, b) => (order.get(a.unitId ?? '') ?? 9998) - (order.get(b.unitId ?? '') ?? 9998));
  const finish = (node: ReportNode, depth: number): Counts => {
    node.depth = depth;
    sortNodes(node.children);
    addCounts(node.roll, node.self);
    node.people.sort((a, b) => b.counts.total - a.counts.total || a.name.localeCompare(b.name, 'vi'));
    for (const c of node.children) { const cr = finish(c, depth + 1); addCounts(node.roll, cr); node.unitIds.push(...c.unitIds); }
    return node.roll;
  };
  sortNodes(roots);
  for (const r of roots) finish(r, 0);
  // Bỏ nhánh RỖNG (không có việc nào trong kỳ) cho gọn.
  const prune = (arr: ReportNode[]): ReportNode[] => arr.filter((n) => { n.children = prune(n.children); return n.roll.total > 0; });
  const tree = prune(roots);

  // "Chưa gán đơn vị" (nếu có + được xem).
  const none = direct.get('__none');
  if (none && none.self.total > 0 && (viewAll || selfOnly)) {
    tree.push({
      unitId: null, unitName: 'Chưa gán đơn vị', depth: 0, unitIds: ['__none'],
      self: none.self, roll: { ...none.self }, people: [...none.people.values()].sort((a, b) => b.counts.total - a.counts.total), children: [],
    });
  }

  // Bảng xếp hạng cá nhân (flatten mọi người trong phạm vi).
  const people: PersonRow[] = [];
  for (const d of direct.values()) for (const p of d.people.values()) {
    if (selfOnly && p.email !== emailLc) continue;
    if (!viewAll && !selfOnly && visibleUnits && !(p.unitId && visibleUnits.has(p.unitId)) && p.email !== emailLc) continue;
    people.push(p);
  }

  return {
    period, anchor, prevAnchor: shiftAnchor(period, anchor, -1), nextAnchor: shiftAnchor(period, anchor, 1),
    start, end, label, graceDays, scopeLabel, totals, tree, people, tasks,
  };
}
