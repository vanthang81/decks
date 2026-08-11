'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/current-user';
import { isExec } from '@/lib/rbac';
import {
  createMeeting, updateMeeting, updateMinutes, deleteMeeting, setParticipants,
  getMeeting, isMeetingEditor, requestAccess, decideAccessRequest,
  type MeetingInput, type MeetingType, type MeetingStatus, type MeetingVisibility, MEETING_TYPES,
} from '@/lib/meetings';
import { notifySimple } from '@/lib/notifications';
import { logAudit } from '@/lib/audit';
import { syncMeetingCalendar, removeMeetingCalendar } from '@/lib/gcal';
import { createInitiative } from '@/lib/initiatives';
import { getObjective } from '@/lib/okr';
import { canEditObjective, loadAccess } from '@/lib/access';
import { listUnits } from '@/lib/org';
import { parseNum } from '@/lib/num';
import { sanitizeRichHtml, isRichEmpty } from '@/lib/sanitizeHtml';

function str(fd: FormData, k: string): string { return String(fd.get(k) ?? '').trim(); }
function orNull(s: string): string | null { return s === '' ? null : s; }
// Ô MultiSelect gửi 1 input ẩn = các id nối bằng dấu phẩy.
function csvList(fd: FormData, k: string): string[] {
  return str(fd, k).split(',').map((x) => x.trim()).filter(Boolean);
}
const ONE = <T extends string>(v: string, allowed: readonly T[], dflt: T): T =>
  (allowed as readonly string[]).includes(v) ? (v as T) : dflt;

function readInput(fd: FormData): MeetingInput {
  return {
    title: str(fd, 'title'),
    type: ONE<MeetingType>(str(fd, 'type'), MEETING_TYPES, 'other'),
    period_id: orNull(str(fd, 'period_id')),
    unit_ids: csvList(fd, 'unit_ids'),
    project_ids: csvList(fd, 'project_ids'),
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

function emailList(raw: string): string[] {
  return raw.split(/[\n,;]+/).map((e) => e.trim()).filter((e) => e.includes('@'));
}

// Gom TOÀN BỘ người của cuộc họp + vai trò, ưu tiên host > secretary > participant khi 1 người
// xuất hiện nhiều vai. Nguồn: participants (tham gia) + secretary_emails (nhiều thư ký) +
// cohost_emails (đồng chủ trì) + owner_email (chủ trì chính) + secretary_email (thư ký chính).
function buildPeople(fd: FormData, input: MeetingInput): { email: string; role: string }[] {
  const rank = (r: string) => (r === 'host' ? 3 : r === 'secretary' ? 2 : 1);
  const map = new Map<string, { email: string; role: string }>();
  const set = (email: string, role: string) => {
    const k = email.toLowerCase();
    const cur = map.get(k);
    if (!cur || rank(role) > rank(cur.role)) map.set(k, { email: cur?.email ?? email, role });
  };
  for (const e of emailList(str(fd, 'participants'))) set(e, 'participant');
  for (const e of emailList(str(fd, 'secretary_emails'))) set(e, 'secretary');
  for (const e of emailList(str(fd, 'cohost_emails'))) set(e, 'host');
  if (input.owner_email) set(input.owner_email, 'host');
  if (input.secretary_email) set(input.secretary_email, 'secretary');
  return [...map.values()];
}

export async function createMeetingAction(fd: FormData) {
  const user = await requireUser();
  const input = readInput(fd);
  if (!input.title) throw new Error('Thiếu tiêu đề cuộc họp.');
  // Mặc định người tạo là chủ trì nếu chưa chọn.
  if (!input.owner_email) input.owner_email = user.email;
  // Thư ký chính = thư ký đầu tiên trong danh sách nhiều thư ký (cột secretary_email để hiện gọn).
  const secs = emailList(str(fd, 'secretary_emails'));
  if (secs.length) input.secretary_email = secs[0];
  const id = await createMeeting(input, user.email);
  await setParticipants(id, buildPeople(fd, input));
  await logAudit({ actor: user.email, action: 'meeting.create', entity: 'meeting', entityId: id, detail: { title: input.title } });
  await syncMeetingCalendar(id).catch(() => {}); // ghi lịch Google (no-op nếu chưa bật)
  revalidatePath('/meetings');
  redirect(`/meetings/${id}`);
}

async function guardManage(id: string) {
  const user = await requireUser();
  const m = await getMeeting(id);
  if (!m) throw new Error('Không tìm thấy cuộc họp.');
  // Đồng chủ trì & nhiều thư ký (participant role host/secretary) cũng sửa được.
  if (!(await isMeetingEditor(user, id, m))) throw new Error('Chỉ chủ trì/đồng chủ trì/thư ký (hoặc CEO/CFO) mới sửa được.');
  return { user, m };
}

export async function updateMeetingAction(fd: FormData) {
  const id = str(fd, 'id');
  const { user } = await guardManage(id);
  const input = readInput(fd);
  if (!input.title) throw new Error('Thiếu tiêu đề cuộc họp.');
  const secs = emailList(str(fd, 'secretary_emails'));
  if (secs.length) input.secretary_email = secs[0];
  else if (fd.has('secretary_emails')) input.secretary_email = null; // đã xoá hết thư ký
  await updateMeeting(id, input);
  await setParticipants(id, buildPeople(fd, input));
  await logAudit({ actor: user.email, action: 'meeting.update', entity: 'meeting', entityId: id, detail: { title: input.title } });
  await syncMeetingCalendar(id).catch(() => {});
  revalidatePath(`/meetings/${id}`);
  revalidatePath('/meetings');
}

export async function saveMinutesAction(fd: FormData) {
  const id = str(fd, 'id');
  const { user } = await guardManage(id);
  // LÀM SẠCH HTML rich-text trước khi lưu (chống XSS); rỗng → NULL.
  const minutes = sanitizeRichHtml(str(fd, 'minutes'));
  const decisions = sanitizeRichHtml(str(fd, 'decisions'));
  await updateMinutes(id, isRichEmpty(minutes) ? null : minutes, isRichEmpty(decisions) ? null : decisions);
  await logAudit({ actor: user.email, action: 'meeting.minutes', entity: 'meeting', entityId: id });
  revalidatePath(`/meetings/${id}`);
}

/**
 * TỰ LƯU NHÁP biên bản khi đang gõ (CFO 11/08) — lưu THẲNG vào DB, KHÔNG revalidate
 * để tránh làm mới trang giữa lúc soạn (mất con trỏ/nội dung đang gõ). Vẫn kiểm quyền +
 * làm sạch HTML như lưu chính thức. Nút "Lưu biên bản" (saveMinutesAction) đóng popup như cũ.
 */
export async function autosaveMinutesAction(fd: FormData) {
  const id = str(fd, 'id');
  await guardManage(id);
  const minutes = sanitizeRichHtml(str(fd, 'minutes'));
  const decisions = sanitizeRichHtml(str(fd, 'decisions'));
  await updateMinutes(id, isRichEmpty(minutes) ? null : minutes, isRichEmpty(decisions) ? null : decisions);
}

export async function deleteMeetingAction(fd: FormData) {
  const id = str(fd, 'id');
  const { user, m } = await guardManage(id);
  if (!isExec(user.role)) {
    // chỉ chủ trì/thư ký/exec — guardManage đã kiểm; cho xoá.
  }
  await logAudit({ actor: user.email, action: 'meeting.delete', entity: 'meeting', entityId: id, detail: { title: m.title } });
  await removeMeetingCalendar(id).catch(() => {}); // xoá sự kiện lịch trước khi xoá bản ghi
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
