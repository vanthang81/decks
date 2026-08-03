import { listProjectsByPeriod } from './projects';
import type { ProjectStatus } from './projects';

// Tổng hợp NGÂN SÁCH theo kỳ — dùng cho trang Quản trị ngân sách.
// Quy ước (khớp trang chi tiết dự án): "Kế hoạch" = ngân sách dự án khai báo;
// "Đã chi" = tổng thực chi GOM TỪ CÔNG VIỆC (sum budget_actual của việc trong dự án).
export type BudgetProject = {
  id: string; code: string | null; name: string; unit_name: string | null;
  status: ProjectStatus; planned: number; actual: number; taskPlanned: number; taskCount: number;
};
export type BudgetUnit = { unit: string; planned: number; actual: number; nProjects: number };
export type BudgetOverview = {
  totalPlanned: number; totalActual: number; projects: BudgetProject[]; units: BudgetUnit[];
};

export async function budgetOverview(periodId: string): Promise<BudgetOverview> {
  const rows = await listProjectsByPeriod(periodId);
  const projects: BudgetProject[] = rows.map((p) => ({
    id: p.id, code: p.code, name: p.name, unit_name: p.unit_name, status: p.status,
    planned: p.budget_planned, actual: p.task_budget_actual, taskPlanned: p.task_budget_planned,
    taskCount: p.task_count,
  }));
  const totalPlanned = projects.reduce((a, p) => a + p.planned, 0);
  const totalActual = projects.reduce((a, p) => a + p.actual, 0);
  const um = new Map<string, BudgetUnit>();
  for (const p of projects) {
    const key = p.unit_name ?? '— Chưa gắn đơn vị —';
    const cur = um.get(key) ?? { unit: key, planned: 0, actual: 0, nProjects: 0 };
    cur.planned += p.planned; cur.actual += p.actual; cur.nProjects += 1;
    um.set(key, cur);
  }
  const units = [...um.values()].sort((a, b) => b.planned - a.planned);
  return { totalPlanned, totalActual, projects, units };
}
