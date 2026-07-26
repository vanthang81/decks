import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listDecks } from '@/lib/decks';
import SiteHeader from '@/components/SiteHeader';

export const dynamic = 'force-dynamic';

export default async function GalleryPage() {
  // Trang chủ = thư viện deck NỘI BỘ, chỉ admin đã đăng nhập mới xem được danh sách.
  // Middleware đã gác `/`; kiểm tra lại ở đây cho chắc (defense-in-depth).
  const session = await auth();
  if (!session?.user) redirect('/login');

  let decks: Awaited<ReturnType<typeof listDecks>> = [];
  let dbErr = false;
  try {
    decks = await listDecks();
  } catch {
    dbErr = true;
  }

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
            Danh sách deck nội bộ — chỉ hiện sau khi đăng nhập. Người xem ngoài chỉ vào từng deck
            qua link cá nhân được cấp (có watermark &amp; thu hồi được).
          </p>
        </div>

        {dbErr ? (
          <div className="notice">Chưa kết nối được dữ liệu. Kiểm tra cấu hình DB.</div>
        ) : decks.length === 0 ? (
          <div className="notice">Chưa có deck nào. Vào <Link href="/admin">Quản trị</Link> để thêm.</div>
        ) : (
          <div className="grid">
            {decks.map((d) => (
              <Link key={d.id} className="card" href={`/admin/decks/${d.id}`}>
                <span className={`tag ${d.visibility === 'public' ? '' : 'protected'}`}>
                  {d.visibility === 'public' ? 'Công khai' : 'Bảo mật'}
                  {d.require_otp ? ' · OTP' : ''}
                  {d.is_published ? '' : ' · nháp'}
                </span>
                <h3>{d.title}</h3>
                {d.description && <p>{d.description}</p>}
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
