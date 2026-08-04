'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/current-user';
import { isExec } from '@/lib/rbac';
import {
  createMeeting, updateMeeting, updateMinutes, deleteMeeting, setParticipants,
  getMeeting, canManageMeeting, requestAccess, decideAccessRequest,
  type MeetingInput, type MeetingType, type MeetingStatus, type MeetingVisibility, MEETING_TYPES,
} from '@/lib/meetings';
import { notifySimple } from '@/lib/notifications';
import { createInitiative } from '@/lib/initiatives';
import { getObjective } from '@/lib/okr';
import { canEditObjective, loadAccess } from '@/lib/access';
import { listUnits } from '@/lib/org';
import { parseNum } from '@/lib/num';

function str(fd: FormData, k: string): string { return String(fd.get(k) ?? '').trim(); }
function orNull(s: string): string | null { return s === '' ? null : s; }
const ONE = <T extends string>(v: string, allowed: readonly T[], dflt: T): T =>
  (allowed as readonly string[]).includes(v) ? (v as T) : dflt;

function readInput(fd: FormData): MeetingInput {
  return {
    title: str(fd, 'title'),
    type: ONE<MeetingType>(str(fd, 'type'), MEETING_TYPES, 'other'),
    period_id: orNull(str(fd, 'period_id')),
    unit_id: orNull(str(fd, 'unit_id')),
    project_id: orNull(str(fd, 'project_id')),
    owner_email: orNull(str(fd, 'owner_email')),
    secretary_email: orNull(str(fd, 'secretary_email')),
    meeting_at: orNull(str(fd, 'meeting_at')),
    location: orNull(str(fd, 'location')),
    status: ONE<MeetingStatus>(str(fd, 'status'), ['scheduled', 'held', 'cancelled'], 'scheduled'),
    visibility: ONE<MeetingVisibility>(str(fd, 'visibility'), ['participants', 'unit', 'company'], 'participants'),
    agenda: orNull(str(fd, 'agenda')),
    previous_meeting_id: orNull(str(fd, 'previous_meeting_id')),
  };
}

function parseParticipants(raw: string): { email: string; role: string }[] {
  return raw
    .split(/[\n,;]+/)
    .map((e) => e.trim())
    .filter((e) => e.includes('@'))
    .map((email) => ({ email, role: 'participant' }));
}

export async function createMeetingAction(fd: FormData) {
  const user = await requireUser();
  const input = readInput(fd);
  if (!input.title) throw new Error('Thiếu tiêu đề cuộc họp.');
  // Mặc định người tạo là chủ trì nếu chưa chọn.
  if (!input.owner_email) input.owner_email = user.email;
  const id = await createMeeting(input, user.email);
  const people = parseParticipants(str(fd, 'participants'));
  // Chủ trì + thư ký cũng là participant để phân quyền xem ổn định.
  if (input.owner_email) people.push({ email: input.owner_email, role: 'host' });
  if (input.secretary_email) people.push({ email: input.secretary_email, role: 'secretary' });
  await setParticipants(id, people);
  revalidatePath('/meetings');
  redirect(`/meetings/${id}`);
}

async function guardManage(id: string) {
  const user = await requireUser();
  const m = await getMeeting(id);
  if (!m) throw new Error('Không tìm thấy cuộc họp.');
  if (!canManageMeeting(user, m)) throw new Error('Chỉ chủ trì/thư ký (hoặc CEO/CFO) mới sửa được.');
  return { user, m };
}

export async function updateMeetingAction(fd: FormData) {
  const id = str(fd, 'id');
  await guardManage(id);
  const input = readInput(fd);
  if (!input.title) throw new Error('Thiếu tiêu đề cuộc họp.');
  await updateMeeting(id, input);
  const raw = str(fd, 'participants');
  if (raw) {
    const people = parseParticipants(raw);
    if (input.owner_email) people.push({ email: input.owner_email, role: 'host' });
    if (input.secretary_email) people.push({ email: input.secretary_email, role: 'secretary' });
    await setParticipants(id, people);
  }
  revalidatePath(`/meetings/${id}`);
  revalidatePath('/meetings');
}

export async function saveMinutesAction(fd: FormData) {
  const id = str(fd, 'id');
  await guardManage(id);
  await updateMinutes(id, orNull(str(fd, 'minutes')), orNull(str(fd, 'decisions')));
  revalidatePath(`/meetings/${id}`);
}

