'use server';

import { parseNum } from '@/lib/num';
import { revalidatePath } from 'next/cache';
import { logAudit } from '@/lib/audit';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/current-user';
import { listUnits } from '@/lib/org';
import {
  createProject,
  updateProject,
  deleteProject,
  getProject,
  setProjectCharter,
  setInitiativeProject,
  canCreateProject,
  canManageProject,
  type ProjectStatus,
} from '@/lib/projects';
import { getInitiative, canUpdateInitiative } from '@/lib/initiatives';
import { getObjective } from '@/lib/okr';
import { loadAccess, canEditObjective } from '@/lib/access';

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? '').trim();
}
function num(fd: FormData, k: string, def = 0): number {
  return parseNum(fd.get(k), def);
}
function orNull(s: string): string | null {
  return s === '' ? null : s;
}

export async function createProjectAction(fd: FormData) {
  const user = await requireUser();
  if (!canCreateProject(user, await loadAccess())) throw new Error('Bạn không có quyền tạo dự án.');
  const name = str(fd, 'name');
  if (!name) throw new Error('Thiếu tên dự án.');
  const id = await createProject({
    period_id: orNull(str(fd, 'period_id')),
    name,
    description: orNull(str(fd, 'description')),
    owner_email: orNull(str(fd, 'owner_email')) ?? user.email,
    unit_id: orNull(str(fd, 'unit_id')),
    status: (str(fd, 'status') || 'active') as ProjectStatus,
    start_on: orNull(str(fd, 'start_on')),
    due_on: orNull(str(fd, 'due_on')),
    budget_planned: num(fd, 'budget_planned'),
    budget_actual: num(fd, 'budget_actual'),
    created_by: user.email,
  });
  await logAudit({ actor: user.email, action: 'project.create', entity: 'project', entityId: id, detail: { title: name } });
  redirect(`/projects/${id}`);
}

// Bản dùng cho popup "Dự án mới" (EditModal): tạo xong KHÔNG redirect (tránh vỡ luồng client),
// chỉ revalidate để dự án mới hiện ngay trong danh sách + popup tự đóng.
export async function createProjectInlineAction(fd: FormData) {
  const user = await requireUser();
  if (!canCreateProject(user, await loadAccess())) throw new Error('Bạn không có quyền tạo dự án.');
  const name = str(fd, 'name');
  if (!name) throw new Error('Thiếu tên dự án.');
  await createProject({
    period_id: orNull(str(fd, 'period_id')),
    name,
    description: orNull(str(fd, 'description')),
    owner_email: orNull(str(fd, 'owner_email')) ?? user.email,
    unit_id: orNull(str(fd, 'unit_id')),
    status: (str(fd, 'status') || 'active') as ProjectStatus,
    start_on: orNull(str(fd, 'start_on')),
    due_on: orNull(str(fd, 'due_on')),
    budget_planned: num(fd, 'budget_planned'),
    budget_actual: num(fd, 'budget_actual'),
    created_by: user.email,
  });
  revalidatePath('/projects');
}

export async function updateProjectAction(fd: FormData) {
  const user = await requireUser();
  const units = await listUnits();
  const id = str(fd, 'id');
  const p = await getProject(id);
  if (!p) throw new Error('Không tìm thấy dự án.');
  if (!canManageProject(user, p, units, await loadAccess()))
    throw new Error('Bạn không có quyền sửa dự án này.');
  await updateProject(id, {
    name: str(fd, 'name') || p.name,
    description: orNull(str(fd, 'description')),
    owner_email: orNull(str(fd, 'owner_email')),
    unit_id: orNull(str(fd, 'unit_id')),
    status: (str(fd, 'status') || 'active') as ProjectStatus,
    start_on: orNull(str(fd, 'start_on')),
    due_on: orNull(str(fd, 'due_on')),
    budget_planned: num(fd, 'budget_planned'),
    budget_actual: num(fd, 'budget_actual'),
  });
  await logAudit({ actor: user.email, action: 'project.update', entity: 'project', entityId: id, detail: { title: str(fd, 'name') || p.name } });
  revalidatePath(`/projects/${id}`);
  revalidatePath('/projects');
}

