'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import NotifItems, { type Notif } from '@/components/NotifItems';

// Chuông thông báo góc phải: số chưa đọc (tự làm mới 60s) + BẢNG THẢ XUỐNG để xem và
// XỬ LÝ NGAY (duyệt/từ chối/bình luận) không cần mở trang.
export default function NotifBell({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications/count');
      if (r.ok) { const j = await r.json(); setCount(j.count ?? 0); }
    } catch { /* ignore */ }
  }, []);

  const loadList = useCallback(async () => {
    const r = await fetch('/api/notifications');
    if (r.ok) { const j = await r.json(); setItems(j.items ?? []); }
    setLoaded(true);
    refreshCount();
  }, [refreshCount]);

  // Đếm chưa đọc: định kỳ + khi quay lại tab.
  useEffect(() => {
    const iv = setInterval(refreshCount, 60000);
    const onFocus = () => refreshCount();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(iv); window.removeEventListener('focus', onFocus); };
  }, [refreshCount]);

  // Mở bảng → nạp danh sách.
  useEffect(() => { if (open) loadList(); }, [open, loadList]);

  // Đóng khi bấm ra ngoài / Esc.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const readAll = async () => {
    await fetch('/api/notifications', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'read_all' }),
    });
    loadList();
  };

  const unread = items.filter((i) => !i.is_read).length;

  return (
    <div className="notif-wrap" ref={ref}>
      <button
        type="button"
        className="notif-bell"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Thông báo"
        aria-label={count > 0 ? `Thông báo: ${count} chưa đọc` : 'Thông báo'}
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden>
          <path
            d="M12 3a6 6 0 0 0-6 6v3.5L4.5 15h15L18 12.5V9a6 6 0 0 0-6-6zM9.5 18a2.5 2.5 0 0 0 5 0"
            fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
        {count > 0 && <span className="notif-badge">{count > 99 ? '99+' : count}</span>}
      </button>

      {open && (
        <div className="notif-pop" role="dialog" aria-label="Thông báo">
          <div className="notif-pop-hd">
            <b>Thông báo</b>
            <button className="ntf-link" type="button" onClick={readAll} disabled={unread === 0}>
              Đánh dấu đã đọc
            </button>
          </div>
          <div className="notif-pop-body">
            {!loaded
              ? <p className="muted" style={{ padding: '10px 2px' }}>Đang tải…</p>
              : <NotifItems items={items} onReload={loadList} onNavigate={() => setOpen(false)} />}
          </div>
          <div className="notif-pop-ft">
            <Link href="/notifications" onClick={() => setOpen(false)}>Xem tất cả</Link>
            <Link href="/settings" className="muted" onClick={() => setOpen(false)}>⚙ Cài đặt</Link>
          </div>
        </div>
      )}
    </div>
  );
}