export async function deleteMeetingAction(fd: FormData) {
  const id = str(fd, 'id');
  const { user } = await guardManage(id);
  if (!isExec(user.role)) {
    // chỉ chủ trì/thư ký/exec — guardManage đã kiểm; cho xoá.
  }
  await deleteMeeting(id);
  redirect('/meetings?deleted=1');
}

/**
 * Thêm CÔNG VIỆC (hành động) cho 1 cuộc họp. Chủ trì/thư ký/điều hành thêm được.
 * Có thể gắn kèm OKR (tuỳ chọn) — nếu gắn thì phải có quyền quản OKR đó; nếu không thì
 * việc là "next action" thuần của cuộc họp (objective_id NULL), vẫn quản lý/kéo-thả theo quyền họp.
 */
export async function createMeetingTaskAction(fd: FormData) {
  const { user, m } = await guardManage(str(fd, 'id'));
  const title = str(fd, 'title');
  if (!title) throw new Error('Thiếu tên công việc.');
  const objectiveId = orNull(str(fd, 'objective_id'));
  let keyResultId = orNull(str(fd, 'key_result_id'));
  if (objectiveId) {
    const [obj, units, access] = await Promise.all([getObjective(objectiveId), listUnits(), loadAccess()]);
    if (!obj) throw new Error('Không tìm thấy OKR đã chọn.');
    if (!canEditObjective(user, obj, units, access))
      throw new Error('Bạn không có quyền gắn việc vào OKR đã chọn.');
  } else {
    keyResultId = null; // không gắn OKR thì bỏ KR
  }
  await createInitiative({
    objective_id: objectiveId,
    key_result_id: keyResultId,
    parent_id: null,
    kind: 'action',
    title,
    description: orNull(str(fd, 'description')),
    owner_email: orNull(str(fd, 'owner_email')),
    unit_id: orNull(str(fd, 'unit_id')),
    project_id: orNull(str(fd, 'project_id')),
    meeting_id: m.id,
    status: 'todo',
    priority: (str(fd, 'priority') || 'medium') as 'low' | 'medium' | 'high',
    start_on: orNull(str(fd, 'start_on')),
    due_on: orNull(str(fd, 'due_on')),
    budget_planned: parseNum(fd.get('budget_planned'), 0),
    budget_actual: 0,
    budget_source: null,
    created_by: user.email,
  });
  revalidatePath(`/meetings/${m.id}`);
  if (objectiveId) revalidatePath(`/objectives/${objectiveId}`);
  revalidatePath('/tasks');
}

export async function requestMeetingAccessAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, 'id');
  const m = await getMeeting(id);
  if (!m) throw new Error('Không tìm thấy cuộc họp.');
  await requestAccess(id, user.email, orNull(str(fd, 'reason')));
  // Báo cho chủ trì + thư ký.
  const to = [m.owner_email, m.secretary_email].filter(Boolean) as string[];
  await notifySimple({
    recipients: to,
    type: 'meeting_access_request',
    actorEmail: user.email,
    actorName: user.display_name || user.email,
    preview: `xin xem nội dung cuộc họp "${m.title}"`,
    link: `/meetings/${id}`,
  }).catch(() => {});
  revalidatePath(`/meetings/${id}`);
}

export async function decideMeetingAccessAction(fd: FormData) {
  const user = await requireUser();
  const id = str(fd, 'id');
  await guardManage(id);
  const requestId = str(fd, 'request_id');
  const approve = str(fd, 'decision') === 'approve';
  const r = await decideAccessRequest(requestId, approve, user.email);
  if (r) {
    const m = await getMeeting(id);
    await notifySimple({
      recipients: [r.requester],
      type: 'meeting_access_decided',
      actorEmail: user.email,
      actorName: user.display_name || user.email,
      preview: approve
        ? `đã DUYỆT quyền xem cuộc họp "${m?.title ?? ''}"`
        : `đã từ chối quyền xem cuộc họp "${m?.title ?? ''}"`,
      link: approve ? `/meetings/${id}` : `/meetings`,
    }).catch(() => {});
  }
  revalidatePath(`/meetings/${id}`);
}
