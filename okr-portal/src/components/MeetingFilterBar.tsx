'use client';

import { useEffect, useMemo, useState } from 'react';
import ClearFiltersButton from '@/components/ClearFiltersButton';

// Bộ LỌC/TÌM cuộc họp — lọc trực tiếp các dòng bảng đã render (mỗi <tr> mang data-*), nhẹ,
// không tải lại trang. Gộp: ô tìm (mã/tên/đơn vị/dự án/chủ trì) + Loại + Trạng thái + Chủ trì.
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

type Opt = { value: string; label: string };

export default function MeetingFilterBar({
  targetId, total, types, statuses, hosts,
}: {
  targetId: string;
  total: number;
  types: Opt[];
  statuses: Opt[];
  hosts: Opt[];
}) {
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [host, setHost] = useState('');
  const [shown, setShown] = useState(total);
  const active = useMemo(() => !!(q.trim() || type || status || host), [q, type, status, host]);

  useEffect(() => {
    const ql = norm(q.trim());
    const rows = document.querySelectorAll<HTMLTableRowElement>(`#${targetId} tr[data-s]`);
    let n = 0;
    rows.forEach((r) => {
      const d = r.dataset;
      const show =
        (!ql || (d.s ?? '').includes(ql)) &&
        (!type || d.type === type) &&
        (!status || d.status === status) &&
        (!host || d.host === host);
      r.style.display = show ? '' : 'none';
      if (show) n++;
    });
    setShown(n);
  }, [q, type, status, host, targetId]);

  const reset = () => { setQ(''); setType(''); setStatus(''); setHost(''); };

  return (
    <div className="mtf">
      <div className="usr-search-box mtf-search">
        <span className="usr-search-ic" aria-hidden>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        </span>
        <input className="usr-search-input" placeholder="Tìm cuộc họp: mã, tên, đơn vị, chủ trì…"
          value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        {q && <button type="button" className="usr-search-x" onClick={() => setQ('')} aria-label="Xoá tìm">✕</button>}
      </div>
      <select className="i mtf-sel" value={type} onChange={(e) => setType(e.target.value)} aria-label="Lọc theo loại họp">
        <option value="">Loại: tất cả</option>
        {types.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select className="i mtf-sel" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Lọc theo trạng thái">
        <option value="">Trạng thái: tất cả</option>
        {statuses.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select className="i mtf-sel" value={host} onChange={(e) => setHost(e.target.value)} aria-label="Lọc theo chủ trì">
        <option value="">Chủ trì: tất cả</option>
        {hosts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {active && (
        <>
          <span className="usr-search-cnt">{shown}/{total} cuộc họp</span>
          <ClearFiltersButton onClear={reset} />
        </>
      )}
    </div>
  );
}
