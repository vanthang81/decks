import HelpTip from '@/components/HelpTip';
import SiteHeader from '@/components/SiteHeader';
import TaskExplorer from '@/components/TaskExplorer';
import NewTaskModal from '@/components/NewTaskModal';
import { requireUser } from '@/lib/current-user';
import { listUnits, objectiveViewScope } from '@/lib/org';
import { listUsers, personTitle } from '@/lib/users';
import { listAllProjectOptions } from '@/lib/projects';
import { listAllInitiatives } from '@/lib/initiatives';
import { listObjectivesByPeriod } from '@/lib/okr';
import { getCurrentPeriod } from '@/lib/periods';
import { depsForTasks } from '@/lib/deps';
import { loadAccess, buildTaskViewCtx, canViewInitiative, canEditObjective } from '@/lib/access';
import { editInitiativeAction, deleteInitiativeAction, moveInitiativeAction, createTaskAction } from '@/app/objectives/actions';

export const dynamic = 'force-dynamic';

export default async function TasksPage({
  searchParams,
}: {
  searchParams: { task?: string; mine?: string; status?: string; overdue?: string };
}) {
  const user = await requireUser();
  const [access, units, all, users, projects] = await Promise.all([
    loadAccess(),
    listUnits(),
    listAllInitiatives(),
    listUsers(),
    listAllProjectOptions(),
  ]);
  const ctx = buildTaskViewCtx(user, all, units, access);
  const visible = all.filter((t) => canViewInitiative(user, t, ctx));

  // Việc mà user có quyền QUẢN LÝ (sửa mọi trường + xoá) = quản OKR gốc HOẶC dự án HOẶC cuộc họp của việc.
  const emailLc = user.email.toLowerCase();
  const manageIds = visible
    .filter((t) =>
      canEditObjective(
        user,
        { unit_id: t.objective_unit_id, owner_email: t.objective_owner, created_by: t.objective_created_by },
        units,
        access,
      ) ||
      (t.project_id && ctx.myProjects.has(t.project_id)) ||
      (t.meeting_owner && t.meeting_owner.toLowerCase() === emailLc) ||
      (t.meeting_secretary && t.meeting_secretary.toLowerCase() === emailLc) ||
      // VIỆC CÁ NHÂN (không gắn OKR/dự án/cuộc họp) → chính chủ toàn quyền sửa/xoá.
      (!t.objective_id && !t.key_result_id && !t.project_id && !t.meeting_id &&
        ((t.owner_email && t.owner_email.toLowerCase() === emailLc) ||
          (t.created_by && t.created_by.toLowerCase() === emailLc))),
    )
    .map((t) => t.id);

  // Phụ thuộc waterfall: map việc → danh sách predecessor (việc phải xong trước). Rỗng nếu chưa migrate.
  const depsMapRaw = await depsForTasks(visible.map((t) => t.id));
  const depsMap: Record<string, string[]> = {};
  for (const [k, v] of depsMapRaw) depsMap[k] = v;

  // Nhân viên: ô lọc "Đơn vị" chỉ liệt kê đơn vị TRONG PHẠM VI (khớp phạm vi xem việc); vai trò khác = mọi đơn vị.
  const taskUnitScope = objectiveViewScope(user, units);
  const scopedUnits = taskUnitScope === null ? units : units.filter((u) => taskUnitScope.has(u.id));
  const unitOpts = scopedUnits.map((u) => ({ id: u.id, name: u.name, type: u.type, parent_id: u.parent_id, sort: u.sort }));
  // Chức danh hiển thị kèm tên (phân biệt người trùng tên khi chọn/giao việc) — helper CHUNG toàn hệ thống.
  const userOpts = users.map((u) => ({
    email: u.email,
    name: u.display_name || u.email,
    avatar: u.avatar_url,
    unit_id: u.unit_id,
    title: personTitle(u),
  }));

  // Tạo công việc mới ngay tại đây: MỌI người đều tạo được. Nhân viên (staff) chỉ tạo VIỆC CÁ NHÂN
  // cho mình (form gọn, ép owner=mình) → dùng `personalTask`. Quản lý dùng form đầy đủ: ô "Thuộc OKR"
  // chỉ liệt kê OKR kỳ hiện tại mà người này có quyền quản (để gắn việc hợp lệ).
  const personalTask = user.role === 'staff';
  let objOpts: { id: string; label: string }[] = [];
  if (!personalTask) {
    const period = await getCurrentPeriod();
    if (period) {
      const objs = await listObjectivesByPeriod(period.id);
      objOpts = objs
        .filter((o) => canEditObjective(user, { unit_id: o.unit_id, owner_email: o.owner_email, created_by: o.created_by }, units, access))
        .map((o) => ({ id: o.id, label: `${o.code ? o.code + ' · ' : ''}${o.unit_name ? '[' + o.unit_name + '] ' : ''}${o.title}` }));
    }
  }

  return (
    <>
      <SiteHeader active="tasks" />
      <div className="wrap">
        <div className="flexbtw">
          <div>
            <div className="pagetitle">Công việc<HelpTip k="tasks" /></div>
            <p className="subtitle">
              Toàn bộ dự án / tiểu dự án / công việc từ mọi OKR &amp; dự án — lọc theo nhiều chiều,
              bấm một dòng để cập nhật.
            </p>
          </div>
          <div>
            <NewTaskModal
              users={userOpts}
              units={unitOpts}
              projects={projects}
              objectives={objOpts}
              action={createTaskAction}
              personal={personalTask}
            />
          </div>
        </div>

        <TaskExplorer
          tasks={visible}
          depsMap={depsMap}
          currentEmail={user.email}
          seeAll={ctx.seeAll}
          totalAll={all.length}
          manageIds={manageIds}
          users={userOpts}
          units={unitOpts}
          projects={projects}
          objectiveOpts={objOpts}
          editAction={editInitiativeAction}
          deleteAction={deleteInitiativeAction}
          move={moveInitiativeAction}
          initialTaskId={searchParams.task}
          initialMine={!!searchParams.mine}
          initialStatus={searchParams.status}
          initialOverdue={!!searchParams.overdue}
        />
      </div>
    </>
  );
}
