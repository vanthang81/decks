// Tự phân danh mục cho deck — ĐẢM BẢO mọi deck LUÔN thuộc 1 danh mục (không để trống).
// Suy từ tiêu đề/mô tả/thẻ theo từ khoá; không khớp → "Tài liệu chung". Có thể sinh danh mục MỚI
// (danh mục là free-text, DISTINCT ở listCategories) → tự mở rộng theo nhu cầu quản trị.
// Thứ tự ưu tiên khi CHỌN danh mục: admin nhập tay > danh mục hiện có của deck > suy luận > fallback.

type Rule = { cat: string; kw: RegExp };

// Thứ tự QUAN TRỌNG: rule khớp trước thắng. Xếp cái đặc thù/ý định lên trên.
const RULES: Rule[] = [
  { cat: 'Nhà đầu tư', kw: /nhà đầu tư|cổ đông|investor|ipo|gọi vốn|equity|shareholder|định giá|valuation/i },
  { cat: 'Đối tác', kw: /đối tác|partner|hợp tác|liên doanh|liên kết|\bmou\b/i },
  { cat: 'Chiến lược', kw: /chiến lược|strategy|định hướng|kế hoạch|roadmap|tầm nhìn|mở rộng/i },
  { cat: 'Nghiên cứu thị trường', kw: /khảo sát|nghiên cứu|thị trường|market|survey|phân tích ngành/i },
  { cat: 'Sản phẩm & Nguồn cung', kw: /nguồn cung|supply|trang sức|sản phẩm|sản xuất|product|nhẫn|dây chuyền/i },
  { cat: 'Báo cáo & Quản trị', kw: /báo cáo|report|kqkd|dashboard|hiệu suất|quản trị|số liệu|\bkpi\b|p&l|tài chính|doanh thu/i },
  { cat: 'Nội bộ', kw: /bảo mật|kiến trúc|phân quyền|hệ thống|kỹ thuật|security|architecture|portal|connector|\bmcp\b|\bapi\b|playbook|methodology|vận hành/i },
  { cat: 'Hướng dẫn', kw: /đào tạo|training|hướng dẫn|quy trình|onboarding|\bsop\b|giới thiệu/i },
];

const FALLBACK = 'Tài liệu chung';

export function inferCategory(d: {
  title?: string | null;
  description?: string | null;
  tags?: string[] | null;
}): string {
  const hay = [d.title ?? '', d.description ?? '', ...(d.tags ?? [])].join(' ').toLowerCase();
  for (const r of RULES) if (r.kw.test(hay)) return r.cat;
  return FALLBACK;
}

// Quyết định danh mục cuối cùng cho 1 lần ghi deck. KHÔNG ghi đè danh mục sẵn có khi không có ý định đổi.
//   explicit = giá trị người dùng/API vừa nhập (nếu có) ; existing = danh mục hiện tại của deck.
export function resolveCategory(
  explicit: string | null | undefined,
  existing: string | null | undefined,
  d: { title?: string | null; description?: string | null; tags?: string[] | null },
): string {
  const e = (explicit ?? '').trim();
  if (e) return e;
  const cur = (existing ?? '').trim();
  if (cur) return cur;
  return inferCategory(d);
}
