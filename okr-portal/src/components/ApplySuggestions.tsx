'use client';

import { useToast } from './ToastProvider';

// Nút "Áp dụng gợi ý": tick MỌI ô năng lực được hệ thống GỢI Ý cho nhóm nhưng hiện đang tắt
// (ô có data-suggested="1"). Giúp khi thêm tính năng/quyền mới → 1 cú bấm phân quyền theo gợi ý,
// admin xem lại rồi bấm "Lưu phân quyền". Không tự lưu (admin vẫn kiểm soát).
export default function ApplySuggestions({ count }: { count: number }) {
  const { toast } = useToast();
  if (count <= 0) return null;
  const apply = (e: React.MouseEvent<HTMLButtonElement>) => {
    const form = e.currentTarget.closest('form');
    if (!form) return;
    let n = 0;
    form
      .querySelectorAll<HTMLInputElement>('input[type=checkbox][data-suggested="1"]:not(:disabled)')
      .forEach((cb) => { if (!cb.checked) n++; cb.checked = true; });
    toast(
      n > 0 ? `Đã bật ${n} ô gợi ý — bấm “Lưu phân quyền” để áp dụng` : 'Các ô gợi ý đã được bật sẵn',
      n > 0 ? 'success' : 'info',
    );
  };
  return (
    <button type="button" className="btn ghost" onClick={apply}
      title="Bật các ô đang được gợi ý cho từng nhóm (chưa lưu — bấm Lưu phân quyền sau đó)">
      ✨ Áp dụng {count} gợi ý
    </button>
  );
}
