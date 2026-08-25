'use client';

// Nhóm chip lọc có nhãn — dùng lại style .chip cho đồng nhất với chip danh mục.
export default function FilterChips<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: string }[];
}) {
  return (
    <span className="filter-group">
      <span className="filter-label">{label}</span>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          className={`chip ${value === o.v ? 'active' : ''}`}
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
        >
          {o.label}
        </button>
      ))}
    </span>
  );
}
