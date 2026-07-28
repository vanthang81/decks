'use client';

import { useState } from 'react';

// Ô chỉ-đọc + nút Copy (dùng cho link cá nhân, link xem, mật khẩu…).
export default function CopyField({
  value,
  label,
  mono,
}: {
  value: string;
  label?: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback cho trình duyệt cũ / không có clipboard API.
      const el = document.createElement('textarea');
      el.value = value;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand('copy');
      } catch {
        /* bỏ qua */
      }
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      {label && <label>{label}</label>}
      <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
        <input
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          style={{ flex: 1, minWidth: 0, ...(mono ? { fontFamily: 'ui-monospace, monospace' } : {}) }}
        />
        <button
          type="button"
          className={`btn${copied ? ' primary' : ''}`}
          onClick={copy}
          style={{ whiteSpace: 'nowrap' }}
        >
          {copied ? '✓ Đã copy' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
