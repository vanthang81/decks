import Link from 'next/link';
import UserLink from '@/components/UserLink';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import { ProgressBar } from '@/components/ui';
import ExecutionTabs from '@/components/ExecutionTabs';
import ProjectEditButton from '@/components/ProjectEditButton';
import ActivityLogButton from '@/components/ActivityLogButton';
import { loadEntityAuditAction } from '@/app/audit/actions';
import AddTaskToProject from '@/components/AddTaskToProject';
import ProjectReportView from '@/components/ProjectReport';
import ProjectDocs from '@/components/ProjectDocs';
import { buildProjectReport } from '@/lib/project-report';
import { listProjectDocs } from '@/lib/project-docs';
import HelpTip from '@/components/HelpTip';
import { requireUser } from '@/lib/current-user';
import { listObjectivesWithKrs } from '@/lib/okr';
import { listUnits } from '@/lib/org';
import { listUsers, personTitle } from '@/lib/users';
import { isExec } from '@/lib/rbac';
import {
  getProject,
  canManageProject,
  listProjectOptions,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_CLS,
} from '@/lib/projects';
import { listInitiativesForProject } from '@/lib/initiatives';
import { listMeetingOptions } from '@/lib/meetings';
import { StackedBar } from '@/components/charts';
import { loadAccess } from '@/lib/access';
import { fmtVnd, fmtDate } from '@/lib/format';
import {
  editInitiativeAction,
  deleteInitiativeAction,
  createInitiativeAction,
  moveInitiativeAction,
} from '../../objectives/actions';
import { updateProjectAction, deleteProjectAction, createProjectForInitiativeAction, saveProjectCharterAction, addProjectDocAction, deleteProjectDocAction } from '../actions';
import EditModal from '@/components/EditModal';
import NavIcon from '@/components/NavIcon';
import { CHARTER_FIELDS, charterFilled, type Charter } from '@/lib/charter';

// Ô nhập điều lệ dự án (dùng trong popup Sửa điều lệ).
function CharterFields({ id, charter }: { id: string; charter: Charter }) {
  return (
    <>
      <input type="hidden" name="id" value={id} />
      {CHARTER_FIELDS.map((f) => (
        <div key={f.key}>
          <label className="f">{f.label}</label>
          <textarea className="i" name={`ch_${f.key}`} rows={f.rows} defaultValue={charter[f.key] ?? ''} placeholder={f.ph} />
        </div>
      ))}
    </>
  );
}

// Hiển thị 1 trường điều lệ: trường "list" render mỗi dòng thành gạch đầu dòng.
function CharterValue({ value, list }: { value: string; list: boolean }) {
  const lines = value.split('\n').map((s) => s.trim()).filter(Boolean);
  if (list && lines.length > 1) return <ul className="charter-ul">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>;
  return <p className="charter-p">{value}</p>;
}

export const dynamic = 'force-dynamic';

