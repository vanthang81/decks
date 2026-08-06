import { query, queryOne } from './db';
import type { Role } from './rbac';

// Hồ sơ 360° người dùng. Quản trị (viewer là exec/ceo/cfo) xem ĐẦY ĐỦ (định danh + số liệu +
// chi tiết OKR/dự án/việc/check-in/họp/đăng nhập/nhật ký). Người thường chỉ xem định danh + SỐ LƯỢNG.

export type ProfileIdentity = {
  email: string; display_name: string | null; title: string | null; role: Role;
  unit_id: string | null; unit_name: string | null; is_active: boolean;
  avatar_url: string | null; created_at: string | null;
  last_login_at: string | null; login_count: number;
};
export type ProfileCounts = {
  objectives: number; krs: number; projects: number;
  tasks: number; tasksDone: number; tasksOpen: number; tasksOverdue: number;
  checkins: number; meetings: number;
};
export type ProfileListItem = { id: string; code: string | null; title: string; sub?: string | null; href: string; badge?: string | null; badgeCls?: string | null };
export type UserProfile = {
  identity: ProfileIdentity;
  counts: ProfileCounts;
  full: boolean;
  objectives?: ProfileListItem[];
  projects?: ProfileListItem[];
  tasks?: ProfileListItem[];
  checkins?: { title: string; sub: string; at: string }[];
  meetings?: ProfileListItem[];
  activity?: { action: string; entity: string | null; at: string }[];
};

