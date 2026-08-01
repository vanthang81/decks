'use server';

import { parseNum } from '@/lib/num';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/current-user';
import { listUnits } from '@/lib/org';
import {
  createObjective,
  updateObjective,
  deleteObjective,
  createKeyResult,
  updateKeyResult,
  setKeyResultValue,
  deleteKeyResult,
  getKeyResult,
  getObjective,
  type Level,
  type MetricType,
  type Direction,
  type ObjStatus,
  type OkrType,
  type Indicator,
} from '@/lib/okr';
import {
  createInitiative,
  updateInitiative,
  editInitiative,
  setInitiativeProgress,
  setInitiativeStatus,
  deleteInitiative,
  getInitiative,
  canUpdateInitiative,
  CHILD_KIND,
  type InitStatus,
  type Priority,
  type InitKind,
} from '@/lib/initiatives';
import {
  addCheckIn,
  getCheckIn,
  updateCheckIn,
  deleteCheckIn,
  latestCheckinValue,
  type Confidence,
} from '@/lib/checkins';
import { isKpiMetric, syncKrKpi } from '@/lib/kpi';
import { canManageObjectiveId, withinEditWindow } from '@/lib/moderation';
import {
  loadAccess,
  canEditObjective,
  canDeleteObjective,
  canCreateObjective,
} from '@/lib/access';

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? '').trim();
}
function num(fd: FormData, k: string, def = 0): number {
  return parseNum(fd.get(k), def);
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
  const access = await loadAccess();
  if (!canCreateObjective(user, level, unitId, units, access)) {
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
    okr_type: (str(fd, 'okr_type') || 'committed') as OkrType,
    created_by: user.email,
  });
  redirect(`/objectives/${id}`);
}

export async function editObjectiveAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, 'id');
  const [units, obj, access] = await Promise.all([
    listUnits(),
    getObjective(id),
    loadAccess(),
  ]);
  if (!obj) throw new Error('Không tìm thấy OKR.');
  if (!canEditObjective(user, obj, units, access))
    throw new Error('Bạn không có quyền sửa OKR này.');
  const title = str(fd, 'title');
  if (!title) throw new Error('Thiếu tiêu đề.');
  // Cá nhân giữ nguyên là cá nhân (không unit); còn lại cho đổi đơn vị phụ trách.
  const unitId = obj.level === 'individual' ? null : orNull(str(fd, 'unit_id'));
  await updateObjective(id, {
    title,
    description: orNull(str(fd, 'description')),
    status: (str(fd, 'status') || obj.status) as ObjStatus,
    okr_type: (str(fd, 'okr_type') || obj.okr_type) as OkrType,
    owner_email: orNull(str(fd, 'owner_email')),
    unit_id: unitId,
  });
  revalidatePath(`/objectives/${id}`);
  revalidatePath('/objectives');
}

export async function deleteObjectiveAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, 'id');
  const [units, obj, access] = await Promise.all([
    listUnits(),
    getObjective(id),
    loadAccess(),
  ]);
  if (!obj) return;
  if (!canDeleteObjective(user, obj, units, access))
    throw new Error('Chỉ người có quyền Xoá OKR mới thực hiện được.');
  await deleteObjective(id);
  redirect('/objectives?deleted=1');
}

async function assertCanManageObjective(objectiveId: string) {
  const user = await requireUser();
  const [units, obj, access] = await Promise.all([
    listUnits(),
    getObjective(objectiveId),
    loadAccess(),
  ]);
  if (!obj) throw new Error('Không tìm thấy OKR.');
  if (!canEditObjective(user, obj, units, access))
    throw new Error('Bạn không có quyền sửa OKR này.');
  return { user, obj };
}

export async function createKeyResultAction(fd: FormData) {
  const objectiveId = str(fd, 'objective_id');
  await assertCanManageObjective(objectiveId);
  const kpiSource = orNull(str(fd, 'kpi_source'));
  const isAuto = isKpiMetric(kpiSource);
  const id = await createKeyResult({
    objective_id: objectiveId,
    title: str(fd, 'title'),
    // KR gắn KPI tự động = tiền tệ (VND), target/current sẽ do sync điền.
    metric_type: isAuto ? 'currency' : ((str(fd, 'metric_type') || 'number') as MetricType),
    direction: (str(fd, 'direction') || 'increase') as Direction,
    unit_label: isAuto ? 'tỷ' : orNull(str(fd, 'unit_label')),
    start_value: num(fd, 'start_value'),
    target_value: num(fd, 'target_value', 100),
    current_value: num(fd, 'current_value'),
    weight: num(fd, 'weight', 1),
    kpi_source: kpiSource,
    // KPI actual là chỉ số kết quả (lagging); KR thủ công mặc định theo lựa chọn.
    indicator: isAuto ? 'lagging' : ((str(fd, 'indicator') || 'lagging') as Indicator),
  });
  if (isAuto) {
    try {
      await syncKrKpi(id);
    } catch {
      /* best-effort: BigQuery lỗi không chặn tạo KR */
    }
  }
  revalidatePath(`/objectives/${objectiveId}`);
}

