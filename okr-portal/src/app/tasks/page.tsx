import HelpTip from '@/components/HelpTip';
import SiteHeader from '@/components/SiteHeader';
import TaskExplorer from '@/components/TaskExplorer';
import { requireUser } from '@/lib/current-user';
import { listUnits } from '@/lib/org';
import { listUsers } from '@/lib/users';
import { listAllProjectOptions } from '@/lib/projects';
import { listAllInitiatives } from '@/lib/initiatives';
import { loadAccess, buildTaskViewCtx, canViewInitiative, canEditObjective } from '@/lib/access';
import { editInitiativeAction, deleteInitiativeAction } from '@/app/objectives/actions';

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

  // Việc mà user có quyền QUẢN LÝ (sửa mọi trường + xoá) = quản OKR gốc của việc.
  const manageIds = visible
    .filter((t) =>
      canEditObjective(
        user,
        { unit_id: t.objective_unit_id, owner_email: t.objective_owner, created_by: t.objective_created_by },
        units,
        access,
      ),
    )
    .map((t) => t.id);

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
          currentEmail={user.email}
          seeAll={ctx.seeAll}
          totalAll={all.length}
          manageIds={manageIds}
          users={userOpts}
          units={unitOpts}
          projects={projects}
          editAction={editInitiativeAction}
          deleteAction={deleteInitiativeAction}
        />
      </div>
    </>
  );
}
