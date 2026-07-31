'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export type PeriodOpt = { id: string; label: string; depth: number; isCurrent: boolean };

// Bộ chọn kỳ: chọn là điều hướng NGAY (không cần nút "Xem"). Box hiển thị SẠCH
// (không thụt khoảng trắng), danh sách xổ ra vẫn thụt cấp theo cây cho dễ nhìn.
export default function PeriodPicker({
  periods,
  currentId,
  basePath,
}: {
  periods: PeriodOpt[];
  currentId: string | null;
  basePath: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = periods.find((p) => p.id === currentId) ?? periods[0] ?? null;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (id: string) => {
    setOpen(false);
    if (id === currentId) return;
    startTransition(() => {
      router.push(`${basePath}?period=${id}`);
    });
  };

  return (
    <div className="pp-wrap" ref={wrapRef}>
      <button
        type="button"
        className="pp-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={pending}
      >
        <span className="pp-btn-label">
          {selected ? selected.label : 'Chọn kỳ'}
          {selected?.isCurrent && <span className="pp-now">hiện tại</span>}
        </span>
        <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden className={`pp-caret ${open ? 'open' : ''}`}>
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="pp-menu" role="listbox">
          {periods.map((p) => (
            <button
              key={p.id}
              type="button"
              role="option"
              aria-selected={p.id === currentId}
              className={`pp-item ${p.id === currentId ? 'active' : ''}`}
              style={{ paddingLeft: 12 + p.depth * 16 }}
              onClick={() => pick(p.id)}
            >
              {p.label}
              {p.isCurrent && <span className="pp-now">hiện tại</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
