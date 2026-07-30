'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/current-user';
import { listUnits } from '@/lib/org';
import {
  createObjective,
  createKeyResult,
  setKeyResultValue,
  deleteKeyResult,
  getKeyResult,
  getObjective,
  canManageObjective,
  canCreateAt,
  type Level,
  type MetricType,
  type Direction,
  type ObjStatus,
} from '@/lib/okr';
import {
  createInitiative,
  updateInitiative,
  deleteInitiative,
  type InitStatus,
  type Priority,
} from '@/lib/initiatives';
import { addCheckIn, type Confidence } from '@/lib/checkins';

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? '').trim();
}
function num(fd: FormData, k: string, def = 0): number {
  const v = Number(String(fd.get(k) ?? '').replace(/,/g, ''));
  return Number.isFinite(v) ? v : def;
}
function orNull(s: string): string | null {
  return s === '' ? null : s;
}

export async function createObjectiveAction(fd: FormData) {
  const user = await requireUser();
  const units = await listUnits();
  const level = str(fd, 'level') as Level;
  const unitId = orNull(str(fd, 'unit_id'));
  const ownerEmail = orNull(str(fd, 'owner_email')) ?? (level === 'individual' ? user.email : null);
  const periodId = str(fd, 'period_id');
  const title = str(fd, 'title');

  if (!title || !periodId) throw new Error('Thiếu tiêu đề hoặc kỳ.');
  if (!canCreateAt(user, level, unitId, units)) {
    throw new Error('Bạn không có quyền tạo OKR ở phạm vi này.');
  }

  const id = await createObjective({
    period_id: periodId,
    level,
    unit_id: level === 'individual' ? null : unitId,
    owner_email: ownerEmail,
    parent_id: orNull(str(fd, 'parent_id')),
    title,
    description: orNull(str(fd, 'description')),
    status: (str(fd, 'status') || 'active') as ObjStatus,
    created_by: user.email,
  });
  redirect(`/objectives/${id}`);
}

async function assertCanManageObjective(objectiveId: string) {
  const user = await requireUser();
  const units = await listUnits();
  const obj = await getObjective(objectiveId);
  if (!obj) throw new Error('Không tìm thấy OKR.');
  if (!canManageObjective(user, obj, units)) throw new Error('Bạn không có quyền sửa OKR này.');
  return { user, obj };
}

export async function createKeyResultAction(fd: FormData) {
  const objectiveId = str(fd, 'objective_id');
  await assertCanManageObjective(objectiveId);
  await createKeyResult({
    objective_id: objectiveId,
    title: str(fd, 'title'),
    metric_type: (str(fd, 'metric_type') || 'number') as MetricType,
    direction: (str(fd, 'direction') || 'increase') as Direction,
    unit_label: orNull(str(fd, 'unit_label')),
    start_value: num(fd, 'start_value'),
    target_value: num(fd, 'target_value', 100),
    current_value: num(fd, 'current_value'),
    weight: num(fd, 'weight', 1),
    kpi_source: orNull(str(fd, 'kpi_source')),
  });
  revalidatePath(`/objectives/${objectiveId}`);
}

export async function checkInAction(fd: FormData) {
  const user = await requireUser();
  const krId = str(fd, 'key_result_id');
  const kr = await getKeyResult(krId);
  if (!kr) throw new Error('Không tìm thấy KR.');
  await assertCanManageObjective(kr.objective_id);
  const value = num(fd, 'value', kr.current_value);
  await setKeyResultValue(krId, value);
  await addCheckIn({
    key_result_id: krId,
    objective_id: kr.objective_id,
    value,
    confidence: (str(fd, 'confidence') || 'on_track') as Confidence,
    note: orNull(str(fd, 'note')),
    author_email: user.email,
  });
  revalidatePath(`/objectives/${kr.objective_id}`);
}

export async function deleteKeyResultAction(fd: FormData) {
  const krId = str(fd, 'key_result_id');
  const kr = await getKeyResult(krId);
  if (!kr) return;
  await assertCanManageObjective(kr.objective_id);
  await deleteKeyResult(krId);
  revalidatePath(`/objectives/${kr.objective_id}`);
}

export async function createInitiativeAction(fd: FormData) {
  const user = await requireUser();
  const objectiveId = str(fd, 'objective_id');
  await assertCanManageObjective(objectiveId);
  await createInitiative({
    objective_id: objectiveId,
    key_result_id: orNull(str(fd, 'key_result_id')),
    title: str(fd, 'title'),
    description: orNull(str(fd, 'description')),
    owner_email: orNull(str(fd, 'owner_email')),
    status: (str(fd, 'status') || 'todo') as InitStatus,
    priority: (str(fd, 'priority') || 'medium') as Priority,
    start_on: orNull(str(fd, 'start_on')),
    due_on: orNull(str(fd, 'due_on')),
    budget_planned: num(fd, 'budget_planned'),
    budget_actual: num(fd, 'budget_actual'),
    budget_source: orNull(str(fd, 'budget_source')),
    created_by: user.email,
  });
  revalidatePath(`/objectives/${objectiveId}`);
}

export async function updateInitiativeAction(fd: FormData) {
  const objectiveId = str(fd, 'objective_id');
  await assertCanManageObjective(objectiveId);
  await updateInitiative(str(fd, 'id'), {
    status: (str(fd, 'status') || 'todo') as InitStatus,
    progress: num(fd, 'progress'),
    budget_actual: num(fd, 'budget_actual'),
    budget_planned: num(fd, 'budget_planned'),
  });
  revalidatePath(`/objectives/${objectiveId}`);
}

export async function deleteInitiativeAction(fd: FormData) {
  const objectiveId = str(fd, 'objective_id');
  await assertCanManageObjective(objectiveId);
  await deleteInitiative(str(fd, 'id'));
  revalidatePath(`/objectives/${objectiveId}`);
}
