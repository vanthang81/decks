'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/current-user';
import { loadAccess, canManageSystem } from '@/lib/access';
import { setErrorResolved } from '@/lib/errlog';

export async function resolveErrorAction(fd: FormData) {
  const me = await requireUser();
  if (!canManageSystem(me, await loadAccess())) redirect('/');
  const id = String(fd.get('id') ?? '');
  const resolved = String(fd.get('resolved') ?? '1') === '1';
  if (id) await setErrorResolved(id, resolved);
  revalidatePath('/admin/errors');
}
