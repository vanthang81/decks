'use client';

import { useState } from 'react';

// Lọc bảng người dùng đã render (mỗi <tr> mang data-s / data-role / data-units / data-group).
// Kết hợp: ô tìm (tên/email/chức danh) + Vai trò + Khối/Phòng (khớp cả cấp dưới) + Nhóm quyền.
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

type Opt = { value: string; label: string };

export default function UserFilterBar({
  targetId,
  total,
  roles,
  units,
  groups,
}: {
  targetId: string;
  total: number;
  roles: Opt[];
  units: Opt[];
  groups: Opt[];
}) {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [unit, setUnit] = useState('');
  const [group, setGroup] = useState('');
  const [shown, setShown] = useState(total);

  const apply = (next: Partial<{ q: string; role: string; unit: string; group: string }>) => {
    const nq = next.q ?? q;
    const nr = next.role ?? role;
    const nu = next.unit ?? unit;
    const ng = next.group ?? group;
    if (next.q !== undefined) setQ(next.q);
    if (next.role !== undefined) setRole(next.role);
    if (next.unit !== undefined) setUnit(next.unit);
    if (next.group !== undefined) setGroup(next.group);

    const ql = norm(nq.trim());
    const rows = document.querySelectorAll<HTMLTableRowElement>(`#${targetId} tr[data-s]`);
    let n = 0;
    rows.forEach((r) => {
      const okText = !ql || (r.dataset.s ?? '').includes(ql);
      const okRole = !nr || r.dataset.role === nr;
      const okUnit = !nu || ` ${r.dataset.units ?? ''} `.includes(` ${nu} `);
      const okGroup = !ng || r.dataset.group === ng;
      const match = okText && okRole && okUnit && okGroup;
      r.style.display = match ? '' : 'none';
      if (match) n++;
    });
    setShown(n);
  };

  const active = !!(q || role || unit || group);
  const clearAll = () => apply({ q: '', role: '', unit: '', group: '' });

  return (
    <div className="usr-filterbar">
      <div className="usr-search-box">
        <span className="usr-search-ic" aria-hidden>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        </span>
        <input
          className="usr-search-input"
          placeholder="Tìm theo tên, email hoặc chức danh…"
          value={q}
          onChange={(e) => apply({ q: e.target.value })}
          autoComplete="off"
        />
        {q && <button type="button" className="usr-search-x" onClick={() => apply({ q: '' })} aria-label="Xoá tìm">✕</button>}
      </div>

      <select className="i fb-sel" value={role} onChange={(e) => apply({ role: e.target.value })}>
        <option value="">Vai trò: tất cả</option>
        {roles.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select className="i fb-sel" value={unit} onChange={(e) => apply({ unit: e.target.value })}>
        <option value="">Khối / Phòng: tất cả</option>
        {units.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select className="i fb-sel" value={group} onChange={(e) => apply({ group: e.target.value })}>
        <option value="">Nhóm quyền: tất cả</option>
        {groups.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {active && (
        <span className="usr-filter-cnt">
          {shown}/{total} người
          <button type="button" className="usr-search-x" onClick={clearAll} aria-label="Xoá lọc" title="Xoá tất cả bộ lọc">✕</button>
        </span>
      )}
    </div>
  );
}
