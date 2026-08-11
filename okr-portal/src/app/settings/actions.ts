'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/current-user';
import { saveNotifSettings, NOTIF_TYPE_META } from '@/lib/notifications';
import { setUserCalendarPref } from '@/lib/users';

// Lưu tuỳ chọn thông báo của CHÍNH mình (email tổng + bật/tắt từng loại).
export async function saveNotifSettingsAction(fd: FormData) {
  const user = await requireUser();
  const on = (k: string) => fd.get(k) === 'on' || fd.get(k) === '1' || fd.get(k) === 'true';
  const prefs: Record<string, boolean> = {};
  for (const t of NOTIF_TYPE_META) prefs[t.key] = on(`pref_${t.key}`);
  await saveNotifSettings(user.email, on('notify_email'), prefs);
  revalidatePath('/settings');
}

// Lưu tuỳ chọn TỰ THÊM VÀO GOOGLE CALENDAR của chính mình (mặc định BẬT).
export async function saveCalendarPrefAction(fd: FormData) {
  const user = await requireUser();
  const on = fd.get('calendar_enabled') === 'on' || fd.get('calendar_enabled') === '1';
  await setUserCalendarPref(user.email, on);
  revalidatePath('/settings');
}
