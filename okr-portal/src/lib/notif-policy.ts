// ============================================================================
// CHÍNH SÁCH THÔNG BÁO THEO NHÓM QUYỀN (per permission-group notification policy).
// CFO 14/09: user CHỈ-XEM (nhóm "Người xem") MẶC ĐỊNH KHÔNG nhận bất kỳ báo cáo/thông báo nào.
// Quản trị chỉnh được ở Quản trị → Phân quyền (ma trận Nhóm quyền × loại thông báo).
//
// 2 loại (category), gộp mọi kênh thông báo/báo cáo hiện có:
//  - notify  = THÔNG BÁO & TƯƠNG TÁC: chuông + email khi được @nhắc / trả lời / bình luận / GIAO VIỆC.
//  - report  = BÁO CÁO & NHẮC ĐỊNH KỲ: bản tin tuần, tóm tắt sáng, nhắc việc đến hạn/quá hạn,
//              tổng hợp quá hạn tuần, thay đổi công việc, nhắc check-in.
//
// Điểm chốt DUY NHẤT = `allowedByPolicy(emails, type)` → tập email ĐƯỢC PHÉP nhận loại đó.
// Mọi nơi gửi thông báo/email (notify/notifySimple/digest/daily-digest/task-reminders/
// task-changes/check-in reminders) đều lọc người nhận qua hàm này.
// ============================================================================
import { query } from './db';
import { getSetting, setSetting } from './settings';
import { GROUP_KEYS, type GroupKey } from './capabilities';
import { userGroupKey } from './access';

export const NOTIF_POLICY_KEY = 'notif_group_policy';

export type NotifCategory = 'notify' | 'report';

export const NOTIF_CATEGORY_META: { key: NotifCategory; label: string; desc: string }[] = [
  {
    key: 'notify',
    label: 'Thông báo & tương tác',
    desc: 'Chuông + email khi được @nhắc tên, trả lời/bình luận mục mình phụ trách, hoặc được giao việc mới.',
  },
  {
    key: 'report',
    label: 'Báo cáo & nhắc định kỳ',
    desc: 'Bản tin điều hành tuần, tóm tắt công việc buổi sáng, nhắc việc sắp/đến/quá hạn, tổng hợp quá hạn tuần, thông báo thay đổi công việc, nhắc check-in.',
  },
];

// Ánh xạ TỪNG loại thông báo → category. Loại KHÔNG có ở đây (vd yêu cầu duyệt xem họp,
// lời mời user — luôn gửi cho người có quyền duyệt) sẽ KHÔNG bị chặn bởi chính sách này.
const CATEGORY_OF: Record<string, NotifCategory> = {
  // notify (tương tác trực tiếp tới cá nhân)
  mention: 'notify',
  reply: 'notify',
  comment_mine: 'notify',
  assignment: 'notify',
  // report (đẩy định kỳ / tổng hợp)
  task_due_soon: 'report',
  task_overdue: 'report',
  task_overdue_weekly: 'report',
  daily_digest: 'report',
  weekly_digest: 'report',
  task_change: 'report',
  checkin_reminder: 'report',
};

export function categoryOfType(type: string): NotifCategory | null {
  return CATEGORY_OF[type] ?? null;
}

export type GroupPolicy = Record<GroupKey, { notify: boolean; report: boolean }>;

/** Mặc định: MỌI nhóm nhận đủ (giữ hành vi cũ), RIÊNG "Người xem" (viewer) tắt hết (CFO 14/09). */
export function defaultGroupPolicy(): GroupPolicy {
  const out = {} as GroupPolicy;
  for (const g of GROUP_KEYS) {
    const on = g !== 'viewer';
    out[g] = { notify: on, report: on };
  }
  return out;
}

/** Đọc chính sách (điền đủ default rồi ghi đè giá trị đã lưu). */
export async function getNotifGroupPolicy(): Promise<GroupPolicy> {
  const stored = await getSetting<Record<string, { notify?: boolean; report?: boolean }> | null>(
    NOTIF_POLICY_KEY,
    null,
  );
  const base = defaultGroupPolicy();
  if (stored && typeof stored === 'object') {
    for (const g of GROUP_KEYS) {
      const s = stored[g];
      if (s && typeof s === 'object') {
        if (typeof s.notify === 'boolean') base[g].notify = s.notify;
        if (typeof s.report === 'boolean') base[g].report = s.report;
      }
    }
  }
  return base;
}

export async function setNotifGroupPolicy(policy: GroupPolicy): Promise<void> {
  // Chỉ lưu 7 nhóm hợp lệ, mỗi nhóm 2 cờ boolean.
  const clean: Record<string, { notify: boolean; report: boolean }> = {};
  for (const g of GROUP_KEYS) {
    const p = policy[g] ?? { notify: true, report: true };
    clean[g] = { notify: !!p.notify, report: !!p.report };
  }
  await setSetting(NOTIF_POLICY_KEY, clean);
}

/** Nhóm này có được nhận loại thông báo `type` không (theo category). */
export function groupAllowsType(groupKey: GroupKey, type: string, policy: GroupPolicy): boolean {
  const cat = categoryOfType(type);
  if (!cat) return true; // loại không thuộc chính sách (vd duyệt/ mời) → luôn cho
  return policy[groupKey]?.[cat] !== false;
}

/**
 * Lọc danh sách email → CHỈ giữ người mà NHÓM QUYỀN của họ được nhận loại `type`.
 * Trả về Set email (chữ THƯỜNG). Loại không thuộc chính sách → giữ nguyên tất cả.
 */
export async function allowedByPolicy(emails: string[], type: string): Promise<Set<string>> {
  const lc = Array.from(new Set(emails.map((e) => (e ?? '').trim().toLowerCase()).filter(Boolean)));
  if (lc.length === 0) return new Set();
  if (!categoryOfType(type)) return new Set(lc); // không quản → cho hết
  const policy = await getNotifGroupPolicy();
  const rows = await query<{ email: string; role: string; perm_group: string | null }>(
    'SELECT lower(email) AS email, role, perm_group FROM okr_users WHERE lower(email) = ANY($1)',
    [lc],
  );
  const out = new Set<string>();
  for (const r of rows) {
    const g = userGroupKey({ email: r.email, role: r.role, perm_group: r.perm_group } as Parameters<typeof userGroupKey>[0]);
    if (groupAllowsType(g, type, policy)) out.add(r.email);
  }
  return out;
}
