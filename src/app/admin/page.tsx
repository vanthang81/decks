import Link from 'next/link';
import { listDecks } from '@/lib/decks';
import { createDeckAction } from './actions';

export const dynamic = 'force-dynamic';

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
      <h2>Decks</h2>
      {searchParams.deleted && (
        <div className="notice" style={{ marginBottom: 16 }}>✓ Đã xoá vĩnh viễn deck <code>{searchParams.deleted}</code>.</div>
      )}
      {dbErr && <p style={{ color: '#b04a32' }}>Chưa kết nối được DB (kiểm tra DATABASE_URL / đã chạy schema chưa).</p>}

      <table style={{ marginBottom: 32 }}>
        <thead>
          <tr><th>Deck</th><th>Slug</th><th>Chế độ</th><th>Trạng thái</th><th></th></tr>
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
              <td><Link className="btn" href={`/admin/decks/${d.id}`}>Quản lý</Link></td>
            </tr>
          ))}
          {decks.length === 0 && !dbErr && (
            <tr><td colSpan={5} className="muted">Chưa có deck nào.</td></tr>
          )}
        </tbody>
      </table>

      <h2>Thêm / cập nhật deck</h2>
      <p className="muted">Nội dung deck là file <code>content/decks/&lt;slug&gt;.html</code> trong repo. Ở đây khai báo metadata &amp; quyền.</p>
      <form action={createDeckAction} style={{ maxWidth: 560 }}>
        <label htmlFor="slug">Slug (trùng tên file .html)</label>
        <input id="slug" name="slug" placeholder="vd: btmh-investor-2026" required />
        <label htmlFor="title">Tiêu đề</label>
        <input id="title" name="title" required />
        <label htmlFor="description">Mô tả</label>
        <input id="description" name="description" />
        <div className="row">
          <div style={{ flex: 1 }}>
            <label htmlFor="company">Công ty</label>
            <input id="company" name="company" defaultValue="BTMH" />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="category">Danh mục</label>
            <input id="category" name="category" placeholder="vd: Nhà đầu tư" />
          </div>
        </div>
        <label htmlFor="tags">Thẻ (tags) — cách nhau bằng dấu phẩy</label>
        <input id="tags" name="tags" placeholder="vd: 2026, chiến lược" />
        <label htmlFor="htmlfile">Nội dung deck — tải file <b>.pdf / .pptx / .html</b> <span className="muted">(hoặc dán HTML bên dưới; tối đa 20MB/file)</span></label>
        <input id="htmlfile" name="htmlfile" type="file" accept=".html,text/html,.pdf,application/pdf,.pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint" />
        <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>PDF/PPTX sẽ được tự chuyển thành deck ảnh xem trên web (giữ đầy đủ watermark, mật khẩu, cấp/thu link, log). Có thể mất vài giây với file nhiều trang.</p>
        <label htmlFor="content">…hoặc dán HTML self-contained</label>
        <textarea id="content" name="content" rows={5} placeholder="<!doctype html>…" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }} />
        <p className="muted">Để trống cả hai nếu bạn đã đặt file <code>content/decks/&lt;slug&gt;.html</code> trong repo.</p>
        <label htmlFor="visibility">Chế độ</label>
        <select id="visibility" name="visibility" defaultValue="protected">
          <option value="protected">Bảo mật (cần link cá nhân)</option>
          <option value="public">Công khai</option>
        </select>
        <div className="row" style={{ marginTop: 12 }}>
          <label style={{ margin: 0 }}><input type="checkbox" name="require_otp" style={{ width: 'auto' }} /> Bắt OTP email</label>
          <label style={{ margin: 0 }}><input type="checkbox" name="is_published" defaultChecked style={{ width: 'auto' }} /> Xuất bản</label>
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn primary" type="submit">Lưu deck</button>
        </div>
      </form>
    </div>
  );
}
