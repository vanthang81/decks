'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';

// Hệ thống TOAST dùng chung toàn app: báo "Đã lưu / Đã xoá / Có lỗi…" mỗi khi thao tác xong.
// Provider bọc TRÊN cây trang (layout) → state toast SỐNG QUA router.refresh() (EditModal đóng+refresh
// vẫn thấy toast). Mọi client component gọi useToast().toast(msg, variant).

export type ToastVariant = 'success' | 'error' | 'info';
type ToastItem = { id: number; msg: string; variant: ToastVariant };
type ToastCtx = { toast: (msg: string, variant?: ToastVariant) => void };

const Ctx = createContext<ToastCtx>({ toast: () => {} });
export const useToast = () => useContext(Ctx);

const ICON: Record<ToastVariant, React.ReactNode> = {
  success: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5M12 16h.01" /></svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
  ),
};

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => setItems((cur) => cur.filter((t) => t.id !== id)), []);

  const toast = useCallback((msg: string, variant: ToastVariant = 'success') => {
    const clean = (msg || '').trim();
    if (!clean) return;
    const id = ++idRef.current;
    setItems((cur) => [...cur, { id, msg: clean, variant }].slice(-4)); // giữ tối đa 4 toast
    // Lỗi hiện lâu hơn (đọc kịp); thành công/nhắc tự tắt nhanh.
    const ttl = variant === 'error' ? 5000 : 2800;
    setTimeout(() => remove(id), ttl);
  }, [remove]);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      {items.length > 0 && (
        <div className="toast-wrap" role="status" aria-live="polite">
          {items.map((t) => (
            <div key={t.id} className={`toast toast-${t.variant}`}>
              <span className="toast-ic" aria-hidden>{ICON[t.variant]}</span>
              <span className="toast-msg">{t.msg}</span>
              <button type="button" className="toast-x" aria-label="Đóng" onClick={() => remove(t.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </Ctx.Provider>
  );
}
