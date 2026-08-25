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
  savedByName = '', savedAtLabel = '', currentUserName = '', people = [],
}: {
  meetingId: string;
  initialMinutes: string;
  initialDecisions: string;
  action: (fd: FormData) => Promise<void>;
  savedByName?: string;       // ai lưu lần cuối (từ server) — hiện khi mở lại
  savedAtLabel?: string;      // thời gian lưu lần cuối (đã format ở server)
  currentUserName?: string;   // tên người đang đăng nhập — gán khi tự lưu lần này
  people?: { email: string; name: string }[];   // chọn khi gõ "@" trong công việc
}) {
  const minutesRef = useRef(initialMinutes);
  const decisionsRef = useRef(initialDecisions);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const [state, setState] = useState<SaveState>('idle');
  const [at, setAt] = useState('');
  // Nhật ký "lưu lần cuối" — khởi từ server, cập nhật ngay khi tự lưu ở phiên này.
  const [byName, setByName] = useState(savedByName);
  const [atLabel, setAtLabel] = useState(savedAtLabel);

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
      // Người đang gõ CHÍNH là người lưu lần cuối → cập nhật nhật ký hiển thị ngay.
      if (currentUserName) setByName(currentUserName);
      setAtLabel(new Date().toLocaleString('vi-VN'));
    } catch {
      dirty.current = true; // để lần sau thử lưu lại
      setState('error');
    }
  }, [meetingId, action, currentUserName]);

  const schedule = useCallback(() => {
    dirty.current = true;
    setState('pending');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(doSave, 1200);
  }, [doSave]);

  // Lưu nốt nháp còn dở: (1) khi rời trang (đóng tab/điều hướng); (2) khi ĐÓNG popup
  // (component unmount) — kể cả đóng NHANH trong vòng 1,2s trước khi debounce kịp chạy, nhờ đó
  // đóng-mở lại vẫn thấy nội dung đang viết dở (CFO 25/08).
  useEffect(() => {
    const onLeave = () => { if (timer.current) clearTimeout(timer.current); void doSave(); };
    window.addEventListener('beforeunload', onLeave);
    return () => {
      window.removeEventListener('beforeunload', onLeave);
      if (timer.current) clearTimeout(timer.current);
      void doSave(); // flush nháp khi đóng popup
    };
  }, [doSave]);

  const label =
    state === 'saving' ? 'Đang lưu nháp…'
    : state === 'pending' ? 'Sẽ tự lưu…'
    : state === 'saved' ? `Đã lưu nháp lúc ${at}`
    : state === 'error' ? 'Lỗi lưu nháp — sẽ thử lại' : 'Tự lưu khi bạn gõ';

  return (
    <div>
      <div className="autosave-row">
        <div className={`autosave autosave-${state}`} aria-live="polite">
          <span className="autosave-dot" aria-hidden />
          <span>{label}</span>
        </div>
        {(byName || atLabel) && (
          <span className="autosave-by" title="Người & thời điểm lưu gần nhất">
            Lưu lần cuối{byName ? ` bởi ${byName}` : ''}{atLabel ? ` · ${atLabel}` : ''}
          </span>
        )}
      </div>
      <label className="f">Biên bản (minutes)</label>
      <p className="muted minutes-hint">
        Mẹo tạo việc nhanh: gõ <code>[]</code> đầu dòng → thành <b>ô tick</b> công việc · <code>@</code> để
        <b> chọn người</b> phụ trách · nút <b>📅</b> (hoặc gõ ngày <code>25/08</code>) đặt <b>hạn</b>. Bấm ô
        tick = xong. Bấm <b>Lưu &amp; đóng</b> → việc tự hiện ở mục <b>Hành động</b> bên dưới (đồng bộ 2 chiều).
      </p>
      <RichEditor name="minutes" defaultValue={initialMinutes} minHeight={180} taskMode people={people}
        placeholder="Nội dung… Vd: [] Soạn hợp đồng @Nguyễn Văn A 25/08"
        onChange={(html) => { minutesRef.current = html; schedule(); }} />
      <label className="f" style={{ marginTop: 10 }}>Quyết định (decisions)</label>
      <RichEditor name="decisions" defaultValue={initialDecisions} minHeight={120}
        placeholder="Các quyết định đã chốt…"
        onChange={(html) => { decisionsRef.current = html; schedule(); }} />
    </div>
  );
}
