import { query } from './db';

// Phụ thuộc waterfall giữa công việc: task PHỤ THUỘC vào các predecessor (phải xong trước).
// TẤT CẢ hàm bọc try/catch để chạy được cả TRƯỚC khi migration 430 chạy (bảng chưa có → coi như rỗng).

export type TaskDep = { task_id: string; depends_on_id: string };

// Map taskId → danh sách predecessor id (việc phải xong trước).
export async function depsForTasks(taskIds: string[]): Promise<Map<string, string[]>> {
  const m = new Map<string, string[]>();
  if (taskIds.length === 0) return m;
  try {
    const rows = await query<TaskDep>(
      `SELECT task_id, depends_on_id FROM okr_initiative_deps WHERE task_id = ANY($1)`,
      [taskIds],
    );
    for (const r of rows) {
      const arr = m.get(r.task_id) ?? [];
      arr.push(r.depends_on_id);
      m.set(r.task_id, arr);
    }
  } catch { /* bảng chưa tồn tại (chưa migrate) → rỗng */ }
  return m;
}

export async function listTaskDeps(taskId: string): Promise<string[]> {
  return (await depsForTasks([taskId])).get(taskId) ?? [];
}

// Toàn bộ cạnh phụ thuộc của 1 tập việc (cho vẽ mũi tên Gantt sau này).
export async function depEdgesForTasks(taskIds: string[]): Promise<TaskDep[]> {
  if (taskIds.length === 0) return [];
  try {
    return await query<TaskDep>(
      `SELECT task_id, depends_on_id FROM okr_initiative_deps
        WHERE task_id = ANY($1) AND depends_on_id = ANY($1)`,
      [taskIds],
    );
  } catch { return []; }
}

// Đặt lại danh sách predecessor cho 1 task (thay thế toàn bộ). Chống VÒNG LẶP: predecessor không được
// (trực tiếp/gián tiếp) phụ thuộc ngược lại task này. Bỏ qua id trùng chính task.
export async function setTaskDeps(taskId: string, predecessorIds: string[]): Promise<void> {
  const clean = [...new Set(predecessorIds.filter((p) => p && p !== taskId))];
  // Lọc predecessor gây vòng lặp: nếu p đã (gián tiếp) phụ thuộc taskId thì bỏ.
  const safe: string[] = [];
  for (const p of clean) {
    if (!(await dependsOn(p, taskId))) safe.push(p);
  }
  try {
    await query('DELETE FROM okr_initiative_deps WHERE task_id=$1', [taskId]);
    for (const p of safe) {
      await query(
        'INSERT INTO okr_initiative_deps(task_id, depends_on_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
        [taskId, p],
      );
    }
  } catch { /* chưa migrate → bỏ qua để không chặn lưu việc */ }
}

// a có (gián tiếp) phụ thuộc b không? (đi theo cạnh a → predecessor…)
async function dependsOn(a: string, b: string): Promise<boolean> {
  const seen = new Set<string>();
  let frontier = [a];
  try {
    while (frontier.length) {
      const rows = await query<{ depends_on_id: string }>(
        `SELECT depends_on_id FROM okr_initiative_deps WHERE task_id = ANY($1)`,
        [frontier],
      );
      const next: string[] = [];
      for (const r of rows) {
        if (r.depends_on_id === b) return true;
        if (!seen.has(r.depends_on_id)) { seen.add(r.depends_on_id); next.push(r.depends_on_id); }
      }
      frontier = next;
    }
  } catch { return false; }
  return false;
}
