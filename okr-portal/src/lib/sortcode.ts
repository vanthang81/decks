// So sánh MÃ theo thứ tự TỰ NHIÊN (numeric): "…-05" < "…-07" < "…-08" < "…-010" < "…-011"
// (localeCompare numeric:true so phần số theo GIÁ TRỊ, không theo ký tự → hết cảnh 010 đứng trước 05).
// Mã rỗng/null xếp CUỐI. Dùng chung cho cây OKR (client) và Báo cáo theo cấp (server) — thuần, không import.
export function naturalCodeCompare(a: string | null | undefined, b: string | null | undefined): number {
  const ax = a && a.trim() ? a : '￿';
  const bx = b && b.trim() ? b : '￿';
  return ax.localeCompare(bx, 'en', { numeric: true, sensitivity: 'base' });
}
