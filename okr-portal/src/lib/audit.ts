import { query, queryOne } from './db';
import { getSetting, setSetting } from './settings';

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
  'auth.login': 'Đăng nhập',
  'audit.prune': 'Dọn nhật ký (thủ công)',
  'audit.clear': 'Xoá sạch nhật ký',
  'audit.retention': 'Đổi cấu hình lưu nhật ký',
  'audit.autoprune': 'Tự động dọn nhật ký',
  'okr.weight': 'Đổi trọng số OKR / BSC',
  'user.email_change': 'Đổi email người dùng',
  'user.handover': 'Bàn giao công việc',
  'position.save': 'Lưu vị trí / chức danh',
  'position.delete': 'Xoá vị trí / chức danh',
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

// ============================================================================
// NHẬT KÝ HOẠT ĐỘNG TOÀN HỆ THỐNG (trang /admin/activity) — lọc + phân trang + dọn (retention).
// KHÔNG ghi lượt xem trang (page view) → tránh phình DB; chỉ ghi ĐĂNG NHẬP + thao tác thay đổi dữ liệu.
// ============================================================================

// Gom hành động thành NHÓM để lọc gọn (khớp theo tiền tố action).
export const AUDIT_GROUPS: { key: string; label: string; prefixes: string[] }[] = [
  { key: 'auth', label: 'Đăng nhập', prefixes: ['auth.'] },
  { key: 'okr', label: 'OKR', prefixes: ['objective.', 'okr.'] },
  { key: 'kr', label: 'Key Result & Check-in', prefixes: ['kr.', 'checkin.'] },
  { key: 'task', label: 'Công việc', prefixes: ['initiative.'] },
  { key: 'project', label: 'Dự án', prefixes: ['project.'] },
  { key: 'meeting', label: 'Cuộc họp', prefixes: ['meeting.'] },
  { key: 'user', label: 'Người dùng & phân quyền', prefixes: ['user.', 'position.', 'perm.'] },
  { key: 'system', label: 'Hệ thống & nhật ký', prefixes: ['audit.', 'system.'] },
];

export type AuditFilter = { actor?: string; group?: string; from?: string; to?: string; q?: string };

function buildAuditWhere(f: AuditFilter): { sql: string; params: unknown[] } {
  const cond: string[] = [];
  const params: unknown[] = [];
  if (f.actor) { params.push(f.actor); cond.push(`a.actor = $${params.length}`); }
  if (f.group) {
    const g = AUDIT_GROUPS.find((x) => x.key === f.group);
    if (g) { params.push(g.prefixes.map((p) => p + '%')); cond.push(`a.action LIKE ANY($${params.length})`); }
  }
  if (f.from) { params.push(f.from); cond.push(`a.created_at >= $${params.length}::date`); }
  if (f.to) { params.push(f.to); cond.push(`a.created_at < ($${params.length}::date + 1)`); }
  if (f.q) {
    params.push('%' + f.q.trim().toLowerCase() + '%');
    const i = params.length;
    cond.push(`(lower(a.action) LIKE $${i} OR lower(coalesce(a.entity_id,'')) LIKE $${i}
      OR lower(coalesce(a.detail::text,'')) LIKE $${i} OR lower(coalesce(u.display_name,'')) LIKE $${i}
      OR lower(coalesce(a.actor,'')) LIKE $${i})`);
  }
  return { sql: cond.length ? 'WHERE ' + cond.join(' AND ') : '', params };
}

export async function listAudit(f: AuditFilter, limit = 50, offset = 0): Promise<AuditEntry[]> {
  const { sql, params } = buildAuditWhere(f);
  return query<AuditEntry>(
    `SELECT a.id::text AS id, a.actor, u.display_name AS actor_name, a.action, a.entity, a.entity_id,
            a.detail, a.created_at::text AS created_at
       FROM okr_audit_log a
       LEFT JOIN okr_users u ON u.email = a.actor
       ${sql}
      ORDER BY a.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );
}

export async function countAudit(f: AuditFilter): Promise<number> {
  const { sql, params } = buildAuditWhere(f);
  const r = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM okr_audit_log a LEFT JOIN okr_users u ON u.email = a.actor ${sql}`,
    params,
  );
  return r?.n ?? 0;
}

export async function auditStats(): Promise<{ total: number; oldest: string | null; newest: string | null }> {
  const r = await queryOne<{ total: number; oldest: string | null; newest: string | null }>(
    `SELECT count(*)::int AS total, min(created_at)::text AS oldest, max(created_at)::text AS newest FROM okr_audit_log`,
  );
  return r ?? { total: 0, oldest: null, newest: null };
}

/** Xoá thủ công: log CŨ HƠN `days` ngày. Trả số dòng đã xoá. */
export async function deleteAuditBefore(days: number): Promise<number> {
  const r = await queryOne<{ n: number }>(
    `WITH d AS (DELETE FROM okr_audit_log WHERE created_at < now() - ($1 || ' days')::interval RETURNING 1)
     SELECT count(*)::int AS n FROM d`,
    [String(Math.max(0, Math.floor(days)))],
  );
  return r?.n ?? 0;
}

/** Xoá SẠCH toàn bộ nhật ký. */
export async function clearAllAudit(): Promise<number> {
  const r = await queryOne<{ n: number }>(
    `WITH d AS (DELETE FROM okr_audit_log RETURNING 1) SELECT count(*)::int AS n FROM d`,
  );
  return r?.n ?? 0;
}

// ---- Cấu hình RETENTION (tự động xoá sau N ngày) — lưu okr_settings ----
const RETENTION_KEY = 'audit_retention_days';
export const AUDIT_RETENTION_DEFAULT = 180;      // mặc định giữ 6 tháng
export const AUDIT_RETENTION_OPTIONS = [0, 30, 60, 90, 180, 365]; // 0 = không tự xoá

export async function getAuditRetentionDays(): Promise<number> {
  const v = await getSetting<number>(RETENTION_KEY, AUDIT_RETENTION_DEFAULT);
  return typeof v === 'number' && v >= 0 ? Math.floor(v) : AUDIT_RETENTION_DEFAULT;
}
export async function setAuditRetentionDays(days: number): Promise<void> {
  const n = AUDIT_RETENTION_OPTIONS.includes(days) ? days : AUDIT_RETENTION_DEFAULT;
  await setSetting(RETENTION_KEY, n);
}

/** Dọn tự động theo retention đã cấu hình (cron gọi). Trả số dòng xoá; 0 nếu tắt (retention=0). */
export async function pruneAuditByRetention(): Promise<{ retentionDays: number; deleted: number }> {
  const days = await getAuditRetentionDays();
  if (!days || days <= 0) return { retentionDays: 0, deleted: 0 };
  const deleted = await deleteAuditBefore(days);
  return { retentionDays: days, deleted };
}
