'use client';

// Nút "In / Lưu PDF": mở hết các nhóm <details> đang thu gọn trong .wrap rồi gọi print
// (trình duyệt → Lưu thành PDF). CSS @media print đã ẩn header/nút/footer.
export default function PrintButton({ label = '🖨 In / Lưu PDF' }: { label?: string }) {
  function onClick() {
    document.querySelectorAll<HTMLDetailsElement>('.wrap details').forEach((d) => { d.open = true; });
    setTimeout(() => window.print(), 60);
  }
  return (
    <button type="button" className="btn ghost" onClick={onClick}>
      {label}
    </button>
  );
}
