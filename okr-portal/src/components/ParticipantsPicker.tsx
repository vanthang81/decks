'use client';

import { useMemo, useRef, useState } from 'react';

type UserOpt = { email: string; display_name: string | null; title?: string | null };

// Ô chọn người tham gia cuộc họp: gõ tên/email → gợi ý từ danh sách user; nếu người chưa có
// trong hệ thống thì tự nhập, phần chưa có "@" sẽ được điền sẵn đuôi @<defaultDomain>.
// Kết quả gom vào input ẩn name="participants" (email cách nhau bằng dấu phẩy) — khớp parseParticipants.
export default function ParticipantsPicker({
  users,
  initial = '',
  name = 'participants',
  defaultDomain = 'baotinmanhhai.vn',
}: {
  users: UserOpt[];
  initial?: string;
  name?: string;
  defaultDomain?: string;
}) {
  const parseInit = (raw: string) =>
    raw.split(/[\n,;]+/).map((e) => e.trim()).filter((e) => e.includes('@'));
  const [selected, setSelected] = useState<string[]>(() => {
    const seen = new Set<string>();
    return parseInit(initial).filter((e) => {
      const k = e.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  });
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const nameOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of users) if (u.display_name) m.set(u.email.toLowerCase(), u.display_name);
    return m;
  }, [users]);

  const selectedSet = useMemo(() => new Set(selected.map((e) => e.toLowerCase())), [selected]);

  // Gợi ý người dùng khớp tên/email, loại người đã chọn.
  const matches = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return users
      .filter((u) => !selectedSet.has(u.email.toLowerCase()))
      .filter((u) => !ql || (u.display_name ?? '').toLowerCase().includes(ql) || u.email.toLowerCase().includes(ql))
      .slice(0, 8);
  }, [users, q, selectedSet]);

  // Ứng viên "tự nhập" khi gõ người chưa có trong danh sách.
  const freeEntry = useMemo(() => {
    const t = q.trim();
    if (!t) return null;
    const email = t.includes('@') ? t : `${t.replace(/\s+/g, '')}@${defaultDomain}`;
    const el = email.toLowerCase();
    if (selectedSet.has(el)) return null;
    if (users.some((u) => u.email.toLowerCase() === el)) return null; // đã có trong gợi ý
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null; // email không hợp lệ
    return email;
  }, [q, selectedSet, users, defaultDomain]);

  const options: { email: string; label: string; sub?: string; isNew?: boolean }[] = [
    ...matches.map((u) => ({ email: u.email, label: u.display_name || u.email, sub: u.title || (u.display_name ? u.email : undefined) })),
    ...(freeEntry ? [{ email: freeEntry, label: freeEntry, sub: 'Thêm mới (ngoài danh sách)', isNew: true }] : []),
  ];

  const add = (email: string) => {
    const e = email.trim();
    if (!e || !e.includes('@')) return;
    setSelected((cur) => (cur.some((x) => x.toLowerCase() === e.toLowerCase()) ? cur : [...cur, e]));
    setQ('');
    setActive(0);
    setOpen(true);
    inputRef.current?.focus();
  };
  const remove = (email: string) =>
    setSelected((cur) => cur.filter((x) => x.toLowerCase() !== email.toLowerCase()));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      if (options.length) { e.preventDefault(); add((options[active] ?? options[0]).email); }
      else if (q.trim()) { e.preventDefault(); if (freeEntry) add(freeEntry); }
    } else if (e.key === 'Backspace' && !q && selected.length) {
      remove(selected[selected.length - 1]);
    }
  };

  return (
    <div className="pp">
      <input type="hidden" name={name} value={selected.join(', ')} />
      <div className="pp-box" onClick={() => inputRef.current?.focus()}>
        {selected.map((email) => (
          <span key={email} className="pp-chip">
            <span className="pp-chip-t">{nameOf.get(email.toLowerCase()) ?? email}</span>
            <button type="button" className="pp-chip-x" onClick={(ev) => { ev.stopPropagation(); remove(email); }} aria-label={`Bỏ ${email}`}>✕</button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="pp-input"
          value={q}
          placeholder={selected.length ? '' : 'Gõ tên hoặc email để thêm…'}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
      </div>
      {open && options.length > 0 && (
        <div className="pp-menu">
          {options.map((o, i) => (
            <button
              key={o.email}
              type="button"
              className={`pp-opt${i === active ? ' on' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); add(o.email); }}
              onMouseEnter={() => setActive(i)}
            >
              {o.isNew && <span className="pp-plus">＋</span>}
              <span className="pp-opt-t">{o.label}</span>
              {o.sub && <span className="pp-opt-s">{o.sub}</span>}
            </button>
          ))}
        </div>
      )}
      <p className="pp-hint">Gõ để tìm người có sẵn; người chưa có thì tự nhập (thiếu “@” sẽ tự thêm <b>@{defaultDomain}</b>). Enter/dấu phẩy để thêm.</p>
    </div>
  );
}