export async function editKeyResultAction(fd: FormData) {
  const krId = str(fd, 'key_result_id');
  const kr = await getKeyResult(krId);
  if (!kr) throw new Error('Không tìm thấy KR.');
  await assertCanManageObjective(kr.objective_id);
  const title = str(fd, 'title');
  if (!title) throw new Error('Thiếu tiêu đề KR.');
  const kpiSource = orNull(str(fd, 'kpi_source'));
  const isAuto = isKpiMetric(kpiSource);
  await updateKeyResult(krId, {
    title,
    metric_type: isAuto ? 'currency' : ((str(fd, 'metric_type') || 'number') as MetricType),
    direction: (str(fd, 'direction') || 'increase') as Direction,
    unit_label: isAuto ? 'tỷ' : orNull(str(fd, 'unit_label')),
    start_value: num(fd, 'start_value'),
    target_value: num(fd, 'target_value', 100),
    weight: num(fd, 'weight', 1),
    kpi_source: kpiSource,
    indicator: isAuto ? 'lagging' : ((str(fd, 'indicator') || 'lagging') as Indicator),
  });
  // KR gắn KPI tự động → đồng bộ lại target/current ngay từ BigQuery.
  if (isAuto) {
    try {
      await syncKrKpi(krId);
    } catch {
      /* best-effort */
    }
  }
  revalidatePath(`/objectives/${kr.objective_id}`);
}

export async function checkInAction(fd: FormData) {
  const user = await requireUser();
  const krId = str(fd, 'key_result_id');
  const kr = await getKeyResult(krId);
  if (!kr) throw new Error('Không tìm thấy KR.');
  await assertCanManageObjective(kr.objective_id);
  // KR gắn nguồn KPI tự động: giá trị do BigQuery quản → KHÔNG ghi đè bằng check-in tay,
  // chỉ lưu độ tự tin/ghi chú (value = giá trị hiện tại đã đồng bộ).
  const isAuto = !!kr.kpi_source;
  // Bỏ trống "Giá trị mới" = chỉ cập nhật confidence/ghi chú, GIỮ giá trị KR hiện tại.
  const value = isAuto
    ? kr.current_value
    : str(fd, 'value') === ''
      ? kr.current_value
      : num(fd, 'value', kr.current_value);
  if (!isAuto) await setKeyResultValue(krId, value);
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

async function resyncKrFromCheckins(krId: string) {
  const kr = await getKeyResult(krId);
  if (!kr) return;
  // KR gắn nguồn KPI tự động (BigQuery) → giá trị do cron quản lý, KHÔNG đồng bộ theo check-in tay.
  if (kr.kpi_source) return;
  const latest = await latestCheckinValue(krId);
  await setKeyResultValue(krId, latest ?? kr.start_value);
}

// Sửa 1 check-in (tác giả HOẶC người quản lý OKR). Đồng bộ lại giá trị KR theo check-in mới nhất.
export async function editCheckInAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, 'id');
  const ci = await getCheckIn(id);
  if (!ci) throw new Error('Không tìm thấy check-in.');
  const objId =
    ci.objective_id ??
    (ci.key_result_id ? (await getKeyResult(ci.key_result_id))?.objective_id ?? null : null);
  const isAuthor = !!ci.author_email && ci.author_email.toLowerCase() === user.email.toLowerCase();
  // Sửa: quản lý (admin/editor) bất kỳ lúc nào; tác giả chỉ trong 3 giờ.
  const canManage = await canManageObjectiveId(user, objId);
  if (!canManage) {
    if (!isAuthor) throw new Error('Bạn không có quyền sửa check-in này.');
    if (!withinEditWindow(ci.created_at))
      throw new Error('Quá 3 giờ — chỉ quản lý mới sửa được check-in này.');
  }
  const valueStr = str(fd, 'value');
  const value = valueStr === '' ? null : num(fd, 'value');
  await updateCheckIn(id, {
    value,
    confidence: (str(fd, 'confidence') || 'on_track') as Confidence,
    note: orNull(str(fd, 'note')),
  });
  if (ci.key_result_id) await resyncKrFromCheckins(ci.key_result_id);
  if (objId) revalidatePath(`/objectives/${objId}`);
}

