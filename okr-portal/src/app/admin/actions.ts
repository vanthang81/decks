'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/current-user';
import { isRole, isExec, type Role } from '@/lib/rbac';
import { loadAccess, canManageSystem, canAssignPerms, invalidateAccess, PERM_GROUPS_KEY } from '@/lib/access';
import { DEFAULT_GROUPS, CAPABILITIES, type CapKey } from '@/lib/capabilities';
import {
  upsertUser,
  setUserActive,
  removeUser,
  countActiveExecs,
  getUser,
  changeUserEmail,
} from '@/lib/users';
import { createUnit, updateUnit, deleteUnit, recordUnitVersion, listUnits, subtreeIds, type UnitType } from '@/lib/org';
import { createPeriod, setCurrentPeriod, setPeriodStatus } from '@/lib/periods';
import { syncAllKpi } from '@/lib/kpi';
import { redirect } from 'next/navigation';
import { setSetting } from '@/lib/settings';
import { REMINDER_KEY, runCheckinReminders, type ReminderConfig } from '@/lib/reminders';
import { reassignOwnership } from '@/lib/handover';
import { logAudit } from '@/lib/audit';

async function requireExec() {
  const user = await requireUser();
  const access = await loadAccess();
  if (!canManageSystem(user, access)) throw new Error('Bạn không có quyền quản trị hệ thống.');
  return user;
}

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? '').trim();
}
function orNull(s: string): string | null {
  return s === '' ? null : s;
}

// ---------- Người dùng ----------
export async function saveUserAction(fd: FormData) {
  const me = await requireExec();
  const access = await loadAccess();
  const role = str(fd, 'role');
  // Khoá định danh = email hiện tại; `new_email` (chỉ có ở popup Sửa) cho phép ĐỔI email nếu nhập sai.
  let key = str(fd, 'email');
  const newEmail = str(fd, 'new_email').toLowerCase();
  if (newEmail && newEmail !== key.toLowerCase()) {
    // Không cho đổi email CHÍNH MÌNH (tránh mất phiên đăng nhập → tự khoá).
    if (key.toLowerCase() === me.email.toLowerCase()) {
      throw new Error('Không đổi email của chính bạn (tránh mất phiên). Nhờ quản trị viên khác đổi giúp.');
    }
    await changeUserEmail(key, newEmail); // dời toàn bộ dữ liệu/lịch sử; ném lỗi nếu email mới không hợp lệ/trùng
    await logAudit({ actor: me.email, action: 'user.email_change', entity: 'user', entityId: newEmail, detail: { from: key, to: newEmail } });
    key = newEmail;
  }
  // Chỉ người có quyền "Phân quyền" mới đặt được Nhóm quyền; người khác giữ nguyên.
  const grp = orNull(str(fd, 'perm_group'));
  const permGroup = canAssignPerms(me, access) ? grp : (await getUser(key))?.perm_group ?? null;
  await upsertUser({
    email: key,
    display_name: orNull(str(fd, 'display_name')),
    title: orNull(str(fd, 'title')),
    role: (isRole(role) ? role : 'staff') as Role,
    unit_id: orNull(str(fd, 'unit_id')),
    perm_group: permGroup,
  });
  invalidateAccess();
  revalidatePath('/admin/users');
}

export async function toggleUserAction(fd: FormData) {
  const me = await requireExec();
  const email = str(fd, 'email');
  const active = str(fd, 'active') === '1';
  // Không tự khoá chính mình nếu là exec cuối cùng.
  if (!active && email.toLowerCase() === me.email.toLowerCase()) {
    const u = await getUser(email);
    if (isExec(u?.role) && (await countActiveExecs()) <= 1) {
      throw new Error('Không thể khoá CEO/CFO cuối cùng.');
    }
  }
  await setUserActive(email, active);
  revalidatePath('/admin/users');
}

export async function removeUserAction(fd: FormData) {
  const me = await requireExec();
  const email = str(fd, 'email');
  if (email.toLowerCase() === me.email.toLowerCase()) throw new Error('Không thể xoá chính mình.');
  const u = await getUser(email);
  if (isExec(u?.role) && (await countActiveExecs()) <= 1) {
    throw new Error('Không thể xoá CEO/CFO cuối cùng.');
  }
  await removeUser(email);
  revalidatePath('/admin/users');
}

/**
 * BÀN GIAO công việc khi 1 nhân sự nghỉ: chuyển quyền phụ trách (owner) từ người nghỉ → người thay thế.
 * Chỉ Quản trị hệ thống. Có thể kèm khoá tài khoản người nghỉ (không khoá CEO/CFO cuối).
 */
