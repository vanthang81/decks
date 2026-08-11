'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import RichEditor from './RichEditor';

// Bộ soạn BIÊN BẢN + QUYẾT ĐỊNH có TỰ LƯU NHÁP liên tục (CFO 11/08 — chống mất thông tin
// khi đang viết). Debounce ~1.2s sau khi ngừng gõ → gọi server action lưu THẲNG vào DB
// (KHÔNG revalidate để không làm mới trang giữa chừng). Vẫn giữ 2 <input hidden> (RichEditor)
// để nút "Lưu biên bản" (submit form) hoạt động như cũ. Có chỉ báo trạng thái lưu.

type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export default function MinutesEditor({
  meetingId, initialMinutes, initialDecisions, action,
}: {
  meetingId: string;
  initialMinutes: string;
  initialDecisions: string;
  action: (fd: FormData) => Promise<void>;
}) {
  const minutesRef = useRef(initialMinutes);
  const decisionsRef = useRef(initialDecisions);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const [state, setState] = useState<SaveState>('idle');
  const [at, setAt] = useState('');

  const doSave = useCallback(async () => {
    if (!dirty.current) return;
    dirty.current = false;
    setState('saving');
    try {
      const fd = new FormData();
      fd.set('id', meetingId);
      fd.set('minutes', minutesRef.current);
      fd.set('decisions', decisionsRef.current);
      await action(fd);
      setState('saved');
      setAt(new Date().toLocaleTimeString('vi-VN'));
    } catch {
      dirty.current = true; // để lần sau thử lưu lại
      setState('error');
    }
  }, [meetingId, action]);

  const schedule = useCallback(() => {
    dirty.current = true;
    setState('pending');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(doSave, 1200);
  }, [doSave]);

  // Lưu nốt khi rời trang (đóng tab/điều hướng) nếu còn nháp chưa lưu.
  useEffect(() => {
    const onLeave = () => { if (timer.current) clearTimeout(timer.current); void doSave(); };
    window.addEventListener('beforeunload', onLeave);
    return () => { window.removeEventListener('beforeunload', onLeave); if (timer.current) clearTimeout(timer.current); };
  }, [doSave]);

  const label =
    state === 'saving' ? 'Đang lưu nháp…'
    : state === 'pending' ? 'Sẽ tự lưu…'
    : state === 'saved' ? `Đã lưu nháp lúc ${at}`
    : state === 'error' ? 'Lỗi lưu nháp — sẽ thử lại' : 'Tự lưu khi bạn gõ';

  return (
    <div>
      <div className={`autosave autosave-${state}`} aria-live="polite">
        <span className="autosave-dot" aria-hidden />
        <span>{label}</span>
      </div>
      <label className="f">Biên bản (minutes)</label>
      <RichEditor name="minutes" defaultValue={initialMinutes} minHeight={180}
        placeholder="Nội dung trao đổi, ý kiến, kết luận…"
        onChange={(html) => { minutesRef.current = html; schedule(); }} />
      <label className="f" style={{ marginTop: 10 }}>Quyết định (decisions)</label>
      <RichEditor name="decisions" defaultValue={initialDecisions} minHeight={120}
        placeholder="Các quyết định đã chốt…"
        onChange={(html) => { decisionsRef.current = html; schedule(); }} />
    </div>
  );
}
