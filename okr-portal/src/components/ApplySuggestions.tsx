'use client';

// Nút "Áp dụng gợi ý": tick MỌI ô năng lực được hệ thống GỢI Ý cho nhóm nhưng hiện đang tắt
// (ô có data-suggested="1"). Giúp khi thêm tính năng/quyền mới → 1 cú bấm phân quyền theo gợi ý,
// admin xem lại rồi bấm "Lưu phân quyền". Không tự lưu (admin vẫn kiểm soát).
export default function ApplySuggestions({ count }: { count: number }) {
  if (count <= 0) return null;
  const apply = (e: React.MouseEvent<HTMLButtonElement>) => {
    const form = e.currentTarget.closest('form');
    if (!form) return;
    form
      .querySelectorAll<HTMLInputElement>('input[type=checkbox][data-suggested="1"]:not(:disabled)')
      .forEach((cb) => { cb.checked = true; });
  };
  return (
    <button type="button" className="btn ghost" onClick={apply}
      title="Bật các ô đang được gợi ý cho từng nhóm (chưa lưu — bấm Lưu phân quyền sau đó)">
      ✨ Áp dụng {count} gợi ý
    </button>
  );
}
