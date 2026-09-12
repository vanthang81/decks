'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/current-user';
import { saveNotifSettings, NOTIF_TYPE_META } from '@/lib/notifications';
import { setTaskChangePrefs, type TaskChangeChannel } from '@/lib/task-changes';

// Lưu tuỳ chọn thông báo của CHÍNH mình (email tổng + bật/tắt từng loại).
export async function saveNotifSettingsAction(fd: FormData) {
  const user = await requireUser();
  const on = (k: string) => fd.get(k) === 'on' || fd.get(k) === '1' || fd.get(k) === 'true';
  const prefs: Record<string, boolean> = {};
  for (const t of NOTIF_TYPE_META) prefs[t.key] = on(`pref_${t.key}`);
  await saveNotifSettings(user.email, on('notify_email'), prefs);
  revalidatePath('/settings');
}

// Lưu tuỳ chọn "Thông báo thay đổi công việc" của chính mình (kênh · giờ gửi · ngày trong tuần).
export async function saveTaskChangePrefsAction(fd: FormData) {
  const user = await requireUser();
  const channel = (fd.get('channel') as TaskChangeChannel) || 'both';
  const times = fd.getAll('times').map(String);
  const days = fd.getAll('days').map((d) => Number(d)).filter((n) => Number.isInteger(n));
  await setTaskChangePrefs(user.email, { channel, times, days });
  revalidatePath('/settings');
}
