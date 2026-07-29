import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listDecks } from '@/lib/decks';
import SiteHeader from '@/components/SiteHeader';
import DeckGallery, { type DeckLite } from '@/components/DeckGallery';

export const dynamic = 'force-dynamic';

export default async function GalleryPage() {
  // Trang chủ = thư viện deck NỘI BỘ, chỉ admin đã đăng nhập mới xem được danh sách.
  const session = await auth();
  if (!session?.user) redirect('/login');

  let decks: Awaited<ReturnType<typeof listDecks>> = [];
  let dbErr = false;
  try {
    decks = await listDecks();
  } catch {
    dbErr = true;
  }

  const lite: DeckLite[] = decks.map((d) => ({
    id: d.id,
    slug: d.slug,
    title: d.title,
    description: d.description,
    visibility: d.visibility,
    require_otp: d.require_otp,
    is_published: d.is_published,
    has_password: d.has_password,
    has_thumbnail: d.has_thumbnail,
    category: d.category,
    tags: d.tags,
    company: d.company,
  }));

  return (
    <>
      <SiteHeader
        subtitle="Thư viện deck"
        showHome={false}
        actions={<Link className="btn primary" href="/admin">Quản trị</Link>}
      />
      <main className="wrap">
        <div className="hero">
          <div className="brand">Bảo Tín Mạnh Hải · ConsultX</div>
          <h1 style={{ marginBottom: 0 }}>Thư viện Slide Deck</h1>
          <p className="sub" style={{ margin: '8px 0 0' }}>
            {decks.length} deck nội bộ — lọc theo danh mục, đổi kiểu hiển thị lưới/danh sách. Người xem ngoài
            chỉ vào từng deck qua link cá nhân được cấp.
          </p>
        </div>

        {dbErr ? (
          <div className="notice">Chưa kết nối được dữ liệu. Kiểm tra cấu hình DB.</div>
        ) : decks.length === 0 ? (
          <div className="notice">Chưa có deck nào. Vào <Link href="/admin">Quản trị</Link> để thêm.</div>
        ) : (
          <DeckGallery decks={lite} />
        )}
      </main>
    </>
  );
}
