'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';

// Nút SỬA gọn (đặt ở góc phải-trên của box liên quan) → mở popup chứa form.
// Dùng CHUNG cho mọi chỗ khai báo/sửa nội dung 1 box. Chỉ render khi có quyền (gác ở nơi gọi).
// - action: server action nhận FormData (được truyền qua ranh giới client — an toàn).
// - children: các ô nhập của form (label/input…), component tự bọc <form> + nút Lưu/Huỷ.
// - submit xong: đóng popup + router.refresh() để thấy số mới ngay; lỗi thì hiện thông báo.

export default function EditModal({
  title,
  label = 'Sửa',
  icon,
  submitLabel = 'Lưu',
  action,
  children,
  triggerClass = 'btn ghost sm',
  wide = false,
  toastMsg = 'Đã lưu',
}: {
  title: string;
  label?: string;
  icon?: React.ReactNode;
  submitLabel?: string;
  action: (fd: FormData) => Promise<void | { error?: string }>;
  children: React.ReactNode;
  triggerClass?: string;
  wide?: boolean;
  toastMsg?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr('');
    start(async () => {
      try {
        const r = await action(fd);
        if (r && 'error' in r && r.error) { setErr(r.error); return; }
        setOpen(false);
        toast(toastMsg, 'success');
        router.refresh();
      } catch (e2) {
        // Action điều hướng (redirect) ném NEXT_REDIRECT — không phải lỗi: đóng popup, để router chuyển trang.
        if (e2 instanceof Error && /NEXT_REDIRECT/.test(e2.message)) { setOpen(false); toast(toastMsg, 'success'); return; }
        setErr(e2 instanceof Error ? e2.message : 'Không lưu được. Thử lại.');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        className={triggerClass}
        onClick={() => setOpen(true)}
        title={title}
        aria-label={label || title}
      >
        {icon}
        {label ? <span>{label}</span> : null}
      </button>
      {open && (
        <div className="okr-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div className={`okr-modal${wide ? ' okr-modal-wide' : ''}`} onMouseDown={(e) => e.stopPropagation()}>
            <div className="okr-modal-head">
              <b>{title}</b>
              <button type="button" className="okr-modal-x" onClick={() => setOpen(false)} aria-label="Đóng">✕</button>
            </div>
            <form onSubmit={submit}>
              {children}
              {err && <p className="badge red" style={{ display: 'block', marginTop: 12, padding: 10 }}>{err}</p>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" className="btn ghost" onClick={() => setOpen(false)} disabled={pending}>Huỷ</button>
                <button type="submit" className="btn" disabled={pending}>{pending ? 'Đang lưu…' : submitLabel}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
