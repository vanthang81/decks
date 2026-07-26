import Link from 'next/link';
import { listDecks } from '@/lib/decks';
import { createDeckAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function AdminDecksPage() {
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
                <span className={`pill ${d.visibility === 'public' ? 'ok' : ''}`}>
                  {d.visibility === 'public' ? 'Công khai' : 'Bảo mật'}
                </span>
                {d.require_otp && <span className="pill" style={{ marginLeft: 6 }}>OTP</span>}
              </td>
              <td>{d.is_published ? 'Đã xuất bản' : 'Nháp'}</td>
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
