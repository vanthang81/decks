import HelpTip from '@/components/HelpTip';
import SiteHeader from '@/components/SiteHeader';
import ProjectsList from '@/components/ProjectsList';
import PeriodPicker from '@/components/PeriodPicker';
import { requireUser } from '@/lib/current-user';
import { listUnits } from '@/lib/org';
import { listUsers } from '@/lib/users';
import {
  getCurrentPeriod,
  listPeriods,
  getPeriod,
  orderPeriodsHierarchically,
  PERIOD_KIND_LABEL,
} from '@/lib/periods';
import {
  listProjectsByPeriod,
  canCreateProject,
  PROJECT_STATUS_LABEL,
} from '@/lib/projects';
import { loadAccess } from '@/lib/access';
import { createProjectAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const user = await requireUser();
  const periods = await listPeriods();
  const period = searchParams.period
    ? await getPeriod(searchParams.period)
    : (await getCurrentPeriod()) ?? periods[0] ?? null;

  const projects = period ? await listProjectsByPeriod(period.id) : [];
  const units = await listUnits();
  const users = await listUsers();
  const canCreate = canCreateProject(user, await loadAccess());
  const divisionUnits = units.filter((u) => u.type === 'division');
  const deptUnits = units.filter((u) => u.type === 'department');

  return (
    <>
      <SiteHeader active="projects" />
      <div className="wrap">
        <div className="flexbtw">
          <div>
            <div className="pagetitle">Dự án<HelpTip k="projects" /></div>
            <p className="subtitle">
              Dự án độc lập, xuyên nhiều OKR/khối. Gắn công việc từ các OKR vào một dự án để quản trị tập trung.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', flex: '0 0 auto' }}>
            <PeriodPicker
              periods={orderPeriodsHierarchically(periods).map(({ period: p, depth }) => ({
                id: p.id,
                label: `${PERIOD_KIND_LABEL[p.kind]}: ${p.name}`,
                depth,
                isCurrent: p.is_current,
              }))}
              currentId={period?.id ?? null}
              basePath="/projects"
            />
          </div>
        </div>

        {period && projects.length > 0 && <ProjectsList projects={projects} />}

        {period && projects.length === 0 && (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>
              Kỳ này chưa có dự án nào. {canCreate ? 'Tạo dự án đầu tiên bên dưới.' : ''}
            </p>
          </div>
        )}
        {!period && <div className="card"><p className="muted" style={{ margin: 0 }}>Chưa có kỳ OKR.</p></div>}

        {canCreate && period && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>＋ Dự án mới</h3>
            <form action={createProjectAction}>
              <input type="hidden" name="period_id" value={period.id} />
              <label className="f">Tên dự án</label>
              <input className="i" name="name" required placeholder="VD: Khai trương chuỗi cửa hàng Q3" />
              <div className="row">
                <div>
                  <label className="f">Chủ trì (cá nhân)</label>
                  <select className="i" name="owner_email" defaultValue={user.email}>
                    {users.map((u) => (
                      <option key={u.email} value={u.email}>
                        {u.display_name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="f">Đơn vị chủ trì (Khối / Phòng)</label>
                  <select className="i" name="unit_id" defaultValue="">
                    <option value="">— Không gắn —</option>
                    {divisionUnits.length > 0 && (
                      <optgroup label="Khối">
                        {divisionUnits.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {deptUnits.length > 0 && (
                      <optgroup label="Phòng ban">
                        {deptUnits.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div>
                  <label className="f">Trạng thái</label>
                  <select className="i" name="status" defaultValue="active">
                    {(Object.keys(PROJECT_STATUS_LABEL) as (keyof typeof PROJECT_STATUS_LABEL)[]).map((s) => (
                      <option key={s} value={s}>{PROJECT_STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="row">
                <div>
                  <label className="f">Bắt đầu</label>
                  <input className="i" type="date" name="start_on" />
                </div>
                <div>
                  <label className="f">Hạn</label>
                  <input className="i" type="date" name="due_on" />
                </div>
                <div>
                  <label className="f">NS kế hoạch (VND)</label>
                  <input className="i" name="budget_planned" defaultValue="0" />
                </div>
              </div>
              <label className="f">Mô tả</label>
              <textarea className="i" name="description" placeholder="Mục tiêu, phạm vi dự án…" />
              <div style={{ marginTop: 12 }}>
                <button className="btn" type="submit">Tạo dự án</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
