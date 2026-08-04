import { query, queryOne } from './db';
import { isExec } from './rbac';
import type { OkrUser } from './users';

// Module CUỘC HỌP — biên bản + phân quyền xem theo người tham gia/watcher + yêu cầu xem.

export type MeetingType = 'project_checkin' | 'exec_wbr' | 'exec_mbr' | 'division' | 'department' | 'ibp' | 'other';
export type MeetingStatus = 'scheduled' | 'held' | 'cancelled';
export type MeetingVisibility = 'participants' | 'unit' | 'company';

export const MEETING_TYPE_LABEL: Record<MeetingType, string> = {
  project_checkin: 'Check-in dự án',
  exec_wbr: 'Điều hành tuần (WBR)',
  exec_mbr: 'Điều hành tháng (MBR)',
  division: 'Cấp khối',
  department: 'Cấp phòng',
  ibp: 'IBP (Kế hoạch tích hợp)',
  other: 'Khác',
};
export const MEETING_TYPES = Object.keys(MEETING_TYPE_LABEL) as MeetingType[];
export const MEETING_STATUS_LABEL: Record<MeetingStatus, string> = { scheduled: 'Đã lên lịch', held: 'Đã họp', cancelled: 'Đã huỷ' };
export const MEETING_STATUS_CLS: Record<MeetingStatus, string> = { scheduled: 'blue', held: 'green', cancelled: 'gray' };

// Trạng thái HIỂN THỊ (khác trạng thái lưu): cuộc họp còn 'Đã lên lịch' nhưng giờ họp đã QUA
// thì hiện "Đã diễn ra" cho đúng thực tế (không đổi dữ liệu — chủ trì vẫn có thể đánh dấu "Đã họp"
// khi ghi biên bản). 'Đã họp'/'Đã huỷ' giữ nguyên.
export function meetingStatusView(
  m: { status: MeetingStatus; meeting_at: string | null },
): { label: string; cls: string } {
  if (m.status === 'scheduled' && m.meeting_at && new Date(m.meeting_at).getTime() < Date.now()) {
    return { label: 'Đã diễn ra', cls: 'slate' };
  }
  return { label: MEETING_STATUS_LABEL[m.status], cls: MEETING_STATUS_CLS[m.status] };
}
export const VISIBILITY_LABEL: Record<MeetingVisibility, string> = {
  participants: 'Chỉ người tham gia/được thêm',
  unit: 'Cả đơn vị (khối/phòng)',
  company: 'Toàn công ty',
};

export type Meeting = {
  id: string; code: string | null; title: string; type: MeetingType;
  period_id: string | null; unit_id: string | null; project_id: string | null;
  owner_email: string | null; secretary_email: string | null;
  meeting_at: string | null; location: string | null;
  status: MeetingStatus; visibility: MeetingVisibility;
  agenda: string | null; minutes: string | null; decisions: string | null;
  previous_meeting_id: string | null;
  created_by: string | null;
};
export type MeetingRow = Meeting & {
  owner_name: string | null; unit_name: string | null; project_name: string | null;
  prev_code: string | null; prev_title: string | null;
  participant_count: number; action_count: number; pending_requests: number;
};
export type Participant = { email: string; role: string; name: string | null };
export type AccessRequest = { id: string; requester_email: string; requester_name: string | null; reason: string | null; status: string; created_at: string };

const SELECT = `
  SELECT m.id, m.code, m.title, m.type, m.period_id, m.unit_id, m.project_id,
         m.owner_email, m.secretary_email, m.meeting_at::text AS meeting_at, m.location,
         m.status, m.visibility, m.agenda, m.minutes, m.decisions, m.previous_meeting_id, m.created_by,
         ou.display_name AS owner_name, un.name AS unit_name, pr.name AS project_name,
         pm.code AS prev_code, pm.title AS prev_title,
         (SELECT count(*) FROM okr_meeting_participants p WHERE p.meeting_id=m.id)::int AS participant_count,
         (SELECT count(*) FROM okr_initiatives i WHERE i.meeting_id=m.id)::int AS action_count,
         (SELECT count(*) FROM okr_meeting_access_requests r WHERE r.meeting_id=m.id AND r.status='pending')::int AS pending_requests
    FROM okr_meetings m
    LEFT JOIN okr_users ou ON ou.email=m.owner_email
    LEFT JOIN okr_units un ON un.id=m.unit_id
    LEFT JOIN okr_projects pr ON pr.id=m.project_id
    LEFT JOIN okr_meetings pm ON pm.id=m.previous_meeting_id`;

/** Điều kiện SQL "user được XEM cuộc họp" — trả mảnh WHERE + params bổ sung. */
function viewClause(user: OkrUser, startIdx: number): { sql: string; params: unknown[] } {
  const email = user.email.toLowerCase();
  const unitId = user.unit_id;
  if (isExec(user.role)) return { sql: 'TRUE', params: [] };
  const p: unknown[] = [email, unitId];
  const e = `$${startIdx}`, u = `$${startIdx + 1}`;
  return {
    sql: `(lower(m.owner_email)=${e} OR lower(m.secretary_email)=${e} OR m.visibility='company'
       OR (m.visibility='unit' AND m.unit_id=${u})
       OR EXISTS (SELECT 1 FROM okr_meeting_participants mp WHERE mp.meeting_id=m.id AND lower(mp.email)=${e})
       OR EXISTS (SELECT 1 FROM okr_meeting_access_requests mr WHERE mr.meeting_id=m.id AND lower(mr.requester_email)=${e} AND mr.status='approved'))`,
    params: p,
  };
}

