import { query } from './db';
import { isExec } from './rbac';
import type { OkrUser } from './users';

// Sự kiện lịch: công việc (theo hạn), cuộc họp (theo giờ họp), check-in KR (theo ngày tạo).
export type CalEventType = 'task' | 'meeting' | 'checkin';
export type CalEvent = {
  date: string;      // YYYY-MM-DD
  type: CalEventType;
  title: string;
  href: string;
  sub: string | null;
  status: string | null;
};

export type CalScope = 'mine' | 'all';

/**
 * Sự kiện trong [from, to] (YYYY-MM-DD).
 *  - scope='mine' (mặc định): chỉ việc mình được giao · cuộc họp mình dự · check-in mình tạo.
 *  - scope='all' (chỉ quản trị): mọi việc/check-in + cuộc họp user được xem.
 * Cuộc họp luôn giới hạn theo quyền xem (kể cả 'all' với non-exec).
 */
export async function calendarEvents(
  from: string, to: string, user: OkrUser, scope: CalScope = 'mine',
): Promise<CalEvent[]> {
  const events: CalEvent[] = [];
  // 'all' chỉ dành cho quản trị (exec/ceo/cfo). Non-exec dù truyền 'all' vẫn bị ép về 'mine'.
  const canAll = scope === 'all' && isExec(user.role);

  // 1) Công việc theo hạn (due_on), trừ đã xong/huỷ để lịch gọn. mine → chỉ việc mình được giao.
  const tasks = await query<{ id: string; code: string | null; title: string; status: string; due: string; objective_id: string | null; project_id: string | null; owner: string | null }>(
    `SELECT i.id, i.code, i.title, i.status, i.due_on::text AS due, i.objective_id, i.project_id,
            ou.display_name AS owner
       FROM okr_initiatives i LEFT JOIN okr_users ou ON ou.email=i.owner_email
      WHERE i.due_on IS NOT NULL AND i.due_on BETWEEN $1 AND $2
        AND i.status NOT IN ('done','canceled')
        AND ($3 OR lower(i.owner_email)=lower($4))`,
    [from, to, canAll, user.email],
  );
  for (const t of tasks) {
    events.push({
      date: t.due, type: 'task',
      title: `${t.code ? t.code + ' · ' : ''}${t.title}`,
      href: t.objective_id ? `/objectives/${t.objective_id}` : t.project_id ? `/projects/${t.project_id}` : '/tasks',
      sub: t.owner, status: t.status,
    });
  }

  // 2) Cuộc họp theo giờ họp. 'all' (quản trị) = mọi cuộc họp; 'mine' = chỉ cuộc họp mình
  //    chủ trì / thư ký / là người dự / được duyệt xem (KHÔNG lấy theo visibility công ty/khối).
  const meetings = await query<{ id: string; code: string | null; title: string; at: string; status: string; owner: string | null }>(
    `SELECT m.id, m.code, m.title, m.meeting_at::text AS at, m.status, ou.display_name AS owner
       FROM okr_meetings m LEFT JOIN okr_users ou ON ou.email=m.owner_email
      WHERE m.meeting_at IS NOT NULL AND m.meeting_at::date BETWEEN $1 AND $2
        AND ($3 OR lower(m.owner_email)=lower($4) OR lower(m.secretary_email)=lower($4)
             OR EXISTS(SELECT 1 FROM okr_meeting_participants mp WHERE mp.meeting_id=m.id AND lower(mp.email)=lower($4))
             OR EXISTS(SELECT 1 FROM okr_meeting_access_requests mr WHERE mr.meeting_id=m.id AND lower(mr.requester_email)=lower($4) AND mr.status='approved'))`,
    [from, to, canAll, user.email],
  );
  for (const m of meetings) {
    events.push({
      date: m.at.slice(0, 10), type: 'meeting',
      title: `${m.code ? m.code + ' · ' : ''}${m.title}`,
      href: `/meetings/${m.id}`, sub: m.owner, status: m.status,
    });
  }

  // 3) Check-in KR theo ngày tạo. mine → chỉ check-in mình tạo.
  const checkins = await query<{ objective_id: string | null; title: string; created: string; author: string | null }>(
    `SELECT ci.objective_id, k.title, ci.created_at::text AS created, u.display_name AS author
       FROM okr_checkins ci
       LEFT JOIN okr_key_results k ON k.id=ci.key_result_id
       LEFT JOIN okr_users u ON u.email=ci.author_email
      WHERE ci.created_at::date BETWEEN $1 AND $2
        AND ($3 OR lower(ci.author_email)=lower($4))`,
    [from, to, canAll, user.email],
  );
  for (const c of checkins) {
    events.push({
      date: c.created.slice(0, 10), type: 'checkin',
      title: `Check-in: ${c.title ?? 'KR'}`,
      href: c.objective_id ? `/objectives/${c.objective_id}` : '/', sub: c.author, status: null,
    });
  }

  return events;
}
