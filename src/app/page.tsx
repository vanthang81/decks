import Link from 'next/link';
import { listPublicDecks } from '@/lib/decks';

export const dynamic = 'force-dynamic';

export default async function GalleryPage() {
  let decks: Awaited<ReturnType<typeof listPublicDecks>> = [];
  let dbErr = false;
  try {
    decks = await listPublicDecks();
  } catch {
    dbErr = true;
  }

  return (
    <main className="wrap">
      <div className="topbar">
        <div>
          <div className="brand">Deck Library</div>
          <h1 style={{ marginBottom: 0 }}>Slide deck BTMH</h1>
        </div>
        <Link className="btn" href="/admin">Quản trị</Link>
      </div>
      <p className="sub">Các deck công khai. Deck bảo mật chỉ mở qua link cá nhân được cấp.</p>

      {dbErr ? (
        <div className="notice">Chưa kết nối được dữ liệu. Kiểm tra cấu hình DB.</div>
      ) : decks.length === 0 ? (
        <div className="notice">Chưa có deck công khai nào.</div>
      ) : (
        <div className="grid">
          {decks.map((d) => (
            <Link key={d.id} className="card" href={`/d/${d.slug}`}>
              <span className="tag">Công khai</span>
              <h3>{d.title}</h3>
              {d.description && <p>{d.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