export async function listMeetings(user: OkrUser): Promise<MeetingRow[]> {
  const v = viewClause(user, 1);
  return query<MeetingRow>(`${SELECT} WHERE ${v.sql} ORDER BY m.meeting_at DESC NULLS LAST, m.created_at DESC`, v.params);
}

export async function getMeeting(id: string): Promise<MeetingRow | null> {
  return queryOne<MeetingRow>(`${SELECT} WHERE m.id=$1`, [id]);
}

/** Danh sách gọn cuộc họp user được xem — cho dropdown gắn việc vào cuộc họp. */
export async function listMeetingOptions(
  user: OkrUser,
): Promise<{ id: string; code: string | null; title: string }[]> {
  const v = viewClause(user, 1);
  return query<{ id: string; code: string | null; title: string }>(
    `SELECT m.id, m.code, m.title FROM okr_meetings m
      WHERE m.status <> 'cancelled' AND ${v.sql}
      ORDER BY m.meeting_at DESC NULLS LAST, m.created_at DESC LIMIT 200`,
    v.params,
  );
}

export async function listParticipants(meetingId: string): Promise<Participant[]> {
  return query<Participant>(
    `SELECT p.email, p.role, u.display_name AS name FROM okr_meeting_participants p
       LEFT JOIN okr_users u ON u.email=p.email WHERE p.meeting_id=$1 ORDER BY p.role, u.display_name NULLS LAST, p.email`,
    [meetingId],
  );
}

/** User có được XEM nội dung cuộc họp này không (owner/thư ký/tham gia/được duyệt/visibility). */
export async function canViewMeeting(user: OkrUser, m: Meeting): Promise<boolean> {
  if (isExec(user.role)) return true;
  const email = user.email.toLowerCase();
  if (m.owner_email?.toLowerCase() === email || m.secretary_email?.toLowerCase() === email) return true;
  if (m.visibility === 'company') return true;
  if (m.visibility === 'unit' && m.unit_id && m.unit_id === user.unit_id) return true;
  const r = await queryOne<{ n: number }>(
    `SELECT (
       EXISTS(SELECT 1 FROM okr_meeting_participants p WHERE p.meeting_id=$1 AND lower(p.email)=$2)
       OR EXISTS(SELECT 1 FROM okr_meeting_access_requests r WHERE r.meeting_id=$1 AND lower(r.requester_email)=$2 AND r.status='approved')
     )::int AS n`,
    [m.id, email],
  );
  return (r?.n ?? 0) > 0;
}

/** Được sửa cuộc họp (chủ trì / thư ký / điều hành). */
export function canManageMeeting(user: OkrUser, m: Meeting): boolean {
  if (isExec(user.role)) return true;
  const email = user.email.toLowerCase();
  return m.owner_email?.toLowerCase() === email || m.secretary_email?.toLowerCase() === email;
}

async function nextMeetingCode(): Promise<string> {
  const r = await queryOne<{ n: number }>(
    `SELECT COALESCE(MAX((substring(code from 'MTG-([0-9]+)'))::int),0)+1 AS n FROM okr_meetings WHERE code ~ '^MTG-[0-9]+$'`,
  );
  return `MTG-${String(r?.n ?? 1).padStart(2, '0')}`;
}

export type MeetingInput = {
  title: string; type: MeetingType; period_id: string | null; unit_id: string | null; project_id: string | null;
  owner_email: string | null; secretary_email: string | null; meeting_at: string | null; location: string | null;
  status: MeetingStatus; visibility: MeetingVisibility; agenda: string | null; previous_meeting_id: string | null;
};

