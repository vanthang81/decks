'use server';

import { parseNum } from '@/lib/num';
import { setTaskDeps } from '@/lib/deps';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/current-user';
import { listUnits } from '@/lib/org';
import {
  createObjective,
  updateObjective,
  setObjectiveBsc,
  linkKrKpi,
  syncKrFromKpi,
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
  type BscPerspective,
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
  isValidUrl,
  type Confidence,
} from '@/lib/checkins';
import { isKpiMetric, syncKrKpi } from '@/lib/kpi';
import { getMeeting, canManageMeeting } from '@/lib/meetings';
import { getProject, canManageProject } from '@/lib/projects';
import type { Initiative } from '@/lib/initiatives';
import type { OkrUser } from '@/lib/users';
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
    unit_id: level === 'individual' || level === 'company' ? null : unitId,
    owner_email: ownerEmail,
    parent_id: orNull(str(fd, 'parent_id')),
    title,
    description: orNull(str(fd, 'description')),
    status: (str(fd, 'status') || 'active') as ObjStatus,
    okr_type: (str(fd, 'okr_type') || 'committed') as OkrType,
    bsc_perspective: (orNull(str(fd, 'bsc_perspective')) as BscPerspective | null),
    created_by: user.email,
  });

  // KR nhập ngay tại form tạo (JSON) — tạo luôn để OKR có thước đo từ đầu (best-effort từng KR).
  try {
    const rows = JSON.parse(str(fd, 'krs') || '[]') as Array<Record<string, unknown>>;
    for (const k of Array.isArray(rows) ? rows : []) {
      const kt = String(k.title ?? '').trim();
      if (!kt) continue;
      const mt = (['number', 'percent', 'currency', 'boolean'].includes(String(k.metric_type)) ? k.metric_type : 'number') as MetricType;
      // parseNum: nhận cả số đã format dấu nghìn ("2.204.000.000") lẫn số thô.
      const start = parseNum(k.start_value, 0);
      const target = parseNum(k.target_value, mt === 'boolean' ? 1 : 100);
      await createKeyResult({
        objective_id: id,
        title: kt,
        metric_type: mt,
        direction: (k.direction === 'decrease' ? 'decrease' : 'increase') as Direction,
        unit_label: k.unit_label ? String(k.unit_label) : null,
        start_value: start,
        target_value: target,
        current_value: start,
        weight: parseNum(k.weight, 1) || 1,
        kpi_source: null,
        indicator: (k.indicator === 'leading' ? 'leading' : 'lagging') as Indicator,
      }).catch(() => {});
    }
  } catch {
    /* krs không hợp lệ → bỏ qua, OKR vẫn tạo */
  }

  redirect(`/objectives/${id}`);
}

/** Gắn KPI thư viện vào 1 KR (rồi kéo số từ KPI theo kỳ+đơn vị của OKR). Chỉ người quản OKR. */
export async function linkKrKpiAction(fd: FormData) {
  const krId = str(fd, 'id');
  const kr = await getKeyResult(krId);
  if (!kr) throw new Error('Không tìm thấy Key Result.');
  await assertCanManageObjective(kr.objective_id);
  const kpiId = orNull(str(fd, 'kpi_id'));
  await linkKrKpi(krId, kpiId);
  if (kpiId) await syncKrFromKpi(krId);
  revalidatePath(`/objectives/${kr.objective_id}`);
}

