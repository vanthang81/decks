'use server';

import { parseNum } from '@/lib/num';
import { revalidatePath } from 'next/cache';
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
  await deleteProject(id);
  redirect('/projects');
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
