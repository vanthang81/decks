import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import { ProgressBar } from '@/components/ui';
import ExecutionTabs from '@/components/ExecutionTabs';
import ProjectEditButton from '@/components/ProjectEditButton';
import AddTaskToProject from '@/components/AddTaskToProject';
import HelpTip from '@/components/HelpTip';
import { requireUser } from '@/lib/current-user';
import { listObjectivesWithKrs } from '@/lib/okr';
import { listUnits } from '@/lib/org';
import { listUsers } from '@/lib/users';
import {
  getProject,
  canManageProject,
  listProjectOptions,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_CLS,
} from '@/lib/projects';
import { listInitiativesForProject } from '@/lib/initiatives';
import { fmtVnd, fmtDate } from '@/lib/format';
import {
  editInitiativeAction,
  deleteInitiativeAction,
  createInitiativeAction,
  moveInitiativeAction,
} from '../../objectives/actions';
import { updateProjectAction, deleteProjectAction, createProjectForInitiativeAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function ProjectDetail({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const p = await getProject(params.id);
  if (!p) notFound();

  const [tasks, units, users] = await Promise.all([
    listInitiativesForProject(p.id),
    listUnits(),
    listUsers(),
  ]);
  const canManage = canManageProject(user, p, units);
  const projectOpts = p.period_id ? await listProjectOptions(p.period_id) : [];
  const objectiveOpts = p.period_id ? await listObjectivesWithKrs(p.period_id) : [];
  const personOpts = users.map((u) => ({ email: u.email, name: u.display_name || u.email, avatar: u.avatar_url }));
  const unitOpts = units.filter((u) => u.type !== 'company').map((u) => ({ id: u.id, name: u.name, type: u.type }));

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
                {p.owner_name ? `Chủ trì: ${p.owner_name} · ` : ''}
                {p.task_count} việc ({p.done_count} xong)
                {p.start_on || p.due_on
                  ? ` · ${p.start_on ? fmtDate(p.start_on) : ''}${p.due_on ? ' → ' + fmtDate(p.due_on) : ''}`
                  : ''}
              </div>
              {p.description && <p style={{ marginBottom: 0 }}>{p.description}</p>}
            </div>
            <div style={{ width: 210, textAlign: 'right', flexShrink: 0 }}>
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
          {tasks.length === 0 ? (
            <p className="muted">
              Chưa có việc nào. Mở một OKR → mục “Dự án &amp; Kế hoạch hành động” → bấm việc → tick “🗂 Thuộc dự án” và chọn dự án này.
            </p>
          ) : (
            <ExecutionTabs
              initiatives={tasks}
              canManage={user.role === 'exec' || canManage}
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
              manageStructure={false}
              context="project"
            >
              <></>
            </ExecutionTabs>
          )}
        </div>
      </div>
    </>
  );
}