/** Đặt/gỡ viễn cảnh BSC cho 1 OKR (chỉ người quản OKR). */
export async function setObjectiveBscAction(fd: FormData) {
  const objectiveId = str(fd, 'objective_id');
  await assertCanManageObjective(objectiveId);
  const raw = orNull(str(fd, 'bsc_perspective'));
  const valid = raw && ['financial', 'customer', 'process', 'learning'].includes(raw)
    ? (raw as BscPerspective)
    : null;
  await setObjectiveBsc(objectiveId, valid);
  revalidatePath(`/objectives/${objectiveId}`);
  revalidatePath('/');
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

/**
 * Quyền QUẢN LÝ 1 công việc bất kể nó gắn OKR / cuộc họp / dự án:
 *  - gắn OKR → quyền sửa OKR đó;
 *  - gắn cuộc họp (vd việc "next action" không gắn OKR) → chủ trì/thư ký/điều hành cuộc họp;
 *  - gắn dự án → quyền quản lý dự án.
 * Trả true nếu thoả BẤT KỲ nguồn nào (việc có thể vừa thuộc OKR vừa thuộc cuộc họp).
 */
async function canManageTaskLoose(user: OkrUser, init: Initiative): Promise<boolean> {
  const [units, access] = await Promise.all([listUnits(), loadAccess()]);
  if (init.objective_id) {
    const obj = await getObjective(init.objective_id);
    if (obj && canEditObjective(user, obj, units, access)) return true;
  }
  if (init.meeting_id) {
    const mt = await getMeeting(init.meeting_id);
    if (mt && canManageMeeting(user, mt)) return true;
  }
  if (init.project_id) {
    const pr = await getProject(init.project_id);
    if (pr && canManageProject(user, pr, units, access)) return true;
  }
  return false;
}

/** Revalidate mọi trang liên quan tới 1 công việc (OKR gốc + cuộc họp + dự án + danh sách việc). */
function revalidateTask(init: Pick<Initiative, 'objective_id' | 'meeting_id' | 'project_id'>) {
  if (init.objective_id) revalidatePath(`/objectives/${init.objective_id}`);
  if (init.meeting_id) revalidatePath(`/meetings/${init.meeting_id}`);
  if (init.project_id) revalidatePath(`/projects/${init.project_id}`);
  revalidatePath('/tasks');
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
  const evidence = str(fd, 'evidence_url');
  if (evidence && !isValidUrl(evidence)) throw new Error('Link minh chứng không hợp lệ (phải là http/https).');
  await addCheckIn({
    key_result_id: krId,
    objective_id: kr.objective_id,
    value,
    confidence: (str(fd, 'confidence') || 'on_track') as Confidence,
    note: orNull(str(fd, 'note')),
    evidence_url: orNull(evidence),
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
  const evidence = str(fd, 'evidence_url');
  if (evidence && !isValidUrl(evidence)) throw new Error('Link minh chứng không hợp lệ (phải là http/https).');
  await updateCheckIn(id, {
    value,
    confidence: (str(fd, 'confidence') || 'on_track') as Confidence,
    note: orNull(str(fd, 'note')),
    evidence_url: orNull(evidence),
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

// Tạo CÔNG VIỆC lẻ ngay ở trang "Công việc" (/tasks) — dành cho QUẢN LÝ (không phải nhân viên).
// Việc có thể đứng độc lập, hoặc gắn tuỳ chọn vào 1 OKR / 1 dự án (phải có quyền quản mục đó).
export async function createTaskAction(fd: FormData) {
  const user = await requireUser();
  if (user.role === 'staff') throw new Error('Chỉ quản lý mới tạo được công việc ở đây.');
  const title = str(fd, 'title').trim();
  if (!title) throw new Error('Thiếu tên công việc.');
  const [units, access] = await Promise.all([listUnits(), loadAccess()]);
  const objectiveId = orNull(str(fd, 'objective_id'));
  const projectId = orNull(str(fd, 'project_id'));
  if (objectiveId) {
    const obj = await getObjective(objectiveId);
    if (!obj) throw new Error('Không tìm thấy OKR.');
    if (!canEditObjective(user, obj, units, access)) throw new Error('Bạn không có quyền gắn việc vào OKR này.');
  }
  if (projectId) {
    const pr = await getProject(projectId);
    if (!pr) throw new Error('Không tìm thấy dự án.');
    if (!canManageProject(user, pr, units, access)) throw new Error('Bạn không có quyền gắn việc vào dự án này.');
  }
  await createInitiative({
    objective_id: objectiveId,
    key_result_id: null,
    parent_id: null,
    kind: 'action',
    title,
    description: orNull(str(fd, 'description')),
    owner_email: orNull(str(fd, 'owner_email')),
    unit_id: orNull(str(fd, 'unit_id')),
    project_id: projectId,
    status: (str(fd, 'status') || 'todo') as InitStatus,
    priority: (str(fd, 'priority') || 'medium') as Priority,
    start_on: orNull(str(fd, 'start_on')),
    due_on: orNull(str(fd, 'due_on')),
    budget_planned: num(fd, 'budget_planned'),
    budget_actual: num(fd, 'budget_actual'),
    budget_source: null,
    created_by: user.email,
  });
  if (objectiveId) revalidatePath(`/objectives/${objectiveId}`);
  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath('/tasks');
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
  revalidatePath('/tasks');
}

// Sửa đầy đủ 1 dự án/công việc từ popup edit (Kanban). Quản lý sửa mọi trường;
// người được giao chỉ đổi trạng thái + tiến độ việc của mình.
export async function editInitiativeAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, 'id');
  const init = await getInitiative(id);
  if (!init) throw new Error('Không tìm thấy công việc.');
  const manage = await canManageTaskLoose(user, init);
  const perm = canUpdateInitiative(user, init, manage);
  if (!perm.manage && !perm.assignee) throw new Error('Bạn không có quyền cập nhật việc này.');
  if (perm.manage) {
    // Gắn/đổi OKR: nếu chọn OKR mới (khác hiện tại) → phải có quyền sửa OKR đó.
    let objectiveId = orNull(str(fd, 'objective_id'));
    let keyResultId = orNull(str(fd, 'key_result_id'));
    if (objectiveId && objectiveId !== init.objective_id) {
      const [obj, units, access] = await Promise.all([getObjective(objectiveId), listUnits(), loadAccess()]);
      if (!obj) throw new Error('OKR đã chọn không tồn tại.');
      if (!canEditObjective(user, obj, units, access))
        throw new Error('Bạn không có quyền gắn việc vào OKR đã chọn.');
    }
    if (!objectiveId) keyResultId = null; // không gắn OKR thì bỏ KR
    // Việc PHẢI còn ít nhất một điểm neo (OKR / KR / dự án / cuộc họp) — tránh vi phạm ràng buộc DB.
    const anchored = objectiveId || keyResultId || orNull(str(fd, 'project_id')) || orNull(str(fd, 'meeting_id'));
    if (!anchored) throw new Error('Việc phải gắn ít nhất một OKR, dự án hoặc cuộc họp.');
    await editInitiative(id, {
      title: str(fd, 'title') || init.title,
      description: orNull(str(fd, 'description')),
      unit_id: orNull(str(fd, 'unit_id')),
      project_id: orNull(str(fd, 'project_id')),
      meeting_id: orNull(str(fd, 'meeting_id')),
      objective_id: objectiveId,
      key_result_id: keyResultId,
      owner_email: orNull(str(fd, 'owner_email')),
      status: (str(fd, 'status') || 'todo') as InitStatus,
      progress: num(fd, 'progress'),
      priority: (str(fd, 'priority') || 'medium') as Priority,
      start_on: orNull(str(fd, 'start_on')),
      due_on: orNull(str(fd, 'due_on')),
      budget_planned: num(fd, 'budget_planned'),
      budget_actual: num(fd, 'budget_actual'),
    });
    // Phụ thuộc waterfall (chỉ khi form có gửi 'depends_on' — form khác không đụng tới).
    if (fd.has('depends_on')) {
      const preds = str(fd, 'depends_on').split(',').map((x) => x.trim()).filter(Boolean);
      await setTaskDeps(id, preds);
    }
  } else {
    await setInitiativeProgress(id, {
      status: (str(fd, 'status') || 'todo') as InitStatus,
      progress: num(fd, 'progress'),
    });
  }
  revalidateTask(init);
  // meeting_id / objective_id có thể vừa đổi → revalidate cả mục mới chọn.
  const newMeeting = orNull(str(fd, 'meeting_id'));
  if (newMeeting && newMeeting !== init.meeting_id) revalidatePath(`/meetings/${newMeeting}`);
  const newObjective = orNull(str(fd, 'objective_id'));
  if (newObjective && newObjective !== init.objective_id) revalidatePath(`/objectives/${newObjective}`);
  const newProject = orNull(str(fd, 'project_id'));
  if (newProject && newProject !== init.project_id) revalidatePath(`/projects/${newProject}`);
}

export async function deleteInitiativeAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, 'id');
  const init = await getInitiative(id);
  if (!init) return;
  if (!(await canManageTaskLoose(user, init))) throw new Error('Bạn không có quyền xoá việc này.');
  await deleteInitiative(id);
  revalidateTask(init);
}

// Kéo-thả Kanban: đổi trạng thái 1 việc. Kiểm quyền (quản lý HOẶC người được giao).
export async function moveInitiativeAction(id: string, status: InitStatus) {
  const user = await requireUser();
  const init = await getInitiative(id);
  if (!init) throw new Error('Không tìm thấy công việc.');
  const manage = await canManageTaskLoose(user, init);
  const perm = canUpdateInitiative(user, init, manage);
  if (!perm.manage && !perm.assignee) throw new Error('Bạn không có quyền cập nhật việc này.');
  await setInitiativeStatus(id, status);
  revalidateTask(init);
}
