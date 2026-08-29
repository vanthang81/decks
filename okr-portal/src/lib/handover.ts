// BÀN GIAO / CHUYỂN GIAO công việc khi 1 nhân sự nghỉ (offboarding).
// Chuyển quyền SỞ HỮU (owner/assignee) các việc/OKR/dự án/họp từ người nghỉ → người thay thế.
// Giữ nguyên created_by (lịch sử ai tạo); chỉ đổi người PHỤ TRÁCH.
import { query, queryOne } from './db';

export type HandoverCounts = {
  openTasks: number; // công việc CHƯA hoàn thành (không tính done/canceled)
  allTasks: number; // tổng công việc được giao
  objectives: number; // OKR đang chủ trì
  projects: number; // dự án đang chủ trì
  meetings: number; // cuộc họp là chủ trì/thư ký
};

const EMPTY: HandoverCounts = { openTasks: 0, allTasks: 0, objectives: 0, projects: 0, meetings: 0 };

/** Đếm "gánh nặng" đang phụ trách của MỘT người (dùng cho preview popup bàn giao). */
export async function handoverCounts(email: string): Promise<HandoverCounts> {
  const e = email.toLowerCase();
  const r = await queryOne<HandoverCounts>(
    `SELECT
       (SELECT count(*) FROM okr_initiatives WHERE lower(owner_email)=$1 AND status NOT IN ('done','canceled'))::int AS "openTasks",
       (SELECT count(*) FROM okr_initiatives WHERE lower(owner_email)=$1)::int AS "allTasks",
       (SELECT count(*) FROM okr_objectives  WHERE lower(owner_email)=$1)::int AS objectives,
       (SELECT count(*) FROM okr_projects    WHERE lower(owner_email)=$1)::int AS projects,
       (SELECT count(*) FROM okr_meetings    WHERE lower(owner_email)=$1 OR lower(secretary_email)=$1)::int AS meetings`,
    [e],
  );
  return r ?? EMPTY;
}

/** Đếm theo TẤT CẢ người (1 lượt) → map emailLower → counts. Dùng ở trang danh sách người dùng. */
export async function handoverCountsAll(): Promise<Record<string, HandoverCounts>> {
  const map: Record<string, HandoverCounts> = {};
  const bump = (email: string | null, key: keyof HandoverCounts, n: number) => {
    if (!email) return;
    const k = email.toLowerCase();
    (map[k] ??= { ...EMPTY })[key] += n;
  };
  const [openT, allT, objs, prjs, mts] = await Promise.all([
    query<{ e: string; n: number }>(
      "SELECT lower(owner_email) e, count(*)::int n FROM okr_initiatives WHERE owner_email IS NOT NULL AND status NOT IN ('done','canceled') GROUP BY 1",
    ),
    query<{ e: string; n: number }>(
      'SELECT lower(owner_email) e, count(*)::int n FROM okr_initiatives WHERE owner_email IS NOT NULL GROUP BY 1',
    ),
    query<{ e: string; n: number }>(
      'SELECT lower(owner_email) e, count(*)::int n FROM okr_objectives WHERE owner_email IS NOT NULL GROUP BY 1',
    ),
    query<{ e: string; n: number }>(
      'SELECT lower(owner_email) e, count(*)::int n FROM okr_projects WHERE owner_email IS NOT NULL GROUP BY 1',
    ),
    query<{ e: string; n: number }>(
      `SELECT lower(email) e, count(*)::int n FROM (
         SELECT owner_email AS email FROM okr_meetings WHERE owner_email IS NOT NULL
         UNION ALL
         SELECT secretary_email AS email FROM okr_meetings WHERE secretary_email IS NOT NULL
       ) s GROUP BY 1`,
    ),
  ]);
  for (const r of openT) bump(r.e, 'openTasks', r.n);
  for (const r of allT) bump(r.e, 'allTasks', r.n);
  for (const r of objs) bump(r.e, 'objectives', r.n);
  for (const r of prjs) bump(r.e, 'projects', r.n);
  for (const r of mts) bump(r.e, 'meetings', r.n);
  return map;
}

export type HandoverInput = {
  from: string;
  to: string;
  tasks: 'open' | 'all' | 'none'; // phạm vi công việc chuyển
  objectives: boolean;
  projects: boolean;
  meetings: boolean;
};
export type HandoverResult = { tasks: number; objectives: number; projects: number; meetings: number };

/** Thực hiện bàn giao: đổi owner từ `from` → `to`. Trả số bản ghi mỗi loại đã chuyển. */
export async function reassignOwnership(input: HandoverInput): Promise<HandoverResult> {
  const from = input.from.toLowerCase();
  const to = input.to; // giữ nguyên định dạng email người nhận
  const res: HandoverResult = { tasks: 0, objectives: 0, projects: 0, meetings: 0 };

  if (input.tasks !== 'none') {
    const cond = input.tasks === 'open' ? "AND status NOT IN ('done','canceled')" : '';
    const rows = await query(
      `UPDATE okr_initiatives SET owner_email=$2, updated_at=now() WHERE lower(owner_email)=$1 ${cond} RETURNING id`,
      [from, to],
    );
    res.tasks = rows.length;
  }
  if (input.objectives) {
    const rows = await query(
      'UPDATE okr_objectives SET owner_email=$2, updated_at=now() WHERE lower(owner_email)=$1 RETURNING id',
      [from, to],
    );
    res.objectives = rows.length;
  }
  if (input.projects) {
    const rows = await query(
      'UPDATE okr_projects SET owner_email=$2, updated_at=now() WHERE lower(owner_email)=$1 RETURNING id',
      [from, to],
    );
    res.projects = rows.length;
  }
  if (input.meetings) {
    const a = await query(
      'UPDATE okr_meetings SET owner_email=$2 WHERE lower(owner_email)=$1 RETURNING id',
      [from, to],
    );
    const b = await query(
      'UPDATE okr_meetings SET secretary_email=$2 WHERE lower(secretary_email)=$1 RETURNING id',
      [from, to],
    );
    res.meetings = a.length + b.length;
  }
  return res;
}
