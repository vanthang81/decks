'use server';

import { requireUser } from '@/lib/current-user';
import { listEntityAudit, describeAudit } from '@/lib/audit';

export type AuditRow = { actor: string; text: string; at: string };

/** Nạp nhật ký thay đổi của 1 thực thể (bất kỳ ai đăng nhập cũng xem được — chỉ đọc). */
export async function loadEntityAuditAction(entity: string, entityId: string): Promise<AuditRow[]> {
  await requireUser();
  const rows = await listEntityAudit(entity, entityId, 100);
  return rows.map((r) => ({
    actor: r.actor_name || r.actor || 'Hệ thống',
    text: describeAudit(r),
    at: r.created_at,
  }));
}
