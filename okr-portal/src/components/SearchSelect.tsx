'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type SSOption = { value: string; label: string; group?: string };

// Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu ("khoi" khớp "Khối").
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

// Droplist CÓ TÌM KIẾM (combobox): gõ để lọc nhanh theo tên (không phân biệt dấu). Giá trị gửi
// theo form qua input ẩn name=... (khớp mọi server action đang đọc select cũ).
export default function SearchSelect({
  name, options, defaultValue = '', emptyLabel, placeholder = '— Chọn —', disabled,
}: {
  name: string;
  options: SSOption[];
  defaultValue?: string;
  emptyLabel?: string;        // có → thêm mục rỗng (vd "— Không gắn —")
  placeholder?: string;
  disabled?: boolean;
}) {
  const all = useMemo<SSOption[]>(
    () => (emptyLabel != null ? [{ value: '', label: emptyLabel }, ...options] : options),
    [options, emptyLabel],
  );
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = all.find((o) => o.value === value);
  const selectedLabel = selected ? selected.label : '';

  const filtered = useMemo(() => {
    const ql = norm(q.trim());
    if (!ql) return all;
    return all.filter((o) => o.value === '' || norm(o.label).includes(ql));
  }, [all, q]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    setTimeout(() => inputRef.current?.focus(), 20);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const pick = (o: SSOption) => { setValue(o.value); setOpen(false); setQ(''); setActive(0); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[active]) pick(filtered[active]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div className={`ss${disabled ? ' ss-dis' : ''}`} ref={boxRef}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        className="ss-control i"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((v) => !v)}
      >
        <span className={selectedLabel ? 'ss-val' : 'ss-ph'}>{selectedLabel || placeholder}</span>
        <span className="ss-caret" aria-hidden>▾</span>
      </button>
      {open && (
        <div className="ss-panel">
          <input
            ref={inputRef}
            className="ss-search"
            placeholder="Gõ để tìm nhanh…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={onKey}
            autoComplete="off"
          />
          <div className="ss-list" role="listbox">
            {filtered.length === 0 ? (
              <div className="ss-empty">Không tìm thấy</div>
            ) : (
              filtered.map((o, i) => (
                <button
                  key={o.value || '__empty'}
                  type="button"
                  className={`ss-opt${i === active ? ' on' : ''}${o.value === value ? ' sel' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => { e.preventDefault(); pick(o); }}
                >
                  {o.value === value && <span className="ss-check">✓</span>}
                  <span className={o.value ? '' : 'ss-ph'}>{o.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
