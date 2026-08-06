import Link from 'next/link';

// Tên người → link tới hồ sơ 360° (/users/<email>). Ai cũng bấm được; trang tự phân quyền
// (quản trị xem đầy đủ, người thường xem định danh + số lượng). Không có email → chỉ hiện text.
// stop=true để chặn nổi bọt sự kiện khi đặt trong 1 hàng/thẻ vốn đã bắt onClick (mở popup…).
export default function UserLink({
  email, name, className, stop,
}: {
  email?: string | null;
  name?: string | null;
  className?: string;
  stop?: boolean;
}) {
  const label = name || email || '—';
  if (!email) return <span className={className}>{label}</span>;
  return (
    <Link
      href={`/users/${encodeURIComponent(email)}`}
      className={className ? `${className} user-link` : 'user-link'}
      title="Xem hồ sơ 360°"
      onClick={stop ? (e) => e.stopPropagation() : undefined}
    >
      {label}
    </Link>
  );
}
