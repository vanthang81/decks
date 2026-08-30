'use client';

// Nút "Xoá lọc" DÙNG CHUNG cho MỌI thanh lọc (CFO 30/08) — luôn là 1 nút in-flow bình thường
// (`btn ghost sm`), KHÔNG bao giờ position:absolute/float → không lọt ra ngoài thanh lọc.
// Đặt là phần tử CUỐI trong thanh lọc (flex-wrap), tự xuống dòng gọn trên mobile.
// Gating hiển thị (chỉ hiện khi ĐANG lọc) do thanh lọc cha quyết định.
export default function ClearFiltersButton({
  onClear,
  count,
  title = 'Xoá tất cả bộ lọc',
}: {
  onClear: () => void;
  count?: number;
  title?: string;
}) {
  return (
    <button type="button" className="btn ghost sm fb-clear" onClick={onClear} title={title}>
      ✕ Xoá lọc{typeof count === 'number' ? ` (${count})` : ''}
    </button>
  );
}
