import HelpTip from '@/components/HelpTip';
import SiteHeader from '@/components/SiteHeader';
import TaskExplorer from '@/components/TaskExplorer';
import { requireUser } from '@/lib/current-user';
import { listUnits } from '@/lib/org';
import { listAllInitiatives } from '@/lib/initiatives';
import { loadAccess, buildTaskViewCtx, canViewInitiative } from '@/lib/access';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const user = await requireUser();
  const [access, units, all] = await Promise.all([loadAccess(), listUnits(), listAllInitiatives()]);
  const ctx = buildTaskViewCtx(user, all, units, access);
  const visible = all.filter((t) => canViewInitiative(user, t, ctx));

  return (
    <>
      <SiteHeader active="tasks" />
      <div className="wrap">
        <div className="flexbtw">
          <div>
            <div className="pagetitle">Công việc<HelpTip k="tasks" /></div>
            <p className="subtitle">
              Toàn bộ dự án / tiểu dự án / công việc từ mọi OKR &amp; dự án — lọc theo nhiều chiều.
            </p>
          </div>
        </div>

        <TaskExplorer
          tasks={visible}
          currentEmail={user.email}
          seeAll={ctx.seeAll}
          totalAll={all.length}
        />
      </div>
    </>
  );
}
