import HelpTip from '@/components/HelpTip';
import SiteHeader from '@/components/SiteHeader';
import ProjectsList from '@/components/ProjectsList';
import SearchSelect from '@/components/SearchSelect';
import NumberInput from '@/components/NumberInput';
import PeriodPicker from '@/components/PeriodPicker';
import { requireUser } from '@/lib/current-user';
import { listUnits } from '@/lib/org';
import { unitTreeOptions } from '@/lib/unit-options';
import { listUsers, personTitle } from '@/lib/users';
import {
  getCurrentPeriod,
  listPeriods,
  getPeriod,
  orderPeriodsHierarchically,
  PERIOD_KIND_LABEL,
} from '@/lib/periods';
import {
  listProjectsInPeriodWindow,
  canCreateProject,
  PROJECT_STATUS_LABEL,
} from '@/lib/projects';
import { loadAccess } from '@/lib/access';
import EditModal from '@/components/EditModal';
import NavIcon from '@/components/NavIcon';
import { createProjectInlineAction } from './actions';

// Ô nhập form dự án — dùng trong popup "Dự án mới".
function ProjectFields({
  periodId, user, users, unitOptions,
}: {
  periodId: string;
  user: { email: string };
  users: { email: string; display_name: string | null; role?: string | null; unit_name?: string | null; unit_type?: string | null }[];
  unitOptions: { value: string; label: string }[];
}) {
  return (
    <>
      <input type="hidden" name="period_id" value={periodId} />
      <label className="f">Tên dự án</label>
      <input className="i" name="name" required placeholder="VD: Khai trương chuỗi cửa hàng Q3" />
      <div className="row">
        <div>
          <label className="f">Chủ trì (cá nhân)</label>
          <SearchSelect name="owner_email" defaultValue={user.email}
            options={users.map((u) => ({ value: u.email, label: u.display_name || u.email, sub: personTitle(u) ?? undefined }))} />
        </div>
        <div>
          <label className="f">Đơn vị chủ trì (Khối / Phòng)</label>
          <SearchSelect name="unit_id" defaultValue="" emptyLabel="— Không gắn —"
            options={unitOptions} />
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
        <div><label className="f">Bắt đầu</label><input className="i" type="date" name="start_on" /></div>
        <div><label className="f">Hạn</label><input className="i" type="date" name="due_on" /></div>
        <div><label className="f">NS kế hoạch (VND)</label><NumberInput name="budget_planned" defaultValue="0" /></div>
      </div>
      <label className="f">Mô tả</label>
      <textarea className="i" name="description" placeholder="Mục tiêu, phạm vi dự án…" />
    </>
  );
}

export const dynamic = 'force-dynamic';

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { period?: string; owner?: string };
}) {
  const user = await requireUser();
  const periods = await listPeriods();
  const period = searchParams.period
    ? await getPeriod(searchParams.period)
    : (await getCurrentPeriod()) ?? periods[0] ?? null;

  const projects = period ? await listProjectsInPeriodWindow(period) : [];
  const units = await listUnits();
  const users = await listUsers();
  const canCreate = canCreateProject(user, await loadAccess());
  const unitOptions = unitTreeOptions(units, { excludeCompany: true });

  return (
    <>
      <SiteHeader active="projects" />
      <div className="wrap">
        <div className="flexbtw">
          <div>
            <div className="pagetitle">Dự án<HelpTip k="projects" /></div>
            <p className="subtitle">
              Dự án độc lập, xuyên nhiều OKR/khối. Gắn công việc từ các OKR vào một dự án để quản trị tập trung.
              Dự án có <b>ngày bắt đầu–hạn</b> sẽ hiển thị ở <b>mọi kỳ (tháng/quý/năm)</b> nằm trong khoảng đó.
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
            {canCreate && period && (
              <span data-tour="projects-new" style={{ display: 'inline-flex' }}>
                <EditModal title="Tạo dự án mới" label="Dự án mới" icon={<NavIcon name="plus" />} submitLabel="Tạo dự án" action={createProjectInlineAction} wide
                  dupField="name" dupLabel="dự án" dupValues={projects.map((p) => p.name)}>
                  <ProjectFields periodId={period.id} user={user} users={users} unitOptions={unitOptions} />
                </EditModal>
              </span>
            )}
          </div>
        </div>

        {period && projects.length > 0 && <div data-tour="projects-list"><ProjectsList projects={projects} initialOwner={searchParams.owner} /></div>}

        {period && projects.length === 0 && (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>
              Kỳ này chưa có dự án nào. {canCreate ? 'Bấm "Dự án mới" ở góc phải-trên để tạo.' : ''}
            </p>
          </div>
        )}
        {!period && <div className="card"><p className="muted" style={{ margin: 0 }}>Chưa có kỳ OKR.</p></div>}

      </div>
    </>
  );
}
