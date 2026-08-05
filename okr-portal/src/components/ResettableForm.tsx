'use client';

import { useRef, useState, useTransition } from 'react';

// Form dùng SERVER ACTION nhưng TỰ XOÁ TRẮNG sau khi thêm thành công (về lại defaultValue) +
// hiện xác nhận "đã thêm … — sẵn sàng cho mục tiếp theo". Tránh dữ liệu cũ còn nằm lại gây nhầm.
// Bọc y nguyên các trường cũ làm children (server render), chỉ đổi <form> → <ResettableForm>.
export default function ResettableForm({
  action, children, doneLabel = 'Đã thêm', className, style,
}: {
  action: (fd: FormData) => Promise<void>;
  children: React.ReactNode;
  doneLabel?: string;        // vd "Đã thêm KR"
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = String(fd.get('title') ?? '').trim();
    setErr(null);
    setMsg(null);
    start(async () => {
      try {
        await action(fd);
        form.reset();                 // về lại các giá trị mặc định (0, 1, 100…) — sạch cho mục mới
        setMsg(`${doneLabel}${title ? `: “${title}”` : ''} — form đã sẵn sàng cho mục tiếp theo.`);
        setTimeout(() => setMsg(null), 4500);
      } catch (e2) {
        const m = e2 instanceof Error ? e2.message : String(e2);
        if (m.includes('NEXT_REDIRECT')) return; // action redirect (nếu có) → coi như thành công
        setErr(m);
      }
    });
  };

  return (
    <form ref={ref} onSubmit={onSubmit} className={className} style={style}>
      {/* fieldset disabled khi đang gửi → chặn double-submit, các trường mờ đi */}
      <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        {children}
      </fieldset>
      {msg && (
        <div className="gnote" style={{ background: '#dcfce7', borderColor: '#16a34a', color: '#166534', marginTop: 10 }}>
          ✓ {msg}
        </div>
      )}
      {err && (
        <div className="gnote" style={{ background: '#fee2e2', borderColor: '#dc2626', color: '#991b1b', marginTop: 10 }}>
          ❌ {err}
        </div>
      )}
    </form>
  );
}
