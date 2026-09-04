// Báo cáo tiến độ 1 DỰ ÁN — tính THUẦN từ danh sách công việc đã nạp (Initiative[]),
// KHÔNG truy vấn thêm. Hai góc nhìn CFO cần (03/09):
//   (1) TỔNG DỰ ÁN: tiiles trạng thái + % hoàn thành + quá hạn + theo người phụ trách.
//   (2) THEO THỜI GIAN: mỗi tháng đến hạn bao nhiêu / hoàn thành bao nhiêu / đúng hạn; tháng này tới đâu.
// Ngày ở dạng chuỗi 'YYYY-MM-DD' (so sánh chuỗi là đủ). `today` truyền vào (giờ VN) để nhất quán.
import type { Initiative, InitStatus } from './initiatives';

export type OwnerStat = {
  email: string | null;
  name: string;
  total: number;
  done: number;
  active: number; // chưa xong, chưa huỷ
  overdue: number;
  progress: number; // TB tiến độ (bỏ huỷ)
};

export type MonthStat = {
  key: string; // 'YYYY-MM'
  label: string; // 'Th M/YYYY'
  due: number; // việc ĐẾN HẠN trong tháng (bỏ huỷ)
  dueDone: number; // trong số đến hạn, đã xong
  dueOnTime: number; // đến hạn & xong đúng hạn (done_on <= due_on)
  completed: number; // việc HOÀN THÀNH trong tháng (theo done_on) — throughput
  isCurrent: boolean;
  isFuture: boolean;
};

export type ProjectReport = {
  total: number;
  byStatus: Record<InitStatus, number>;
  done: number;
  active: number;
  overdue: number;
  dueSoon: number; // đến hạn trong 7 ngày tới, chưa xong
  noDue: number; // chưa đặt hạn (trong số chưa xong)
  avgProgress: number;
  owners: OwnerStat[];
  months: MonthStat[];
  maxMonthly: number; // max(completed, due) qua các tháng — để vẽ thanh
  current: { key: string; label: string; due: number; dueDone: number; completed: number; overdue: number } | null;
  hasTimeline: boolean; // có ít nhất 1 việc có due_on hoặc done_on
};

const EMPTY_STATUS: Record<InitStatus, number> = { todo: 0, in_progress: 0, blocked: 0, done: 0, canceled: 0 };

function monthKey(d: string): string {
  return d.slice(0, 7);
}
function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `Th${Number(m)}/${y}`;
}
/** Danh sách 'YYYY-MM' liên tục từ min→max (bao gồm 2 đầu). Cắt trần 48 tháng cho an toàn. */
function monthRange(minKey: string, maxKey: string): string[] {
  const out: string[] = [];
  let [y, m] = minKey.split('-').map(Number);
  const [ey, em] = maxKey.split('-').map(Number);
  let guard = 0;
  while ((y < ey || (y === ey && m <= em)) && guard < 48) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
    guard += 1;
  }
  return out;
}

export function buildProjectReport(tasks: Initiative[], today: string): ProjectReport {
  const byStatus: Record<InitStatus, number> = { ...EMPTY_STATUS };
  let done = 0, active = 0, overdue = 0, dueSoon = 0, noDue = 0, progSum = 0, progCnt = 0;
  const in7 = addDays(today, 7);

  const ownerMap = new Map<string, OwnerStat>();
  const monthAgg = new Map<string, { due: number; dueDone: number; dueOnTime: number; completed: number }>();
  const touch = (k: string) => {
    if (!monthAgg.has(k)) monthAgg.set(k, { due: 0, dueDone: 0, dueOnTime: 0, completed: 0 });
    return monthAgg.get(k)!;
  };

  for (const t of tasks) {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    const canceled = t.status === 'canceled';
    const isDone = t.status === 'done';
    if (!canceled) { progSum += t.progress || 0; progCnt += 1; }
    if (isDone) done += 1;
    const open = !isDone && !canceled;
    if (open) {
      active += 1;
      if (t.due_on && t.due_on < today) overdue += 1;
      else if (t.due_on && t.due_on <= in7) dueSoon += 1;
      else if (!t.due_on) noDue += 1;
    }

    // Theo người phụ trách (bỏ huỷ khỏi TB tiến độ, vẫn đếm tổng).
    if (!canceled) {
      const key = (t.owner_email || '').toLowerCase() || '__none__';
      const name = t.owner_name || t.owner_email || 'Chưa giao';
      const o = ownerMap.get(key) ?? { email: t.owner_email, name, total: 0, done: 0, active: 0, overdue: 0, progress: 0 };
      o.total += 1;
      if (isDone) o.done += 1;
      if (open) { o.active += 1; if (t.due_on && t.due_on < today) o.overdue += 1; }
      o.progress += t.progress || 0;
      ownerMap.set(key, o);
    }

    // Theo tháng.
    if (!canceled && t.due_on) {
      const a = touch(monthKey(t.due_on));
      a.due += 1;
      if (isDone) {
        a.dueDone += 1;
        if (t.done_on && t.done_on <= t.due_on) a.dueOnTime += 1;
      }
    }
    if (t.done_on) touch(monthKey(t.done_on)).completed += 1;
  }

  const owners: OwnerStat[] = [...ownerMap.values()]
    .map((o) => ({ ...o, progress: o.total ? Math.round((o.progress / o.total)) : 0 }))
    .sort((a, b) => b.total - a.total || b.done - a.done);

  const keys = [...monthAgg.keys()].sort();
  const hasTimeline = keys.length > 0;
  const curKey = today.slice(0, 7);
  let months: MonthStat[] = [];
  if (hasTimeline) {
    // Bảo đảm tháng hiện tại luôn có trong dải để CFO thấy "tháng này".
    const lo = keys[0] < curKey ? keys[0] : curKey;
    const hi = keys[keys.length - 1] > curKey ? keys[keys.length - 1] : curKey;
    months = monthRange(lo, hi).map((k) => {
      const a = monthAgg.get(k) ?? { due: 0, dueDone: 0, dueOnTime: 0, completed: 0 };
      return {
        key: k,
        label: monthLabel(k),
        due: a.due,
        dueDone: a.dueDone,
        dueOnTime: a.dueOnTime,
        completed: a.completed,
        isCurrent: k === curKey,
        isFuture: k > curKey,
      };
    });
  }
  const maxMonthly = months.reduce((m, x) => Math.max(m, x.completed, x.due), 0);
  const curRow = months.find((m) => m.isCurrent) ?? null;
  const current = curRow
    ? {
        key: curRow.key,
        label: curRow.label,
        due: curRow.due,
        dueDone: curRow.dueDone,
        completed: curRow.completed,
        overdue,
      }
    : null;

  return {
    total: tasks.length,
    byStatus,
    done,
    active,
    overdue,
    dueSoon,
    noDue,
    avgProgress: progCnt ? Math.round(progSum / progCnt) : 0,
    owners,
    months,
    maxMonthly,
    current,
    hasTimeline,
  };
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