export async function createMeeting(input: MeetingInput, createdBy: string): Promise<string> {
  const code = await nextMeetingCode();
  const row = await queryOne<{ id: string }>(
    `INSERT INTO okr_meetings (code, title, type, period_id, unit_id, project_id, owner_email, secretary_email,
        meeting_at, location, status, visibility, agenda, previous_meeting_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
    [code, input.title, input.type, input.period_id, input.unit_id, input.project_id, input.owner_email,
     input.secretary_email, input.meeting_at || null, input.location, input.status, input.visibility, input.agenda,
     input.previous_meeting_id, createdBy],
  );
  return row!.id;
}

export async function updateMeeting(id: string, input: MeetingInput): Promise<void> {
  await query(
    `UPDATE okr_meetings SET title=$2, type=$3, period_id=$4, unit_id=$5, project_id=$6, owner_email=$7,
        secretary_email=$8, meeting_at=$9, location=$10, status=$11, visibility=$12, agenda=$13,
        previous_meeting_id=$14, updated_at=now()
      WHERE id=$1`,
    [id, input.title, input.type, input.period_id, input.unit_id, input.project_id, input.owner_email,
     input.secretary_email, input.meeting_at || null, input.location, input.status, input.visibility, input.agenda,
     input.previous_meeting_id],
  );
}

/** Cuộc họp NỐI TIẾP (follow-up) = các cuộc họp có previous_meeting_id = id này (lọc quyền xem). */
export async function listFollowUpMeetings(
  meetingId: string, user: OkrUser,
): Promise<{ id: string; code: string | null; title: string; meeting_at: string | null }[]> {
  const v = viewClause(user, 2);
  return query<{ id: string; code: string | null; title: string; meeting_at: string | null }>(
    `SELECT m.id, m.code, m.title, m.meeting_at::text AS meeting_at FROM okr_meetings m
      WHERE m.previous_meeting_id=$1 AND ${v.sql}
      ORDER BY m.meeting_at DESC NULLS LAST, m.created_at DESC`,
    [meetingId, ...v.params],
  );
}

/** Cập nhật biên bản + quyết định (thường sau khi họp). */
export async function updateMinutes(id: string, minutes: string | null, decisions: string | null): Promise<void> {
  await query('UPDATE okr_meetings SET minutes=$2, decisions=$3, updated_at=now() WHERE id=$1', [id, minutes, decisions]);
}

export async function deleteMeeting(id: string): Promise<void> {
  await query('DELETE FROM okr_meetings WHERE id=$1', [id]);
}

/** Thay toàn bộ danh sách người tham gia (email + role). */
export async function setParticipants(meetingId: string, people: { email: string; role: string }[]): Promise<void> {
  await query('DELETE FROM okr_meeting_participants WHERE meeting_id=$1', [meetingId]);
  for (const p of people) {
    if (!p.email.trim()) continue;
    await query(
      `INSERT INTO okr_meeting_participants (meeting_id, email, role) VALUES ($1,$2,$3)
       ON CONFLICT (meeting_id, email) DO UPDATE SET role=EXCLUDED.role`,
      [meetingId, p.email.trim().toLowerCase(), p.role],
    );
  }
}

export type ActionItem = {
  id: string; code: string | null; title: string; status: string;
  owner_name: string | null; objective_id: string | null; project_id: string | null; due_on: string | null;
};
/** Hành động (next actions) gắn cuộc họp = okr_initiatives có meeting_id. */
export async function listActionItems(meetingId: string): Promise<ActionItem[]> {
  return query<ActionItem>(
    `SELECT i.id, i.code, i.title, i.status, ou.display_name AS owner_name,
            i.objective_id, i.project_id, i.due_on::text AS due_on
       FROM okr_initiatives i LEFT JOIN okr_users ou ON ou.email=i.owner_email
      WHERE i.meeting_id=$1 ORDER BY i.created_at`,
    [meetingId],
  );
}

// ── Yêu cầu xem ──
export async function requestAccess(meetingId: string, requester: string, reason: string | null): Promise<void> {
  await query(
    `INSERT INTO okr_meeting_access_requests (meeting_id, requester_email, reason)
     VALUES ($1,$2,$3) ON CONFLICT (meeting_id, requester_email)
     DO UPDATE SET reason=EXCLUDED.reason, status='pending', created_at=now()`,
    [meetingId, requester.toLowerCase(), reason],
  );
}
export async function listAccessRequests(meetingId: string, status = 'pending'): Promise<AccessRequest[]> {
  return query<AccessRequest>(
    `SELECT r.id, r.requester_email, u.display_name AS requester_name, r.reason, r.status, r.created_at::text
       FROM okr_meeting_access_requests r LEFT JOIN okr_users u ON u.email=r.requester_email
      WHERE r.meeting_id=$1 AND r.status=$2 ORDER BY r.created_at DESC`,
    [meetingId, status],
  );
}
export async function myAccessRequest(meetingId: string, email: string): Promise<AccessRequest | null> {
  return queryOne<AccessRequest>(
    `SELECT id, requester_email, NULL AS requester_name, reason, status, created_at::text
       FROM okr_meeting_access_requests WHERE meeting_id=$1 AND lower(requester_email)=lower($2)`,
    [meetingId, email],
  );
}
export async function decideAccessRequest(requestId: string, approve: boolean, deciderEmail: string): Promise<{ meetingId: string; requester: string } | null> {
  const r = await queryOne<{ meeting_id: string; requester_email: string }>(
    `UPDATE okr_meeting_access_requests SET status=$2, decided_by=$3
      WHERE id=$1 RETURNING meeting_id, requester_email`,
    [requestId, approve ? 'approved' : 'denied', deciderEmail],
  );
  if (!r) return null;
  // Được duyệt → thêm làm watcher để lần sau xem được ổn định.
  if (approve) {
    await query(
      `INSERT INTO okr_meeting_participants (meeting_id, email, role) VALUES ($1,$2,'watcher')
       ON CONFLICT (meeting_id, email) DO NOTHING`,
      [r.meeting_id, r.requester_email.toLowerCase()],
    );
  }
  return { meetingId: r.meeting_id, requester: r.requester_email };
}