export async function handoverAction(fd: FormData) {
  const me = await requireExec();
  const from = str(fd, 'from');
  const to = str(fd, 'to');
  if (!from || !to) throw new Error('Thiếu người nghỉ hoặc người thay thế.');
  if (from.toLowerCase() === to.toLowerCase()) throw new Error('Người thay thế phải khác người nghỉ.');
  const toUser = await getUser(to);
  if (!toUser) throw new Error('Người thay thế chưa có trong hệ thống.');
  if (!toUser.is_active) throw new Error('Người thay thế đang bị khoá — mở khoá trước khi bàn giao.');

  const tasks = (['open', 'all', 'none'] as const).includes(str(fd, 'tasks') as never)
    ? (str(fd, 'tasks') as 'open' | 'all' | 'none')
    : 'open';
  const res = await reassignOwnership({
    from,
    to,
    tasks,
    objectives: str(fd, 'objectives') === 'on',
    projects: str(fd, 'projects') === 'on',
    meetings: str(fd, 'meetings') === 'on',
  });

  // Tuỳ chọn: khoá tài khoản người nghỉ sau khi bàn giao (không khoá CEO/CFO cuối).
  let locked = false;
  if (str(fd, 'lock_from') === 'on') {
    const u = await getUser(from);
    if (isExec(u?.role) && (await countActiveExecs()) <= 1) {
      throw new Error('Đã bàn giao nhưng KHÔNG khoá được vì đây là CEO/CFO cuối cùng.');
    }
    await setUserActive(from, false);
    locked = true;
  }

  await logAudit({
    actor: me.email,
    action: 'user.handover',
    entity: 'user',
    entityId: from,
    detail: { to, scope: tasks, moved: res, locked },
  });
  revalidatePath('/admin/users');
  revalidatePath('/tasks');
  revalidatePath('/objectives');
  revalidatePath('/projects');
  revalidatePath('/meetings');
}

// ---------- Cây tổ chức ----------
// Ngày hiệu lực hợp lệ (YYYY-MM-DD); mặc định hôm nay (~giờ VN) nếu trống/sai.
function effDate(fd: FormData): string {
  const v = str(fd, 'effective_from');
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}
const todayVn = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

export async function createUnitAction(fd: FormData) {
  const me = await requireExec();
  const input = {
    name: str(fd, 'name'),
    code: orNull(str(fd, 'code')),
    type: (str(fd, 'type') || 'department') as UnitType,
    parent_id: orNull(str(fd, 'parent_id')),
    sort: Number(str(fd, 'sort')) || 0,
  };
  if (!input.name) throw new Error('Thiếu tên đơn vị.');
  const eff = effDate(fd);
  const today = todayVn();
  const id = await createUnit(input); // ảnh hiện tại dùng ngay (FK phiên bản cần đơn vị tồn tại)
  // Đơn vị mới có hiệu lực TỪ HÔM NAY trở đi: KHÔNG đặt lịch tương lai (ảnh hiện tại đã tạo ngay →
  // nếu ghi phiên bản ở ngày tương lai thì "xem cơ cấu hôm nay" lại thiếu đơn vị này = mâu thuẫn).
  // Cho phép LÙI ngày (ghi nhận đơn vị đã tồn tại từ trước); ngày tương lai bị kẹp về hôm nay.
  await recordUnitVersion(id, {
    ...input, is_active: true, effective_from: eff < today ? eff : today,
    note: 'thêm đơn vị', created_by: me.email,
  });
  revalidatePath('/admin/org');
}

export async function updateUnitAction(fd: FormData) {
  const me = await requireExec();
  const id = str(fd, 'id');
  const parentId = orNull(str(fd, 'parent_id'));
  if (parentId === id) throw new Error('Đơn vị không thể trực thuộc chính nó.');
  // Chống VÒNG LẶP cây: không cho chuyển đơn vị vào chính hậu duệ của nó (A→B rồi B→A sẽ tạo chu trình
  // parent_id, làm treo mọi trang tính phạm vi tổ chức). Kiểm theo subtree hiện tại.
  if (parentId) {
    const units = await listUnits();
    if (subtreeIds(units, id).has(parentId))
      throw new Error('Không thể chuyển đơn vị vào chính đơn vị con/cháu của nó.');
  }
  const name = str(fd, 'name');
  if (!name) throw new Error('Thiếu tên đơn vị.');
  const fields = {
    name,
    code: orNull(str(fd, 'code')),
    parent_id: parentId,
    sort: Number(str(fd, 'sort')) || 0,
    is_active: str(fd, 'is_active') !== '0', // mặc định hiển thị; chỉ ẩn khi chọn '0'
  };
  const eff = effDate(fd);
  const today = todayVn();
  // LUÔN ghi 1 phiên bản (kèm ngày hiệu lực) → giữ lịch sử cơ cấu.
  await recordUnitVersion(id, { ...fields, effective_from: eff, note: 'sửa đơn vị', created_by: me.email });
  // Cập nhật ẢNH HIỆN TẠI chỉ khi hiệu lực ≤ hôm nay; hiệu lực tương lai giữ nguyên, tự áp khi tới ngày.
  if (eff <= today) {
    await updateUnit(id, fields);
    revalidatePath('/objectives');
  }
  revalidatePath('/admin/org');
}

