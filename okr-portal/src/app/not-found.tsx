import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';

// Trang "không tìm thấy" thân thiện — hiện khi mở một nội dung ĐÃ BỊ XOÁ hoặc không tồn tại
// (vd bấm thông báo trỏ tới cuộc họp/công việc/OKR đã gỡ). Thay cho trang 404 trắng mặc định.
export default async function NotFound() {
  return (
    <>
      <SiteHeader />
      <div className="wrap">
        <div className="card nf-card">
          <div className="nf-ic" aria-hidden>🔎</div>
          <div className="pagetitle" style={{ marginTop: 0 }}>Không tìm thấy nội dung</div>
          <p className="muted" style={{ margin: '6px 0 0', fontSize: 14.5, lineHeight: 1.6, maxWidth: 560 }}>
            Nội dung bạn vừa mở <b>không tồn tại</b> hoặc <b>đã bị xoá</b>. Có thể cuộc họp, công việc,
            OKR hay hồ sơ này đã được gỡ, hoặc bạn không còn quyền xem. Nếu bạn tới đây từ một thông báo,
            rất có thể mục được nhắc tới đã bị xoá sau đó.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            <Link className="btn" href="/">← Về trang chủ</Link>
            <Link className="btn ghost" href="/notifications">Xem thông báo</Link>
          </div>
        </div>
      </div>
    </>
  );
}
