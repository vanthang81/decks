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
} from '@/lib/users';
import { createUnit, updateUnit, deleteUnit, type UnitType } from '@/lib/org';
import { createPeriod, setCurrentPeriod, setPeriodStatus } from '@/lib/periods';
import { syncAllKpi } from '@/lib/kpi';
import { redirect } from 'next/navigation';
import { setSetting } from '@/lib/settings';
import { REMINDER_KEY, runCheckinReminders, type ReminderConfig } from '@/lib/reminders';

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
  // Chỉ người có quyền "Phân quyền" mới đặt được Nhóm quyền; người khác giữ nguyên.
  const grp = orNull(str(fd, 'perm_group'));
  const permGroup = canAssignPerms(me, access) ? grp : (await getUser(str(fd, 'email')))?.perm_group ?? null;
  await upsertUser({
    email: str(fd, 'email'),
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

// ---------- Cây tổ chức ----------
export async function createUnitAction(fd: FormData) {
  await requireExec();
  await createUnit({
    name: str(fd, 'name'),
    code: orNull(str(fd, 'code')),
    type: (str(fd, 'type') || 'department') as UnitType,
    parent_id: orNull(str(fd, 'parent_id')),
    sort: Number(str(fd, 'sort')) || 0,
  });
  revalidatePath('/admin/org');
}

export async function updateUnitAction(fd: FormData) {
  await requireExec();
  await updateUnit(str(fd, 'id'), {
    name: str(fd, 'name'),
    code: orNull(str(fd, 'code')),
    parent_id: orNull(str(fd, 'parent_id')),
    sort: Number(str(fd, 'sort')) || 0,
    is_active: str(fd, 'is_active') === '1',
  });
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
