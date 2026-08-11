import { query } from './db';

// NHẬT KÝ THAY ĐỔI theo thực thể (ai làm gì khi nào) — ghi vào okr_audit_log, đọc theo (entity, entity_id).
// Ghi best-effort: lỗi ghi log KHÔNG được làm hỏng thao tác nghiệp vụ.

export type AuditEntry = {
  id: string;
  actor: string | null;
  actor_name: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

export async function logAudit(input: {
  actor: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  detail?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO okr_audit_log (actor, action, entity, entity_id, detail)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        input.actor,
        input.action,
        input.entity ?? null,
        input.entityId ?? null,
        input.detail ? JSON.stringify(input.detail) : null,
      ],
    );
  } catch (e) {
    console.error('[audit] ghi log lỗi', e);
  }
}

export async function listEntityAudit(entity: string, entityId: string, limit = 100): Promise<AuditEntry[]> {
  return query<AuditEntry>(
    `SELECT a.id::text AS id, a.actor, u.display_name AS actor_name, a.action, a.entity, a.entity_id,
            a.detail, a.created_at::text AS created_at
       FROM okr_audit_log a
       LEFT JOIN okr_users u ON u.email = a.actor
      WHERE a.entity = $1 AND a.entity_id = $2
      ORDER BY a.created_at DESC
      LIMIT $3`,
    [entity, entityId, limit],
  );
}

// Nhãn hành động (tiếng Việt) — hiển thị trong popup nhật ký.
export const AUDIT_ACTION_LABEL: Record<string, string> = {
  'objective.create': 'Tạo OKR',
  'objective.update': 'Sửa OKR',
  'objective.delete': 'Xoá OKR',
  'kr.create': 'Thêm Key Result',
  'kr.update': 'Sửa Key Result',
  'kr.delete': 'Xoá Key Result',
  'checkin.create': 'Check-in tiến độ',
  'initiative.create': 'Thêm công việc',
  'initiative.update': 'Sửa công việc',
  'initiative.delete': 'Xoá công việc',
  'initiative.status': 'Đổi trạng thái công việc',
  'project.create': 'Tạo dự án',
  'project.update': 'Sửa dự án',
  'project.delete': 'Xoá dự án',
  'meeting.create': 'Tạo cuộc họp',
  'meeting.update': 'Sửa cuộc họp',
  'meeting.delete': 'Xoá cuộc họp',
  'meeting.minutes': 'Cập nhật biên bản/quyết định',
};

/** Mô tả ngắn 1 dòng cho 1 entry (nhãn hành động + thông tin phụ trong detail nếu có). */
export function describeAudit(e: AuditEntry): string {
  const base = AUDIT_ACTION_LABEL[e.action] ?? e.action;
  const d = e.detail ?? {};
  const extra: string[] = [];
  if (typeof d.title === 'string' && d.title) extra.push(`"${d.title}"`);
  if (typeof d.field === 'string' && d.field) extra.push(d.field);
  if (typeof d.status === 'string' && d.status) extra.push(`→ ${d.status}`);
  if (typeof d.note === 'string' && d.note) extra.push(d.note);
  return extra.length ? `${base}: ${extra.join(' · ')}` : base;
}
