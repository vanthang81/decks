import Link from 'next/link';
import { listDecks } from '@/lib/decks';

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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>
          Decks{' '}
          {decks.length > 0 && <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>({decks.length})</span>}
        </h2>
        <Link className="btn primary" href="/admin/new">+ Thêm deck mới</Link>
      </div>

      {searchParams.deleted && (
        <div className="notice" style={{ margin: '16px 0 0' }}>✓ Đã xoá vĩnh viễn deck <code>{searchParams.deleted}</code>.</div>
      )}
      {dbErr && <p style={{ color: '#b04a32' }}>Chưa kết nối được DB (kiểm tra DATABASE_URL / đã chạy schema chưa).</p>}

      <table style={{ marginTop: 18 }}>
        <thead>
          <tr>
            <th>Deck</th><th>Slug</th><th>Chế độ</th><th>Trạng thái</th><th>Tạo</th><th>Cập nhật</th><th></th>
          </tr>
        </thead>
        <tbody>
          {decks.map((d) => (
            <tr key={d.id}>
              <td>{d.title}</td>
              <td className="muted">{d.slug}</td>
              <td>
                <span className={`pill ${d.visibility === 'public' && !d.has_password ? 'ok' : ''}`}>
                  {d.visibility === 'public' && !d.has_password ? 'Công khai' : 'Bảo mật'}
                </span>
                {d.require_otp && <span className="pill" style={{ marginLeft: 6 }}>OTP</span>}
              </td>
              <td>{d.is_published ? 'Đã xuất bản' : <span className="pill bad">Đã ẩn</span>}</td>
              <td className="muted" style={{ whiteSpace: 'nowrap', fontSize: 12.5 }}>{fmtVN(d.created_at)}</td>
              <td className="muted" style={{ whiteSpace: 'nowrap', fontSize: 12.5 }}>{fmtVN(d.updated_at)}</td>
              <td><Link className="btn" href={`/admin/decks/${d.id}`}>Quản lý</Link></td>
            </tr>
          ))}
          {decks.length === 0 && !dbErr && (
            <tr><td colSpan={7} className="muted">Chưa có deck nào — bấm <b>“+ Thêm deck mới”</b> để tải tài liệu đầu tiên.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
