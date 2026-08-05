'use client';

import { useState } from 'react';

// Ô nhập SỐ tự thêm dấu phân cách hàng nghìn kiểu VN (1.234.567) ngay khi gõ.
// Gửi form giá trị đã format — server dùng parseNum (num.ts) đọc đúng ('.'=nghìn, ','=thập phân).
// Dùng cho MỌI trường số lớn (mục tiêu KR, ngân sách, ngưỡng KPI…). Trường mới cứ dùng component này
// là tự có format — không cần code lại.

// Chuẩn hoá chuỗi người dùng gõ → chỉ số + tối đa 1 dấu ',' thập phân + '-' đầu, rồi nhóm nghìn bằng '.'.
function formatVi(input: string): string {
  let s = (input ?? '').replace(/[^\d,-]/g, '');
  const neg = s.startsWith('-');
  s = s.replace(/-/g, '');
  const ci = s.indexOf(',');
  let intp = ci >= 0 ? s.slice(0, ci) : s;
  const decp = ci >= 0 ? s.slice(ci + 1).replace(/,/g, '') : '';
  intp = intp.replace(/^0+(?=\d)/, ''); // bỏ số 0 thừa ở đầu
  const grouped = intp === '' ? '' : intp.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + grouped + (ci >= 0 ? ',' + decp : '');
}

// Số thô (number|string) → hiển thị có dấu nghìn.
function fromRaw(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '';
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(n)) return typeof v === 'string' ? formatVi(v) : '';
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 20 }).format(n);
}

export default function NumberInput({
  name, defaultValue, value, onValueChange, placeholder, disabled, className = 'i', style,
}: {
  name?: string;
  defaultValue?: number | string | null;      // chế độ KHÔNG kiểm soát (form server)
  value?: string;                              // chế độ KIỂM SOÁT: chuỗi (raw/đã format) — luôn hiển thị format
  onValueChange?: (formatted: string) => void; // trả chuỗi đã format cho cha (server parseNum đọc được)
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState(() => fromRaw(defaultValue));
  const display = controlled ? formatVi(value ?? '') : inner;
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = formatVi(e.target.value);
    if (controlled) onValueChange?.(f); else setInner(f);
  };
  return (
    <input
      className={className}
      name={name}
      value={display}
      onChange={onChange}
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      disabled={disabled}
      style={style}
    />
  );
}
