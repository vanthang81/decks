'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type MouseEvent } from 'react';

export type DeckLite = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  visibility: 'public' | 'protected';
  require_otp: boolean;
  is_published: boolean;
  has_password: boolean;
  has_thumbnail: boolean;
  category: string | null;
  tags: string[];
  company: string;
  has_source: boolean; // đã có link "Nguồn / Chat gốc" (claude chat/cowork) chưa
  groups: string[]; // tên các nhóm được cấp deck này
  pending: number; // số yêu cầu cấp quyền đang chờ duyệt
};

function hueFor(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

function Thumb({ d }: { d: DeckLite }) {
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

// Thanh link "mở deck" (URL đầy đủ) + nút copy — để gửi/xem ngay không cần vào trang quản trị deck.
function UrlBar({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }
  return (
    <div className="deck-url-bar">
      <a className="deck-url" href={url} target="_blank" rel="noreferrer" title={`Mở deck trong tab mới: ${url}`}>
        ↗ {url.replace(/^https?:\/\//, '')}
      </a>
      <button type="button" className="deck-copy" onClick={copy} title="Copy link để gửi">
        {copied ? '✓ Đã copy' : 'Copy'}
      </button>
    </div>
  );
}

function Badges({ d }: { d: DeckLite }) {
  return (
    <span className="row" style={{ gap: 5 }}>
      {(() => {
        const openPublic = d.visibility === 'public' && !d.has_password;
        return (
          <span className={`tag ${openPublic ? '' : 'protected'}`} style={{ fontSize: 10 }}>
            {openPublic ? 'Công khai' : 'Bảo mật'}
          </span>
        );
      })()}
      {d.has_password && <span className="pill" style={{ fontSize: 10 }}>🔒 mật khẩu</span>}
      {d.require_otp && <span className="pill" style={{ fontSize: 10 }}>OTP</span>}
      {!d.is_published && <span className="pill bad" style={{ fontSize: 10 }}>đã ẩn</span>}
      {d.pending > 0 && <span className="pill bad" style={{ fontSize: 10 }}>🔔 {d.pending} chờ duyệt</span>}
      {!d.has_source && (
        <span className="pill warn" style={{ fontSize: 10 }} title="Chưa gắn link Nguồn / Chat gốc (claude chat/cowork)">
          ⚠ chưa có nguồn
        </span>
      )}
    </span>
  );
}

// Các nhóm được cấp deck (để dễ nhìn deck nào đang chia sẻ cho nhóm nào).
function Groups({ d }: { d: DeckLite }) {
  if (!d.groups.length) return null;
  return (
    <div className="deck-groups" title={`Đã cấp cho nhóm: ${d.groups.join(', ')}`}>
      {d.groups.map((g) => (
        <span key={g} className="deck-group">👥 {g}</span>
      ))}
    </div>
  );
}

export default function DeckGallery({ decks, baseUrl = '' }: { decks: DeckLite[]; baseUrl?: string }) {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('');

  useEffect(() => {
    const v = localStorage.getItem('deckView');
    if (v === 'list' || v === 'grid') setView(v);
  }, []);
  function pick(v: 'grid' | 'list') {
    setView(v);
    localStorage.setItem('deckView', v);
  }

  const categories = useMemo(
    () => Array.from(new Set(decks.map((d) => d.category).filter((c): c is string => !!c))).sort(),
    [decks],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return decks.filter((d) => {
      if (cat && d.category !== cat) return false;
      if (!needle) return true;
      const hay = [d.title, d.description ?? '', d.company, d.category ?? '', d.tags.join(' ')]
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [decks, q, cat]);

  return (
    <div>
      <div className="gallery-toolbar">
        <input
          className="gallery-search"
          placeholder="Tìm deck (tên, mô tả, thẻ, công ty)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="view-toggle" role="group" aria-label="Kiểu hiển thị">
          <button className={view === 'grid' ? 'active' : ''} onClick={() => pick('grid')} title="Lưới" type="button">▦ Lưới</button>
          <button className={view === 'list' ? 'active' : ''} onClick={() => pick('list')} title="Danh sách" type="button">☰ Danh sách</button>
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
        <div className="notice">Không có deck khớp bộ lọc.</div>
      ) : view === 'grid' ? (
        <div className="deck-grid">
          {filtered.map((d) => (
            <div key={d.id} className="deck-card">
              <Link className="deck-card-link" href={`/admin/decks/${d.id}`}>
                <div className="thumb"><Thumb d={d} /></div>
                <div className="deck-card-body">
                  <div className="deck-meta-line">
                    <span className="deck-company">{d.company}</span>
                    {d.category && <span className="deck-cat">{d.category}</span>}
                  </div>
                  <h3>{d.title}</h3>
                  {d.description && <p className="deck-desc">{d.description}</p>}
                  {d.tags.length > 0 && (
                    <div className="deck-tags">{d.tags.map((t) => <span key={t} className="deck-tag">#{t}</span>)}</div>
                  )}
                  <Badges d={d} />
                  <Groups d={d} />
                </div>
              </Link>
              <UrlBar url={`${baseUrl}/d/${d.slug}`} />
            </div>
          ))}
        </div>
      ) : (
        <div className="deck-list">
          {filtered.map((d) => (
            <div key={d.id} className="deck-row">
              <Link className="deck-row-link" href={`/admin/decks/${d.id}`}>
                <div className="thumb thumb-sm"><Thumb d={d} /></div>
                <div className="deck-row-main">
                  <div className="deck-meta-line">
                    <span className="deck-company">{d.company}</span>
                    {d.category && <span className="deck-cat">{d.category}</span>}
                  </div>
                  <h3>{d.title}</h3>
                  {d.description && <p className="deck-desc">{d.description}</p>}
                  {d.tags.length > 0 && (
                    <div className="deck-tags">{d.tags.map((t) => <span key={t} className="deck-tag">#{t}</span>)}</div>
                  )}
                  <Groups d={d} />
                </div>
              </Link>
              <div className="deck-row-badges"><Badges d={d} /></div>
              <div className="deck-row-urlbar"><UrlBar url={`${baseUrl}/d/${d.slug}`} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