export async function deleteUnitAction(fd: FormData) {
  await requireExec();
  await deleteUnit(str(fd, 'id'));
  revalidatePath('/admin/org');
}

// ---------- Kỳ OKR ----------
export async function createPeriodAction(fd: FormData) {
  await requireExec();
  const parent = str(fd, 'parent_id');
  await createPeriod({
    name: str(fd, 'name'),
    kind: (str(fd, 'kind') || 'quarter') as 'multiyear' | 'year' | 'quarter' | 'month',
    parent_id: parent === '' ? null : parent,
    starts_on: str(fd, 'starts_on'),
    ends_on: str(fd, 'ends_on'),
  });
  revalidatePath('/admin/periods');
}

export async function setCurrentPeriodAction(fd: FormData) {
  await requireExec();
  await setCurrentPeriod(str(fd, 'id'));
  revalidatePath('/admin/periods');
}

export async function setPeriodStatusAction(fd: FormData) {
  await requireExec();
  await setPeriodStatus(str(fd, 'id'), str(fd, 'status') as 'planning' | 'active' | 'closed');
  revalidatePath('/admin/periods');
}

// ---------- #4 Cấu hình nhắc check-in ----------
export async function saveReminderAction(fd: FormData) {
  await requireExec();
  const cfg: ReminderConfig = {
    enabled: str(fd, 'enabled') === 'on',
    weekday: Math.max(0, Math.min(6, Number(str(fd, 'weekday')) || 1)),
    stale_days: Math.max(1, Number(str(fd, 'stale_days')) || 7),
    audience: (str(fd, 'audience') || 'all_owners') as ReminderConfig['audience'],
  };
  await setSetting(REMINDER_KEY, cfg);
  redirect('/admin/settings?saved=1');
}

// ---------- Nhóm quyền × Năng lực (Phân quyền) ----------
export async function savePermissionsAction(fd: FormData) {
  const me = await requireUser();
  const access = await loadAccess();
  if (!canAssignPerms(me, access)) throw new Error('Bạn không có quyền phân quyền.');
  const allCaps = CAPABILITIES.map((c) => c.key);
  const out: Record<string, CapKey[]> = {};
  for (const g of DEFAULT_GROUPS) {
    // system_admin cố định toàn quyền — không cho tự khoá (tránh mất quyền quản trị).
    if (g.key === 'system_admin') {
      out[g.key] = allCaps;
      continue;
    }
    out[g.key] = allCaps.filter((c) => fd.get(`cap_${g.key}_${c}`) === 'on');
  }
  await setSetting(PERM_GROUPS_KEY, out);
  invalidateAccess();
  redirect('/admin/permissions?saved=1');
}

export async function testReminderAction() {
  await requireExec();
  let msg: string;
  try {
    const r = await runCheckinReminders({ force: true });
    msg = `sent:${r.sent}`;
  } catch (e) {
    msg = `err:${String(e).slice(0, 60)}`;
  }
  redirect(`/admin/settings?test=${encodeURIComponent(msg)}`);
}

// ---------- Đồng bộ KPI (plan+actual từ BigQuery) ----------
export async function syncKpiAction() {
  await requireExec();
  let msg: string;
  try {
    const r = await syncAllKpi();
    msg = `ok:${r.updated}/${r.total}`;
  } catch (e) {
    msg = `err:${String(e).slice(0, 60)}`;
  }
  redirect(`/admin?kpi=${encodeURIComponent(msg)}`);
}

// ---------- Bản tin điều hành tuần (gửi thử) ----------
export async function sendDigestAction() {
  await requireExec();
  let msg: string;
  try {
    const { sendWeeklyDigest } = await import('@/lib/digest');
    const r = await sendWeeklyDigest();
    msg = `ok:${r.sent}`;
  } catch (e) {
    msg = `err:${String(e).slice(0, 60)}`;
  }
  redirect(`/admin?digest=${encodeURIComponent(msg)}`);
}