export async function getUserProfile(email: string, full: boolean): Promise<UserProfile | null> {
  const identity = await queryOne<ProfileIdentity>(
    `SELECT u.email, u.display_name, u.title, u.role, u.unit_id, un.name AS unit_name,
            u.is_active, u.avatar_url, u.created_at::text AS created_at,
            u.last_login_at::text AS last_login_at, COALESCE(u.login_count,0) AS login_count
       FROM okr_users u LEFT JOIN okr_units un ON un.id = u.unit_id
      WHERE lower(u.email)=lower($1)`,
    [email],
  );
  if (!identity) return null;
  const e = identity.email;

  const counts = (await queryOne<ProfileCounts>(
    `SELECT
       (SELECT count(*) FROM okr_objectives o WHERE lower(o.owner_email)=lower($1))::int AS objectives,
       (SELECT count(*) FROM okr_key_results k JOIN okr_objectives o ON o.id=k.objective_id
          WHERE lower(o.owner_email)=lower($1))::int AS krs,
       (SELECT count(*) FROM okr_projects p WHERE lower(p.owner_email)=lower($1))::int AS projects,
       (SELECT count(*) FROM okr_initiatives i WHERE lower(i.owner_email)=lower($1))::int AS tasks,
       (SELECT count(*) FROM okr_initiatives i WHERE lower(i.owner_email)=lower($1) AND i.status='done')::int AS "tasksDone",
       (SELECT count(*) FROM okr_initiatives i WHERE lower(i.owner_email)=lower($1) AND i.status NOT IN ('done','canceled'))::int AS "tasksOpen",
       (SELECT count(*) FROM okr_initiatives i WHERE lower(i.owner_email)=lower($1)
          AND i.due_on < current_date AND i.status NOT IN ('done','canceled'))::int AS "tasksOverdue",
       (SELECT count(*) FROM okr_checkins c WHERE lower(c.author_email)=lower($1))::int AS checkins,
       (SELECT count(*) FROM okr_meetings m WHERE lower(m.owner_email)=lower($1) OR lower(m.secretary_email)=lower($1)
          OR EXISTS (SELECT 1 FROM okr_meeting_participants mp WHERE mp.meeting_id=m.id AND lower(mp.email)=lower($1)))::int AS meetings`,
    [e],
  ))!;

  if (!full) return { identity, counts, full: false };

  // Chi tiết 360° — best-effort: nếu 1 truy vấn lỗi (schema drift) thì vẫn hiện định danh + số liệu,
  // KHÔNG để 500 cả trang. Mỗi nhánh tự bọc catch → trả [] khi lỗi.
  const safe = <T>(p: Promise<T[]>): Promise<T[]> => p.catch(() => [] as T[]);
  const [objectives, projects, tasks, checkins, meetings, activity] = await Promise.all([
    safe(query<ProfileListItem>(
      `SELECT o.id, o.code, o.title,
              CASE o.level WHEN 'company' THEN 'Công ty' WHEN 'division' THEN 'Khối'
                           WHEN 'department' THEN 'Phòng' WHEN 'individual' THEN 'Cá nhân' ELSE o.level END AS sub,
              ('/objectives/'||o.id) AS href,
              round(o.progress)::text || '%' AS badge, 'blue' AS "badgeCls"
         FROM okr_objectives o WHERE lower(o.owner_email)=lower($1)
         ORDER BY o.code NULLS LAST, o.title LIMIT 100`, [e])),
    safe(query<ProfileListItem>(
      `SELECT p.id, p.code, p.name AS title,
              CASE p.status WHEN 'active' THEN 'Đang chạy' WHEN 'done' THEN 'Hoàn thành'
                            WHEN 'paused' THEN 'Tạm dừng' ELSE 'Lưu trữ' END AS sub,
              ('/projects/'||p.id) AS href,
              round(COALESCE((SELECT avg(i.progress) FROM okr_initiatives i
                               WHERE i.project_id = p.id AND i.status <> 'canceled'), 0))::text || '%' AS badge,
              'blue' AS "badgeCls"
         FROM okr_projects p WHERE lower(p.owner_email)=lower($1)
         ORDER BY p.code NULLS LAST, p.name LIMIT 100`, [e])),
    safe(query<ProfileListItem>(
      `SELECT i.id, i.code, i.title,
              (CASE i.status WHEN 'todo' THEN 'Chưa làm' WHEN 'in_progress' THEN 'Đang làm'
                             WHEN 'blocked' THEN 'Vướng' WHEN 'done' THEN 'Xong' ELSE 'Huỷ' END
               || CASE WHEN i.due_on < current_date AND i.status NOT IN ('done','canceled')
                       THEN ' · QUÁ HẠN' ELSE '' END) AS sub,
              (COALESCE('/objectives/'||i.objective_id, '/projects/'||i.project_id, '/tasks')) AS href,
              CASE i.status WHEN 'todo' THEN 'Chưa làm' WHEN 'in_progress' THEN 'Đang làm'
                            WHEN 'blocked' THEN 'Vướng' WHEN 'done' THEN 'Xong' ELSE 'Huỷ' END AS badge,
              CASE i.status WHEN 'done' THEN 'green' WHEN 'blocked' THEN 'red' WHEN 'in_progress' THEN 'blue' ELSE 'gray' END AS "badgeCls"
         FROM okr_initiatives i WHERE lower(i.owner_email)=lower($1)
         ORDER BY CASE i.status WHEN 'blocked' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'todo' THEN 2 WHEN 'done' THEN 3 ELSE 4 END,
                  i.due_on NULLS LAST LIMIT 200`, [e])),
    safe(query<{ title: string; sub: string; at: string }>(
      `SELECT COALESCE(k.title, o.title, 'Check-in') AS title,
              COALESCE(c.note, '') AS sub, c.created_at::text AS at
         FROM okr_checkins c
         LEFT JOIN okr_key_results k ON k.id=c.key_result_id
         LEFT JOIN okr_objectives o ON o.id=c.objective_id
        WHERE lower(c.author_email)=lower($1) ORDER BY c.created_at DESC LIMIT 20`, [e])),
    safe(query<ProfileListItem>(
      `SELECT m.id, m.code, m.title,
              to_char(m.meeting_at,'DD/MM/YYYY') AS sub, ('/meetings/'||m.id) AS href, NULL AS badge, NULL AS "badgeCls"
         FROM okr_meetings m
        WHERE lower(m.owner_email)=lower($1) OR lower(m.secretary_email)=lower($1)
           OR EXISTS (SELECT 1 FROM okr_meeting_participants mp WHERE mp.meeting_id=m.id AND lower(mp.email)=lower($1))
        ORDER BY m.meeting_at DESC NULLS LAST LIMIT 30`, [e])),
    safe(query<{ action: string; entity: string | null; at: string }>(
      `SELECT action, entity, created_at::text AS at FROM okr_audit_log
        WHERE lower(actor)=lower($1) ORDER BY created_at DESC LIMIT 25`, [e])),
  ]);

  return { identity, counts, full: true, objectives, projects, tasks, checkins, meetings, activity };
}
