'use client';

import { useState } from 'react';

// Ô tìm người dùng theo tên/email/chức danh (không phân biệt dấu). Lọc trực tiếp các dòng
// bảng đã render (mỗi <tr> mang data-s = chuỗi đã chuẩn hoá) — nhẹ, không cần tải lại.
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

export default function UserSearchBox({ targetId, total }: { targetId: string; total: number }) {
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(total);

  const apply = (val: string) => {
    setQ(val);
    const ql = norm(val.trim());
    const rows = document.querySelectorAll<HTMLTableRowElement>(`#${targetId} tr[data-s]`);
    let n = 0;
    rows.forEach((r) => {
      const match = !ql || (r.dataset.s ?? '').includes(ql);
      r.style.display = match ? '' : 'none';
      if (match) n++;
    });
    setShown(n);
  };

  return (
    <div className="usr-search">
      <div className="usr-search-box">
        <span className="usr-search-ic" aria-hidden>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        </span>
        <input
          className="usr-search-input"
          placeholder="Tìm người dùng theo tên, email hoặc chức danh…"
          value={q}
          onChange={(e) => apply(e.target.value)}
          autoComplete="off"
        />
        {q && <button type="button" className="usr-search-x" onClick={() => apply('')} aria-label="Xoá tìm">✕</button>}
      </div>
      {q && <span className="usr-search-cnt">{shown}/{total} người</span>}
    </div>
  );
}
