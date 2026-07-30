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
  await createPeriod({
    name: str(fd, 'name'),
    kind: (str(fd, 'kind') || 'quarter') as 'quarter' | 'year',
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
