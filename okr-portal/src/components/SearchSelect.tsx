'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type SSOption = { value: string; label: string; group?: string; sub?: string };

// Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu ("khoi" khớp "Khối").
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

// Droplist CÓ TÌM KIẾM (combobox): gõ để lọc nhanh theo tên (không phân biệt dấu). Giá trị gửi
// theo form qua input ẩn name=... (khớp mọi server action đang đọc select cũ).
export default function SearchSelect({
  name, options, defaultValue = '', value: controlledValue, emptyLabel, placeholder = '— Chọn —', disabled, onChange,
}: {
  name: string;
  options: SSOption[];
  defaultValue?: string;      // giá trị ban đầu (chế độ không kiểm soát)
  value?: string;             // truyền → chế độ KIỂM SOÁT (cha giữ giá trị, vd default động theo cấp)
  emptyLabel?: string;        // có → thêm mục rỗng (vd "— Không gắn —")
  placeholder?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;  // báo cho form cha khi đổi (vd OKR đổi → nạp lại danh sách KR)
}) {
  const all = useMemo<SSOption[]>(
    () => (emptyLabel != null ? [{ value: '', label: emptyLabel }, ...options] : options),
    [options, emptyLabel],
  );
  const [inner, setInner] = useState(defaultValue);
  const value = controlledValue !== undefined ? controlledValue : inner; // kiểm soát nếu có `value`
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
    // Tìm theo cả nhãn chính LẪN dòng phụ (chức danh/đơn vị) → gõ "trưởng phòng" hay "marketing" đều ra.
    return all.filter((o) => o.value === '' || norm(o.label).includes(ql) || (o.sub ? norm(o.sub).includes(ql) : false));
  }, [all, q]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    setTimeout(() => inputRef.current?.focus(), 20);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const pick = (o: SSOption) => { if (controlledValue === undefined) setInner(o.value); onChange?.(o.value); setOpen(false); setQ(''); setActive(0); };

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
        <span className={selectedLabel ? 'ss-val' : 'ss-ph'}>
          {selectedLabel || placeholder}
          {selected?.sub ? <span className="ss-sub-inline"> · {selected.sub}</span> : null}
        </span>
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
                  <span className={`ss-opt-txt${o.value ? '' : ' ss-ph'}`}>
                    <span className="ss-opt-main">{o.label}</span>
                    {o.sub ? <span className="ss-opt-sub">{o.sub}</span> : null}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
