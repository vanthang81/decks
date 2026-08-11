import Link from 'next/link';

// Tên người → link tới hồ sơ 360° (/users/<email>). Ai cũng bấm được; trang tự phân quyền
// (quản trị xem đầy đủ, người thường xem định danh + số lượng). Không có email → chỉ hiện text.
// stop=true để chặn nổi bọt sự kiện khi đặt trong 1 hàng/thẻ vốn đã bắt onClick (mở popup…).
// title (tuỳ chọn) = CHỨC DANH (vai trò · đơn vị) → hiện dòng phụ mờ dưới tên để phân biệt người trùng tên.
export default function UserLink({
  email, name, className, stop, title,
}: {
  email?: string | null;
  name?: string | null;
  className?: string;
  stop?: boolean;
  title?: string | null;
}) {
  const label = name || email || '—';
  const link = !email ? (
    <span className={className}>{label}</span>
  ) : (
    <Link
      href={`/users/${encodeURIComponent(email)}`}
      className={className ? `${className} user-link` : 'user-link'}
      title="Xem hồ sơ 360°"
      onClick={stop ? (e) => e.stopPropagation() : undefined}
    >
      {label}
    </Link>
  );
  if (!title) return link;
  return (
    <span className="user-with-title">
      {link}
      <span className="user-title-sub">{title}</span>
    </span>
  );
}
