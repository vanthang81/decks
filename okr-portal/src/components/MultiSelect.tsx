'use client';

import { useMemo, useRef, useState } from 'react';

export type MSOption = { value: string; label: string };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

// Ô chọn NHIỀU mục có tìm kiếm (chip + gõ lọc). Gửi form: input ẩn name=... = các value nối bằng dấu phẩy.
export default function MultiSelect({
  name, options, initial = [], placeholder = 'Gõ để tìm & chọn…', emptyText = 'Chưa chọn mục nào.',
}: {
  name: string;
  options: MSOption[];
  initial?: string[];
  placeholder?: string;
  emptyText?: string;
}) {
  const [selected, setSelected] = useState<string[]>(() => initial.filter((v) => options.some((o) => o.value === v)));
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const labelOf = useMemo(() => new Map(options.map((o) => [o.value, o.label])), [options]);
  const filtered = useMemo(() => {
    const ql = norm(q.trim());
    return options.filter((o) => !selected.includes(o.value) && (!ql || norm(o.label).includes(ql)));
  }, [options, selected, q]);

  const add = (v: string) => { setSelected((s) => [...s, v]); setQ(''); };
  const remove = (v: string) => setSelected((s) => s.filter((x) => x !== v));

  return (
    <div className="ms" ref={boxRef}>
      <input type="hidden" name={name} value={selected.join(',')} />
      {selected.length > 0 && (
        <div className="ms-chips">
          {selected.map((v) => (
            <span key={v} className="ms-chip">
              {labelOf.get(v) ?? v}
              <button type="button" className="ms-chip-x" onClick={() => remove(v)} aria-label="Bỏ">✕</button>
            </span>
          ))}
        </div>
      )}
      <input
        className="i ms-input"
        value={q}
        placeholder={selected.length ? 'Thêm nữa…' : placeholder}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="ms-panel">
          {filtered.slice(0, 30).map((o) => (
            <button key={o.value} type="button" className="ms-opt" onMouseDown={(e) => { e.preventDefault(); add(o.value); }}>
              {o.label}
            </button>
          ))}
        </div>
      )}
      {selected.length === 0 && <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>{emptyText}</p>}
    </div>
  );
}