export async function saveProjectCharterAction(fd: FormData) {
  const user = await requireUser();
  const units = await listUnits();
  const id = str(fd, 'id');
  const p = await getProject(id);
  if (!p) throw new Error('Không tìm thấy dự án.');
  if (!canManageProject(user, p, units, await loadAccess()))
    throw new Error('Bạn không có quyền sửa điều lệ dự án này.');
  const { CHARTER_FIELDS } = await import('@/lib/charter');
  const charter: Record<string, string> = {};
  for (const f of CHARTER_FIELDS) {
    const v = str(fd, `ch_${f.key}`);
    if (v) charter[f.key] = v;
  }
  await setProjectCharter(id, charter);
  revalidatePath(`/projects/${id}`);
}

export async function deleteProjectAction(fd: FormData) {
  const user = await requireUser();
  const units = await listUnits();
  const id = str(fd, 'id');
  const p = await getProject(id);
  if (!p) return;
  if (!canManageProject(user, p, units, await loadAccess()))
    throw new Error('Bạn không có quyền xoá dự án này.');
  await logAudit({ actor: user.email, action: 'project.delete', entity: 'project', entityId: id, detail: { title: p.name } });
  await deleteProject(id);
  redirect('/projects');
}

// ---- Thư viện tài liệu dự án (list link) ----
export async function addProjectDocAction(fd: FormData) {
  const user = await requireUser();
  const units = await listUnits();
  const projectId = str(fd, 'project_id');
  const p = await getProject(projectId);
  if (!p) throw new Error('Không tìm thấy dự án.');
  if (!canManageProject(user, p, units, await loadAccess()))
    throw new Error('Bạn không có quyền thêm tài liệu cho dự án này.');
  const title = str(fd, 'title');
  let url = str(fd, 'url');
  if (!title || !url) throw new Error('Cần nhập tên tài liệu và đường link.');
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`; // tự thêm scheme cho gọn
  const { addProjectDoc } = await import('@/lib/project-docs');
  await addProjectDoc({ project_id: projectId, title, url, note: orNull(str(fd, 'note')), created_by: user.email });
  await logAudit({ actor: user.email, action: 'project.doc_add', entity: 'project', entityId: projectId, detail: { title } });
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProjectDocAction(fd: FormData) {
  const user = await requireUser();
  const units = await listUnits();
  const projectId = str(fd, 'project_id');
  const p = await getProject(projectId);
  if (!p) return;
  if (!canManageProject(user, p, units, await loadAccess()))
    throw new Error('Bạn không có quyền xoá tài liệu của dự án này.');
  const { getProjectDoc, deleteProjectDoc } = await import('@/lib/project-docs');
  const id = str(fd, 'id');
  const doc = await getProjectDoc(id);
  if (!doc || doc.project_id !== projectId) return; // chống xoá chéo dự án
  await deleteProjectDoc(id);
  await logAudit({ actor: user.email, action: 'project.doc_delete', entity: 'project', entityId: projectId, detail: { title: doc.title } });
  revalidatePath(`/projects/${projectId}`);
}

// ---- Thành viên dự án (phân quyền xem) ----
export async function addProjectMemberAction(fd: FormData) {
  const user = await requireUser();
  const units = await listUnits();
  const projectId = str(fd, 'project_id');
  const p = await getProject(projectId);
  if (!p) throw new Error('Không tìm thấy dự án.');
  if (!canManageProject(user, p, units, await loadAccess()))
    throw new Error('Bạn không có quyền thêm thành viên cho dự án này.');
  const email = str(fd, 'email');
  if (!email) throw new Error('Chưa chọn người để thêm.');
  const { addProjectMember } = await import('@/lib/project-members');
  await addProjectMember(projectId, email, user.email);
  await logAudit({ actor: user.email, action: 'project.member_add', entity: 'project', entityId: projectId, detail: { email } });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/projects');
}

export async function removeProjectMemberAction(fd: FormData) {
  const user = await requireUser();
  const units = await listUnits();
  const projectId = str(fd, 'project_id');
  const p = await getProject(projectId);
  if (!p) return;
  if (!canManageProject(user, p, units, await loadAccess()))
    throw new Error('Bạn không có quyền gỡ thành viên của dự án này.');
  const email = str(fd, 'email');
  const { removeProjectMember } = await import('@/lib/project-members');
  await removeProjectMember(projectId, email);
  await logAudit({ actor: user.email, action: 'project.member_remove', entity: 'project', entityId: projectId, detail: { email } });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/projects');
}

// ---- Thêm VIỆC vào dự án — OKR TUỲ CHỌN (CFO 08/09) ----
// Việc chỉ cần thuộc DỰ ÁN; quyền dựa trên canManageProject. Nếu CÓ chọn OKR thì thêm điều kiện
// quyền sửa OKR đó (để việc hiện cả ở action-plan của OKR). Không chọn OKR → việc thuần thuộc dự án.
export async function createProjectTaskAction(fd: FormData) {
  const user = await requireUser();
  const [units, access] = await Promise.all([listUnits(), loadAccess()]);
  const projectId = str(fd, 'project_id');
  const p = await getProject(projectId);
  if (!p) throw new Error('Không tìm thấy dự án.');
  // MỨC 2 (CFO 10/09): thành viên dự án được TỰ THÊM việc vào dự án mình tham gia (không cần quyền quản lý).
  const { isProjectMember } = await import('@/lib/project-members');
  if (!canManageProject(user, p, units, access) && !(await isProjectMember(projectId, user.email)))
    throw new Error('Bạn không có quyền thêm việc vào dự án này.');
  const title = str(fd, 'title');
  if (!title) throw new Error('Thiếu tên việc.');
  const objectiveId = orNull(str(fd, 'objective_id'));
  let keyResultId: string | null = null;
  if (objectiveId) {
    const obj = await getObjective(objectiveId);
    if (!obj) throw new Error('Không tìm thấy OKR.');
    if (!canEditObjective(user, obj, units, access)) throw new Error('Bạn không có quyền gắn việc vào OKR này.');
    keyResultId = orNull(str(fd, 'key_result_id'));
  }
  const { createInitiative } = await import('@/lib/initiatives');
  await createInitiative({
    objective_id: objectiveId, key_result_id: keyResultId, parent_id: null, kind: 'action',
    title, description: null, owner_email: orNull(str(fd, 'owner_email')), unit_id: orNull(str(fd, 'unit_id')),
    project_id: projectId, status: 'todo', priority: (str(fd, 'priority') || 'medium') as 'low' | 'medium' | 'high',
    start_on: null, due_on: orNull(str(fd, 'due_on')), budget_planned: 0, budget_actual: 0,
    budget_source: null, expected_output: orNull(str(fd, 'expected_output')), created_by: user.email,
  });
  await logAudit({ actor: user.email, action: 'initiative.create', entity: 'project', entityId: projectId, detail: { title } });
  if (objectiveId) revalidatePath(`/objectives/${objectiveId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/tasks');
}

// Thêm NHIỀU việc cùng lúc vào dự án (1 lần lưu). OKR/KR (nếu có) dùng chung cho cả loạt;
// mỗi dòng có tên/người giao/ưu tiên/hạn riêng. Bỏ qua dòng trống tên.
export async function createProjectTasksBulkAction(fd: FormData) {
  const user = await requireUser();
  const [units, access] = await Promise.all([listUnits(), loadAccess()]);
  const projectId = str(fd, 'project_id');
  const p = await getProject(projectId);
  if (!p) throw new Error('Không tìm thấy dự án.');
  // MỨC 2 (CFO 10/09): thành viên dự án được TỰ THÊM việc (kể cả thêm nhiều việc) vào dự án mình tham gia.
  const { isProjectMember } = await import('@/lib/project-members');
  if (!canManageProject(user, p, units, access) && !(await isProjectMember(projectId, user.email)))
    throw new Error('Bạn không có quyền thêm việc vào dự án này.');

  type Row = { title?: string; expected_output?: string; owner_email?: string; priority?: string; due_on?: string };
  let rows: Row[] = [];
  try { rows = JSON.parse(str(fd, 'rows') || '[]'); } catch { throw new Error('Dữ liệu danh sách việc không hợp lệ.'); }
  const clean = rows
    .map((r) => ({
      title: (r.title ?? '').trim(),
      expected_output: (r.expected_output ?? '').trim() || null,
      owner_email: (r.owner_email ?? '').trim() || null,
      priority: (['low', 'medium', 'high'].includes(r.priority ?? '') ? r.priority : 'medium') as 'low' | 'medium' | 'high',
      due_on: (r.due_on ?? '').trim() || null,
    }))
    .filter((r) => r.title);
  if (clean.length === 0) throw new Error('Chưa nhập việc nào (cần ít nhất 1 tên việc).');

  const objectiveId = orNull(str(fd, 'objective_id'));
  let keyResultId: string | null = null;
  if (objectiveId) {
    const obj = await getObjective(objectiveId);
    if (!obj) throw new Error('Không tìm thấy OKR.');
    if (!canEditObjective(user, obj, units, access)) throw new Error('Bạn không có quyền gắn việc vào OKR này.');
    keyResultId = orNull(str(fd, 'key_result_id'));
  }
  const { createInitiative } = await import('@/lib/initiatives');
  for (const r of clean) {
    await createInitiative({
      objective_id: objectiveId, key_result_id: keyResultId, parent_id: null, kind: 'action',
      title: r.title, description: null, owner_email: r.owner_email, unit_id: null,
      project_id: projectId, status: 'todo', priority: r.priority,
      start_on: null, due_on: r.due_on, budget_planned: 0, budget_actual: 0,
      budget_source: null, expected_output: r.expected_output, created_by: user.email,
    });
  }
  await logAudit({ actor: user.email, action: 'initiative.create', entity: 'project', entityId: projectId, detail: { bulk: clean.length } });
  if (objectiveId) revalidatePath(`/objectives/${objectiveId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/tasks');
}

// ---- OKR liên quan của dự án (đặt ở cấp dự án / điều lệ) ----
export async function setProjectObjectivesAction(fd: FormData) {
  const user = await requireUser();
  const units = await listUnits();
  const projectId = str(fd, 'project_id');
  const p = await getProject(projectId);
  if (!p) throw new Error('Không tìm thấy dự án.');
  if (!canManageProject(user, p, units, await loadAccess()))
    throw new Error('Bạn không có quyền sửa OKR liên quan của dự án này.');
  const ids = fd.getAll('objective_ids').map((x) => String(x)).filter(Boolean);
  const { setProjectObjectives } = await import('@/lib/project-objectives');
  await setProjectObjectives(projectId, ids);
  await logAudit({ actor: user.email, action: 'project.okr_link', entity: 'project', entityId: projectId, detail: { count: ids.length } });
  revalidatePath(`/projects/${projectId}`);
}

// Modal edit task: tạo NHANH 1 dự án rồi gắn task vào (khi dự án chưa tồn tại).
export async function createProjectForInitiativeAction(fd: FormData) {
  const user = await requireUser();
  const access = await loadAccess();
  if (!canCreateProject(user, access)) throw new Error('Bạn không có quyền tạo dự án.');
  const initId = str(fd, 'init_id');
  const name = str(fd, 'name');
  if (!name) throw new Error('Thiếu tên dự án.');
  const units = await listUnits();
  const init = await getInitiative(initId);
  if (!init) throw new Error('Không tìm thấy công việc.');
  const obj = init.objective_id ? await getObjective(init.objective_id) : null;
  const manage = obj ? canEditObjective(user, obj, units, access) : false;
  const perm = canUpdateInitiative(user, init, manage);
  if (!perm.manage && !perm.assignee) throw new Error('Bạn không có quyền gắn dự án cho việc này.');
  const projectId = await createProject({
    period_id: obj?.period_id ?? null,
    name,
    description: null,
    owner_email: user.email,
    unit_id: init.unit_id ?? obj?.unit_id ?? null,
    status: 'active',
    start_on: null,
    due_on: null,
    budget_planned: 0,
    budget_actual: 0,
    created_by: user.email,
  });
  await setInitiativeProject(initId, projectId);
  if (obj) revalidatePath(`/objectives/${obj.id}`);
  revalidatePath('/projects');
}