export default async function ProjectDetail({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const p = await getProject(params.id);
  if (!p) notFound();

  const [tasks, units, users, docs] = await Promise.all([
    listInitiativesForProject(p.id),
    listUnits(),
    listUsers(),
    listProjectDocs(p.id),
  ]);
  const canManage = canManageProject(user, p, units, await loadAccess());
  const projectOpts = p.period_id ? await listProjectOptions(p.period_id) : [];
  const meetingOpts = await listMeetingOptions(user);
  const objectiveOpts = p.period_id ? await listObjectivesWithKrs(p.period_id) : [];
  const personOpts = users.map((u) => ({ email: u.email, name: u.display_name || u.email, avatar: u.avatar_url, unit_id: u.unit_id, title: personTitle(u) }));
  const unitOpts = units.filter((u) => u.type !== 'company').map((u) => ({ id: u.id, name: u.name, type: u.type, parent_id: u.parent_id, sort: u.sort }));

  // Tổng quan trạng thái công việc của dự án.
  const TS_C: Record<string, string> = { todo: '#94a3b8', in_progress: '#2563eb', blocked: '#dc2626', done: '#16a34a', canceled: '#cbd5e1' };
  const TS_L: Record<string, string> = { todo: 'Chưa làm', in_progress: 'Đang làm', blocked: 'Vướng', done: 'Xong', canceled: 'Huỷ' };
  const tsCount: Record<string, number> = {};
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  let overdueCount = 0;
  for (const t of tasks) {
    tsCount[t.status] = (tsCount[t.status] ?? 0) + 1;
    if (t.due_on && t.due_on < todayStr && t.status !== 'done' && t.status !== 'canceled') overdueCount++;
  }
  const report = buildProjectReport(tasks, todayStr);

  return (
    <>
      <SiteHeader active="projects" />
      <div className="wrap">
        <p className="subtitle" style={{ marginBottom: 6 }}>
          <Link href="/projects">← Tất cả dự án</Link>
        </p>

        <div className="card">
          <div className="flexbtw">
            <div style={{ minWidth: 0 }}>
              <div style={{ marginBottom: 6 }}>
                {p.code && <span className="okr-code" style={{ marginRight: 8 }}>{p.code}</span>}
                <span className={`badge ${PROJECT_STATUS_CLS[p.status]}`}>
                  {PROJECT_STATUS_LABEL[p.status]}
                </span>
              </div>
              <div className="pagetitle" style={{ margin: 0 }}>{p.name}<HelpTip k="projects" /></div>
              <div className="obj-meta" style={{ marginTop: 4 }}>
                {p.unit_name ? `🏢 ${p.unit_name} · ` : ''}
                {p.owner_email ? <>Chủ trì: <UserLink email={p.owner_email} name={p.owner_name ?? p.owner_email} /> · </> : ''}
                {p.task_count} việc ({p.done_count} xong)
                {p.start_on || p.due_on
                  ? ` · ${p.start_on ? fmtDate(p.start_on) : ''}${p.due_on ? ' → ' + fmtDate(p.due_on) : ''}`
                  : ''}
              </div>
              {p.description && <p style={{ marginBottom: 0 }}>{p.description}</p>}
            </div>
            <div style={{ width: 210, textAlign: 'right', flexShrink: 0 }}>
              <div style={{ marginBottom: 8, display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <ActivityLogButton entity="project" entityId={p.id} load={loadEntityAuditAction} />
              </div>
              {canManage && (
                <div style={{ marginBottom: 8 }}>
                  <ProjectEditButton
                    project={{
                      id: p.id,
                      name: p.name,
                      description: p.description,
                      owner_email: p.owner_email,
                      unit_id: p.unit_id,
                      status: p.status,
                      start_on: p.start_on,
                      due_on: p.due_on,
                      budget_planned: p.budget_planned,
                      budget_actual: p.budget_actual,
                    }}
                    users={personOpts}
                    units={unitOpts}
                    save={updateProjectAction}
                    del={deleteProjectAction}
                  />
                </div>
              )}
              <div style={{ fontSize: 34, fontWeight: 700, color: 'var(--primary)' }}>
                {p.progress.toFixed(0)}%
              </div>
              <ProgressBar value={p.progress} lg />
              <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
                NS kế hoạch {fmtVnd(p.budget_planned)}
                <br />
                Đã chi (gom việc) {fmtVnd(p.task_budget_actual)}
              </div>
            </div>
          </div>
        </div>

        {/* ---- Báo cáo tiến độ: (1) Tổng dự án · (2) Theo thời gian ---- */}
        <ProjectReportView report={report} />

        {/* ---- Điều lệ dự án (Project Charter) ---- */}
        <div className="card">
          <div className="flexbtw flexbtw-top">
            <h3 style={{ marginTop: 0 }}>Điều lệ dự án (Project Charter)<HelpTip k="project-charter" /></h3>
            {canManage && (
              <EditModal
                title="Điều lệ dự án (Project Charter)"
                label={charterFilled(p.charter) ? 'Sửa điều lệ' : 'Khai báo điều lệ'}
                icon={<NavIcon name="pencil" />}
                submitLabel="Lưu điều lệ"
                action={saveProjectCharterAction}
                wide
              >
                <CharterFields id={p.id} charter={p.charter} />
              </EditModal>
            )}
          </div>
          {charterFilled(p.charter) ? (
            <div className="charter-grid">
              {CHARTER_FIELDS.filter((f) => (p.charter[f.key] ?? '').trim()).map((f) => (
                <div key={f.key} className="charter-item">
                  <div className="charter-k">{f.label}</div>
                  <CharterValue value={p.charter[f.key]!.trim()} list={f.list} />
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Chưa khai báo điều lệ. {canManage ? 'Bấm "Khai báo điều lệ" ở góc phải-trên để nhập mục tiêu · phạm vi · sản phẩm bàn giao · cột mốc · các bên liên quan · rủi ro · tiêu chí thành công.' : 'Điều lệ dự án sẽ hiển thị tại đây khi được khai báo.'}
            </p>
          )}
        </div>

        {/* ---- Việc thuộc dự án: List / Kanban / Dòng thời gian + bấm để sửa ---- */}
        <div className="card">
          <div className="flexbtw" style={{ alignItems: 'flex-start', gap: 10 }}>
            <h3 style={{ marginTop: 0 }}>Công việc thuộc dự án ({tasks.length})</h3>
            {canManage && (
              <AddTaskToProject
                projectId={p.id}
                objectives={objectiveOpts}
                users={personOpts}
                units={unitOpts}
                create={createInitiativeAction}
              />
            )}
          </div>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
            Gom từ nhiều OKR/khối. Bấm một việc để mở &amp; sửa (đổi trạng thái/tiến độ/người giao…).
            Chip <b>🎯</b> là OKR gốc — mở việc để nhảy sâu hơn. Thêm việc sẽ gắn vào OKR/KR bộ phận đã chọn.
          </p>
          {tasks.length > 0 && (
            <div className="task-summary">
              <StackedBar
                segments={['done', 'in_progress', 'blocked', 'todo', 'canceled']
                  .filter((s) => tsCount[s])
                  .map((s) => ({ value: tsCount[s], color: TS_C[s], label: TS_L[s] }))}
                height={10}
              />
              <div className="ts-legend">
                {['done', 'in_progress', 'blocked', 'todo'].map((s) =>
                  tsCount[s] ? (
                    <span className="ts-chip" key={s}>
                      <span className="lg-dot" style={{ background: TS_C[s] }} /> {TS_L[s]} {tsCount[s]}
                    </span>
                  ) : null,
                )}
                {overdueCount > 0 && <span className="badge red">⚠ {overdueCount} quá hạn</span>}
              </div>
            </div>
          )}
          {tasks.length === 0 ? (
            <p className="muted">
              Chưa có việc nào. Mở một OKR → mục “Dự án &amp; Kế hoạch hành động” → bấm việc → tick “🗂 Thuộc dự án” và chọn dự án này.
            </p>
          ) : (
            <ExecutionTabs
              initiatives={tasks}
              canManage={isExec(user.role) || canManage}
              currentEmail={user.email}
              move={moveInitiativeAction}
              save={editInitiativeAction}
              del={deleteInitiativeAction}
              createChild={createInitiativeAction}
              createProjectForInit={createProjectForInitiativeAction}
              objectiveId=""
              users={personOpts}
              units={unitOpts}
              projects={projectOpts}
              meetings={meetingOpts}
              objectives={objectiveOpts}
              manageStructure={false}
              context="project"
            >
              <></>
            </ExecutionTabs>
          )}
        </div>

        {/* ---- Thư viện tài liệu dự án (list link) ---- */}
        <ProjectDocs
          projectId={p.id}
          docs={docs}
          canManage={canManage}
          add={addProjectDocAction}
          del={deleteProjectDocAction}
        />
      </div>
    </>
  );
}
