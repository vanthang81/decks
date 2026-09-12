// ── Báo cáo review thực hiện công việc TUẦN / THÁNG (CFO 12/09) ──
// Theo dõi status thực hiện tasks của tất cả bộ phận/phòng ban/cá nhân trong tuần/tháng.
// "Chậm deadline": việc chuyển done SAU (due_on + X ngày ân hạn) VẪN tính chậm; X = late_grace_days config
// (super/system/okr admin sửa). Quyền xem: scope.all (super/system/okr/kpi admin) = toàn bộ; lãnh đạo = cấp
// dưới (đơn vị mình + hậu duệ); nhân viên = chỉ việc của mình.
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
export type Counts = {
  total: number; done: number; doneOntime: number; doneLate: number; overdue: number; ontrack: number;
};
export type PersonRow = { email: string; name: string; counts: Counts };
export type UnitRow = { unitId: string | null; unitName: string; counts: Counts; people: PersonRow[] };
export type ExecReport = {
  period: ReportPeriod; anchor: string; prevAnchor: string; nextAnchor: string;
  start: string; end: string; label: string;
  graceDays: number; scopeLabel: string;
  totals: Counts; units: UnitRow[];
};

const emptyCounts = (): Counts => ({ total: 0, done: 0, doneOntime: 0, doneLate: 0, overdue: 0, ontrack: 0 });
function add(c: Counts, b: Bucket) {
  c.total++;
  if (b === 'done_ontime') { c.done++; c.doneOntime++; }
  else if (b === 'done_late') { c.done++; c.doneLate++; }
  else if (b === 'overdue') c.overdue++;
  else c.ontrack++;
}

// VN date helpers (YYYY-MM-DD, không lệ thuộc timezone máy chủ).
function vnToday(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}
function parse(iso: string): Date { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); }
function fmt(d: Date): string { return d.toISOString().slice(0, 10); }
function addDays(iso: string, n: number): string { const d = parse(iso); d.setUTCDate(d.getUTCDate() + n); return fmt(d); }

/** Khoảng thời gian của kỳ chứa `anchor`. week = Thứ 2→Chủ nhật; month = ngày 1→cuối tháng. */
export function periodRange(period: ReportPeriod, anchor: string): { start: string; end: string; label: string } {
  const a = parse(anchor);
  if (period === 'week') {
    const dow = a.getUTCDay(); // 0=CN..6=T7
    const backToMon = dow === 0 ? 6 : dow - 1;
    const start = addDays(anchor, -backToMon);
    const end = addDays(start, 6);
    const s = start.split('-'); const e = end.split('-');
    return { start, end, label: `Tuần ${s[2]}/${s[1]} – ${e[2]}/${e[1]}/${e[0]}` };
  }
  const y = a.getUTCFullYear(); const m = a.getUTCMonth();
  const start = fmt(new Date(Date.UTC(y, m, 1)));
  const end = fmt(new Date(Date.UTC(y, m + 1, 0)));
  return { start, end, label: `Tháng ${String(m + 1).padStart(2, '0')}/${y}` };
}

type TaskRow = {
  owner_email: string; owner_name: string | null; unit_id: string | null; unit_name: string | null;
  due_on: string | null; done_on: string | null; status: string;
};

/**
 * Dựng báo cáo. Phạm vi:
 *  - scope.all (super/system/okr/kpi admin) → toàn bộ;
 *  - lãnh đạo (division/dept/function lead) → đơn vị mình + hậu duệ (cấp dưới);
 *  - nhân viên → CHỈ việc của mình.
 */
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
  let scopeUnits: Set<string> | null = null; // null = mọi đơn vị
  let selfOnly = false;
  let scopeLabel = 'Toàn công ty';
  if (!viewAll && !isExec(user.role)) {
    if (isLead && user.unit_id) {
      scopeUnits = subtreeIds(units, user.unit_id);
      scopeLabel = 'Đơn vị của bạn & cấp dưới';
    } else {
      selfOnly = true;
      scopeLabel = 'Công việc của bạn';
    }
  }

  // Lấy việc "action" có người phụ trách, thuộc kỳ (đến hạn HOẶC hoàn thành trong kỳ). Loại 'canceled'.
  const rows = await query<TaskRow>(
    `SELECT lower(i.owner_email) AS owner_email, u.display_name AS owner_name,
            u.unit_id, un.name AS unit_name, i.due_on::text, i.done_on::text, i.status
       FROM okr_initiatives i
       JOIN okr_users u ON u.email = i.owner_email
       LEFT JOIN okr_units un ON un.id = u.unit_id
      WHERE i.owner_email IS NOT NULL AND i.status <> 'canceled'
        AND ( (i.due_on IS NOT NULL AND i.due_on BETWEEN $1 AND $2)
              OR (i.done_on IS NOT NULL AND i.done_on BETWEEN $1 AND $2) )`,
    [start, end],
  );

  const emailLc = user.email.toLowerCase();
  const byUnit = new Map<string, UnitRow>();
  const totals = emptyCounts();

  for (const r of rows) {
    // Phạm vi xem.
    if (!viewAll) {
      if (selfOnly) { if (r.owner_email !== emailLc) continue; }
      else if (scopeUnits) { if (!(r.unit_id && scopeUnits.has(r.unit_id)) && r.owner_email !== emailLc) continue; }
    }
    // Phân loại bucket.
    let bucket: Bucket;
    if (r.done_on) {
      bucket = (r.due_on && r.done_on > addDays(r.due_on, graceDays)) ? 'done_late' : 'done_ontime';
    } else if (r.due_on && r.due_on < today) {
      bucket = 'overdue';
    } else {
      bucket = 'ontrack';
    }
    const uid = r.unit_id ?? '__none';
    const uname = r.unit_name ?? 'Chưa gán đơn vị';
    let ur = byUnit.get(uid);
    if (!ur) { ur = { unitId: r.unit_id, unitName: uname, counts: emptyCounts(), people: [] }; byUnit.set(uid, ur); }
    add(ur.counts, bucket);
    let pr = ur.people.find((p) => p.email === r.owner_email);
    if (!pr) { pr = { email: r.owner_email, name: r.owner_name || r.owner_email, counts: emptyCounts() }; ur.people.push(pr); }
    add(pr.counts, bucket);
    add(totals, bucket);
  }

  // Sắp xếp: đơn vị theo thứ tự cây (sort field), người theo tên; đưa "Chưa gán" xuống cuối.
  const order = new Map(units.map((u, i) => [u.id, i]));
  const unitRows = [...byUnit.values()].sort((a, b) => {
    const oa = a.unitId ? (order.get(a.unitId) ?? 9998) : 9999;
    const ob = b.unitId ? (order.get(b.unitId) ?? 9998) : 9999;
    return oa - ob;
  });
  for (const ur of unitRows) ur.people.sort((a, b) => b.counts.total - a.counts.total || a.name.localeCompare(b.name, 'vi'));

  return {
    period, anchor, prevAnchor: shiftAnchor(period, anchor, -1), nextAnchor: shiftAnchor(period, anchor, 1),
    start, end, label, graceDays, scopeLabel, totals, units: unitRows,
  };
}

/** Điều hướng kỳ trước/sau (trả anchor mới). Tuần = ±7 ngày; tháng = sang ngày 15 tháng trước/sau (ổn định). */
export function shiftAnchor(period: ReportPeriod, anchor: string, dir: -1 | 1): string {
  if (period === 'week') return addDays(anchor, dir * 7);
  const a = parse(anchor);
  return fmt(new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + dir, 15)));
}
