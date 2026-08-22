import Link from 'next/link';
import { createDeckAction } from '../actions';
import SubmitBar from '@/components/SubmitBar';

export const dynamic = 'force-dynamic';

export default function NewDeckPage() {
  return (
    <div style={{ maxWidth: 560 }}>
      <p style={{ margin: '0 0 10px' }}><Link href="/admin">← Về danh sách deck</Link></p>
      <h2 style={{ marginTop: 0 }}>Thêm deck mới</h2>
      <p className="muted">Tải lên tài liệu (<code>.pdf / .pptx / .html</code>) hoặc dán HTML self-contained; khai báo metadata &amp; quyền. Tối đa 20MB/file.</p>

      <form action={createDeckAction}>
        <label htmlFor="slug">Slug (đường dẫn deck, vd: btmh-investor-2026)</label>
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
            <input id="category" name="category" placeholder="vd: Nhà đầu tư (để trống = tự phân loại)" />
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
        <SubmitBar label="Lưu deck" pendingLabel="Đang tạo deck & xử lý…" className="btn primary" />
      </form>
    </div>
  );
}