export async function deleteCheckInAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, 'id');
  const ci = await getCheckIn(id);
  if (!ci) return;
  const objId =
    ci.objective_id ??
    (ci.key_result_id ? (await getKeyResult(ci.key_result_id))?.objective_id ?? null : null);
  // Xoá: CHỈ quản lý (admin/editor) — người dùng thường không được xoá check-in.
  const canManage = await canManageObjectiveId(user, objId);
  if (!canManage) throw new Error('Chỉ quản lý (admin/editor) được xoá check-in.');
  await deleteCheckIn(id);
  if (ci.key_result_id) await resyncKrFromCheckins(ci.key_result_id);
  if (objId) revalidatePath(`/objectives/${objId}`);
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
  const parentId = orNull(str(fd, 'parent_id'));
  let kind = (str(fd, 'kind') || 'action') as InitKind;
  let keyResultId = orNull(str(fd, 'key_result_id'));
  if (parentId) {
    const parent = await getInitiative(parentId);
    if (!parent || parent.objective_id !== objectiveId) throw new Error('Nút cha không hợp lệ.');
    if (!CHILD_KIND[parent.kind].includes(kind)) kind = CHILD_KIND[parent.kind][0] ?? 'action';
    keyResultId = parent.key_result_id; // con kế thừa gắn KR của cha
  }
  await createInitiative({
    objective_id: objectiveId,
    key_result_id: keyResultId,
    parent_id: parentId,
    kind,
    title: str(fd, 'title'),
    description: orNull(str(fd, 'description')),
    owner_email: orNull(str(fd, 'owner_email')),
    unit_id: orNull(str(fd, 'unit_id')),
    project_id: orNull(str(fd, 'project_id')),
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

// Cập nhật: quản lý sửa đầy đủ; người được giao chỉ đổi trạng thái + tiến độ việc của mình.
export async function updateInitiativeAction(fd: FormData) {
  const user = await requireUser();
  const units = await listUnits();
  const id = str(fd, 'id');
  const init = await getInitiative(id);
  if (!init) throw new Error('Không tìm thấy công việc.');
  const obj = init.objective_id ? await getObjective(init.objective_id) : null;
  if (!obj) throw new Error('Công việc chưa gắn OKR.');
  const manage = canEditObjective(user, obj, units, await loadAccess());
  const perm = canUpdateInitiative(user, init, manage);
  if (!perm.manage && !perm.assignee) throw new Error('Bạn không có quyền cập nhật việc này.');
  if (perm.manage) {
    await updateInitiative(id, {
      status: (str(fd, 'status') || 'todo') as InitStatus,
      progress: num(fd, 'progress'),
      owner_email: orNull(str(fd, 'owner_email')),
      unit_id: orNull(str(fd, 'unit_id')),
      priority: (str(fd, 'priority') || 'medium') as Priority,
      due_on: orNull(str(fd, 'due_on')),
      budget_planned: num(fd, 'budget_planned'),
      budget_actual: num(fd, 'budget_actual'),
    });
  } else {
    await setInitiativeProgress(id, {
      status: (str(fd, 'status') || 'todo') as InitStatus,
      progress: num(fd, 'progress'),
    });
  }
  revalidatePath(`/objectives/${obj.id}`);
}

// Sửa đầy đủ 1 dự án/công việc từ popup edit (Kanban). Quản lý sửa mọi trường;
// người được giao chỉ đổi trạng thái + tiến độ việc của mình.
export async function editInitiativeAction(fd: FormData) {
  const user = await requireUser();
  const units = await listUnits();
  const id = str(fd, 'id');
  const init = await getInitiative(id);
  if (!init) throw new Error('Không tìm thấy công việc.');
  const obj = init.objective_id ? await getObjective(init.objective_id) : null;
  if (!obj) throw new Error('Công việc chưa gắn OKR.');
  const manage = canEditObjective(user, obj, units, await loadAccess());
  const perm = canUpdateInitiative(user, init, manage);
  if (!perm.manage && !perm.assignee) throw new Error('Bạn không có quyền cập nhật việc này.');
  if (perm.manage) {
    await editInitiative(id, {
      title: str(fd, 'title') || init.title,
      description: orNull(str(fd, 'description')),
      unit_id: orNull(str(fd, 'unit_id')),
      project_id: orNull(str(fd, 'project_id')),
      owner_email: orNull(str(fd, 'owner_email')),
      status: (str(fd, 'status') || 'todo') as InitStatus,
      progress: num(fd, 'progress'),
      priority: (str(fd, 'priority') || 'medium') as Priority,
      start_on: orNull(str(fd, 'start_on')),
      due_on: orNull(str(fd, 'due_on')),
      budget_planned: num(fd, 'budget_planned'),
      budget_actual: num(fd, 'budget_actual'),
    });
  } else {
    await setInitiativeProgress(id, {
      status: (str(fd, 'status') || 'todo') as InitStatus,
      progress: num(fd, 'progress'),
    });
  }
  revalidatePath(`/objectives/${obj.id}`);
}

export async function deleteInitiativeAction(fd: FormData) {
  const objectiveId = str(fd, 'objective_id');
  await assertCanManageObjective(objectiveId);
  await deleteInitiative(str(fd, 'id'));
  revalidatePath(`/objectives/${objectiveId}`);
}

// Kéo-thả Kanban: đổi trạng thái 1 việc. Kiểm quyền (quản lý HOẶC người được giao).
export async function moveInitiativeAction(id: string, status: InitStatus) {
  const user = await requireUser();
  const units = await listUnits();
  const init = await getInitiative(id);
  if (!init) throw new Error('Không tìm thấy công việc.');
  const obj = init.objective_id ? await getObjective(init.objective_id) : null;
  if (!obj) throw new Error('Công việc chưa gắn OKR.');
  const manage = canEditObjective(user, obj, units, await loadAccess());
  const perm = canUpdateInitiative(user, init, manage);
  if (!perm.manage && !perm.assignee) throw new Error('Bạn không có quyền cập nhật việc này.');
  await setInitiativeStatus(id, status);
  revalidatePath(`/objectives/${obj.id}`);
}
