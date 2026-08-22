import Link from 'next/link';
import { listDecks } from '@/lib/decks';
import AdminDeckBrowser, { type AdminDeckLite } from '@/components/AdminDeckBrowser';

export const dynamic = 'force-dynamic';

// Giờ VN, gọn: ngày/tháng/năm + giờ:phút (vd 22/08/26 14:15).
function fmtVN(s?: string): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export default async function AdminDecksPage({
  searchParams,
}: {
  searchParams: { deleted?: string };
}) {
  let decks: Awaited<ReturnType<typeof listDecks>> = [];
  let dbErr = false;
  try {
    decks = await listDecks();
  } catch {
    dbErr = true;
  }

  const items: AdminDeckLite[] = decks.map((d) => ({
    id: d.id,
    slug: d.slug,
    title: d.title,
    category: d.category ?? null,
    tags: d.tags ?? [],
    company: d.company ?? 'BTMH',
    visibility: d.visibility,
    require_otp: d.require_otp,
    is_published: d.is_published,
    has_password: d.has_password,
    has_thumbnail: d.has_thumbnail ?? false,
    createdLabel: fmtVN(d.created_at),
    updatedLabel: fmtVN(d.updated_at),
  }));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>
          Decks{' '}
          {items.length > 0 && <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>({items.length})</span>}
        </h2>
        <Link className="btn primary" href="/admin/new">+ Thêm deck mới</Link>
      </div>

      {searchParams.deleted && (
        <div className="notice" style={{ margin: '16px 0 0' }}>✓ Đã xoá vĩnh viễn deck <code>{searchParams.deleted}</code>.</div>
      )}
      {dbErr && <p style={{ color: '#b04a32' }}>Chưa kết nối được DB (kiểm tra DATABASE_URL / đã chạy schema chưa).</p>}

      {!dbErr && items.length === 0 ? (
        <div className="notice" style={{ marginTop: 18 }}>Chưa có deck nào — bấm <b>“+ Thêm deck mới”</b> để tải tài liệu đầu tiên.</div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <AdminDeckBrowser decks={items} />
        </div>
      )}
    </div>
  );
}
