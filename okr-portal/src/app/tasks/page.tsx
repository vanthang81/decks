import HelpTip from '@/components/HelpTip';
import SiteHeader from '@/components/SiteHeader';
import TaskExplorer from '@/components/TaskExplorer';
import { requireUser } from '@/lib/current-user';
import { listUnits } from '@/lib/org';
import { listUsers } from '@/lib/users';
import { listAllProjectOptions } from '@/lib/projects';
import { listAllInitiatives } from '@/lib/initiatives';
import { depsForTasks } from '@/lib/deps';
import { loadAccess, buildTaskViewCtx, canViewInitiative, canEditObjective } from '@/lib/access';
import { editInitiativeAction, deleteInitiativeAction, moveInitiativeAction } from '@/app/objectives/actions';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
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
      (t.meeting_secretary && t.meeting_secretary.toLowerCase() === emailLc),
    )
    .map((t) => t.id);

  // Phụ thuộc waterfall: map việc → danh sách predecessor (việc phải xong trước). Rỗng nếu chưa migrate.
  const depsMapRaw = await depsForTasks(visible.map((t) => t.id));
  const depsMap: Record<string, string[]> = {};
  for (const [k, v] of depsMapRaw) depsMap[k] = v;

  const unitOpts = units.map((u) => ({ id: u.id, name: u.name, type: u.type }));
  const userOpts = users.map((u) => ({
    email: u.email,
    name: u.display_name || u.email,
    avatar: u.avatar_url,
  }));

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
          editAction={editInitiativeAction}
          deleteAction={deleteInitiativeAction}
          move={moveInitiativeAction}
        />
      </div>
    </>
  );
}
