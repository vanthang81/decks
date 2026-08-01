'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/current-user';
import { canAdmin, isRole, type Role } from '@/lib/rbac';
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
import { OKR_PERM_KEYS } from '@/lib/okr-perms';

async function requireExec() {
  const user = await requireUser();
  if (!canAdmin(user.role)) throw new Error('Chỉ CEO/CFO được quản trị hệ thống.');
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
  await requireExec();
  const role = str(fd, 'role');
  await upsertUser({
    email: str(fd, 'email'),
    display_name: orNull(str(fd, 'display_name')),
    title: orNull(str(fd, 'title')),
    role: (isRole(role) ? role : 'staff') as Role,
    unit_id: orNull(str(fd, 'unit_id')),
  });
  revalidatePath('/admin/users');
}

export async function toggleUserAction(fd: FormData) {
  const me = await requireExec();
  const email = str(fd, 'email');
  const active = str(fd, 'active') === '1';
  // Không tự khoá chính mình nếu là exec cuối cùng.
  if (!active && email.toLowerCase() === me.email.toLowerCase()) {
    const u = await getUser(email);
    if (u?.role === 'exec' && (await countActiveExecs()) <= 1) {
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
  if (u?.role === 'exec' && (await countActiveExecs()) <= 1) {
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

// ---------- Phân quyền Sửa/Xoá/Tạo OKR ----------
export async function savePermissionsAction(fd: FormData) {
  await requireExec();
  // Vai trò cấu hình được (CEO/CFO luôn toàn quyền nên không nằm trong ma trận).
  const roles: Role[] = ['division_lead', 'dept_lead', 'staff'];
  const pick = (cap: string): Role[] => roles.filter((r) => fd.get(`${cap}_${r}`) === 'on');
  await setSetting(OKR_PERM_KEYS.edit, pick('edit'));
  await setSetting(OKR_PERM_KEYS.delete, pick('delete'));
  await setSetting(OKR_PERM_KEYS.create, pick('create'));
  const admins = Array.from(
    new Set(fd.getAll('admins').map((e) => String(e).trim().toLowerCase()).filter(Boolean)),
  );
  await setSetting(OKR_PERM_KEYS.admins, admins);
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
