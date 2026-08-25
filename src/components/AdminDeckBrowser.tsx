'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

export type AdminDeckLite = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  tags: string[];
  company: string;
  visibility: 'public' | 'protected';
  require_otp: boolean;
  is_published: boolean;
  has_password: boolean;
  has_thumbnail: boolean;
  has_source: boolean; // đã gắn link Nguồn / Chat gốc (claude chat/cowork) chưa
  createdLabel: string;
  updatedLabel: string;
};

function hueFor(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

function Thumb({ d }: { d: AdminDeckLite }) {
  if (d.has_thumbnail) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="thumb-img" src={`/api/thumb/${d.id}`} alt="" loading="lazy" />;
  }
  const hue = hueFor(d.category || d.company || d.title);
  return (
    <div
      className="thumb-ph"
      style={{ background: `linear-gradient(135deg, hsl(${hue} 55% 42%), hsl(${(hue + 40) % 360} 55% 32%))` }}
    >
      <span>{(d.title.trim()[0] ?? '?').toUpperCase()}</span>
    </div>
  );
}

function ModePill({ d }: { d: AdminDeckLite }) {
  const openPublic = d.visibility === 'public' && !d.has_password;
  return (
    <span className={`pill ${openPublic ? 'ok' : ''}`}>{openPublic ? 'Công khai' : 'Bảo mật'}</span>
  );
}

function Flags({ d }: { d: AdminDeckLite }) {
  return (
    <>
      {d.has_password && <span className="pill" style={{ fontSize: 10 }}>🔒 mật khẩu</span>}
      {d.require_otp && <span className="pill" style={{ fontSize: 10 }}>OTP</span>}
      {!d.is_published && <span className="pill bad" style={{ fontSize: 10 }}>đã ẩn</span>}
      {!d.has_source && <span className="pill warn" style={{ fontSize: 10 }} title="Chưa gắn link Nguồn / Chat gốc">⚠ chưa có nguồn</span>}
    </>
  );
}

const isOpenPublic = (d: AdminDeckLite) => d.visibility === 'public' && !d.has_password;

export default function AdminDeckBrowser({ decks }: { decks: AdminDeckLite[] }) {
  const [view, setView] = useState<'table' | 'thumb'>('table');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [src, setSrc] = useState<'all' | 'has' | 'none'>('all');
  const [sec, setSec] = useState<'all' | 'public' | 'protected'>('all');

  useEffect(() => {
    const v = localStorage.getItem('adminDeckView');
    if (v === 'table' || v === 'thumb') setView(v);
  }, []);
  function pick(v: 'table' | 'thumb') {
    setView(v);
    try { localStorage.setItem('adminDeckView', v); } catch { /* ignore */ }
  }

  const categories = useMemo(
    () => Array.from(new Set(decks.map((d) => d.category).filter((c): c is string => !!c))).sort(),
    [decks],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return decks.filter((d) => {
      if (cat && d.category !== cat) return false;
      if (src === 'has' && !d.has_source) return false;
      if (src === 'none' && d.has_source) return false;
      if (sec === 'public' && !isOpenPublic(d)) return false;
      if (sec === 'protected' && isOpenPublic(d)) return false;
      if (!needle) return true;
      const hay = [d.title, d.slug, d.company, d.category ?? '', d.tags.join(' ')].join(' ').toLowerCase();
      return hay.includes(needle);
    });
  }, [decks, q, cat, src, sec]);

  const noSrcCount = useMemo(() => decks.filter((d) => !d.has_source).length, [decks]);

  return (
    <div>
      <div className="gallery-toolbar">
        <input
          className="gallery-search"
          placeholder="Tìm deck (tên, slug, danh mục, thẻ, công ty)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="filter-select" value={sec} onChange={(e) => setSec(e.target.value as typeof sec)} aria-label="Lọc theo chế độ">
          <option value="all">Chế độ: tất cả</option>
          <option value="public">Công khai</option>
          <option value="protected">Bảo mật</option>
        </select>
        <select className="filter-select" value={src} onChange={(e) => setSrc(e.target.value as typeof src)} aria-label="Lọc theo nguồn">
          <option value="all">Nguồn: tất cả</option>
          <option value="has">✓ Có nguồn</option>
          <option value="none">⚠ Chưa có nguồn{noSrcCount ? ` (${noSrcCount})` : ''}</option>
        </select>
        <div className="view-toggle" role="group" aria-label="Kiểu hiển thị">
          <button className={view === 'table' ? 'active' : ''} onClick={() => pick('table')} title="Chi tiết" type="button">☰ Chi tiết</button>
          <button className={view === 'thumb' ? 'active' : ''} onClick={() => pick('thumb')} title="Thumbnail" type="button">▦ Thumbnail</button>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="chips">
          <button className={`chip ${cat === '' ? 'active' : ''}`} onClick={() => setCat('')} type="button">
            Tất cả ({decks.length})
          </button>
          {categories.map((c) => (
            <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(cat === c ? '' : c)} type="button">
              {c} ({decks.filter((d) => d.category === c).length})
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="notice" style={{ marginTop: 16 }}>Không có deck khớp bộ lọc.</div>
      ) : view === 'thumb' ? (
        <div className="deck-grid">
          {filtered.map((d) => (
            <Link key={d.id} className="deck-card admin-card" href={`/admin/decks/${d.id}`}>
              <div className="thumb"><Thumb d={d} /></div>
              <div className="deck-card-body">
                <div className="deck-meta-line">
                  <span className="deck-company">{d.company}</span>
                  {d.category && <span className="deck-cat">{d.category}</span>}
                </div>
                <h3>{d.title}</h3>
                <div className="row" style={{ gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
                  <ModePill d={d} />
                  <Flags d={d} />
                </div>
                {d.tags.length > 0 && (
                  <div className="deck-tags">{d.tags.slice(0, 5).map((t) => <span key={t} className="deck-tag">#{t}</span>)}</div>
                )}
                <div className="admin-card-foot">
                  <span title="Ngày tạo">🗓 {d.createdLabel}</span>
                  <span title="Cập nhật gần nhất">✎ {d.updatedLabel}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <table style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th>Deck</th><th>Slug</th><th>Chế độ</th><th>Trạng thái</th><th>Tạo</th><th>Cập nhật</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id}>
                <td>
                  {d.title}
                  {d.category && <span className="deck-cat" style={{ marginLeft: 8 }}>{d.category}</span>}
                </td>
                <td className="muted">{d.slug}</td>
                <td>
                  <ModePill d={d} />
                  {d.has_password && <span className="pill" style={{ marginLeft: 6 }}>🔒</span>}
                  {d.require_otp && <span className="pill" style={{ marginLeft: 6 }}>OTP</span>}
                </td>
                <td>
                  {d.is_published ? 'Đã xuất bản' : <span className="pill bad">Đã ẩn</span>}
                  {!d.has_source && <span className="pill warn" style={{ marginLeft: 6, fontSize: 10 }} title="Chưa gắn link Nguồn / Chat gốc">⚠ chưa có nguồn</span>}
                </td>
                <td className="muted" style={{ whiteSpace: 'nowrap', fontSize: 12.5 }}>{d.createdLabel}</td>
                <td className="muted" style={{ whiteSpace: 'nowrap', fontSize: 12.5 }}>{d.updatedLabel}</td>
                <td><Link className="btn" href={`/admin/decks/${d.id}`}>Quản lý</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
