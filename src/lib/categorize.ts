// Tự phân danh mục cho deck — ĐẢM BẢO mọi deck LUÔN thuộc 1 danh mục (không để trống) và
// TỔNG SỐ DANH MỤC GIỚI HẠN (bộ chuẩn dưới 10). Auto-phân loại CHỈ dùng bộ danh mục chuẩn bên dưới
// nên không bao giờ "nở" quá 10; admin có thể nhập tay danh mục khác (chủ động).
// Review NỘI DUNG: suy danh mục từ tiêu đề/mô tả/thẻ TRƯỚC, nếu chưa rõ thì đọc TEXT của nội dung deck.
// Thứ tự ưu tiên khi CHỌN danh mục: admin nhập tay > danh mục hiện có của deck > suy luận (nội dung) > fallback.

type Rule = { cat: string; kw: RegExp };

// BỘ DANH MỤC CHUẨN (8 + fallback = 9 < 10). Auto-phân loại chỉ trả về các giá trị này.
export const CANONICAL_CATEGORIES = [
  'Nhà đầu tư',
  'Đối tác',
  'Chiến lược',
  'Nghiên cứu thị trường',
  'Sản phẩm & Nguồn cung',
  'Báo cáo & Quản trị',
  'Hướng dẫn',
  'Nội bộ',
] as const;

const FALLBACK = 'Tài liệu chung';

// Thứ tự QUAN TRỌNG: rule khớp trước thắng. Đặt loại đặc thù (đào tạo/sổ tay) lên trên để không bị
// "quản trị/nội bộ" nuốt mất. Từ khoá tinh theo các loại tài liệu thực tế của BTMH.
const RULES: Rule[] = [
  { cat: 'Hướng dẫn', kw: /sổ tay|nhập môn|cẩm nang|đào tạo|training|onboarding|\bsop\b|hướng dẫn|growth mindset|giới thiệu hệ thống/i },
  { cat: 'Nhà đầu tư', kw: /nhà đầu tư|cổ đông|\binvestor\b|gọi vốn|anchor investor|roadshow|hồ sơ nhà đầu tư/i },
  { cat: 'Đối tác', kw: /đối tác|\bpartner\b|partnership|hợp tác|liên doanh|liên kết|\bmou\b/i },
  { cat: 'Nghiên cứu thị trường', kw: /khảo sát thị trường|nghiên cứu thị trường|market survey|market study|nghiên cứu chuyên sâu|dự báo giá|phân tích ngành|thị trường vàng (ấn độ|thế giới|việt nam)/i },
  { cat: 'Chiến lược', kw: /chiến lược|strategy|roadmap|lộ trình mở rộng|nam tiến|thâm nhập|winning model|tầm nhìn|định hướng mở rộng/i },
  { cat: 'Sản phẩm & Nguồn cung', kw: /nguồn cung|chuỗi cung ứng|supply chain|category management|danh mục sản phẩm|trang sức|nhẫn|dây chuyền|quà tặng vàng|24k/i },
  { cat: 'Báo cáo & Quản trị', kw: /báo cáo|report|\bbcqt\b|bridge lợi nhuận|kqkd|dashboard|đánh giá[^.]{0,40}điều hành|hiệu suất|quản trị|nhịp điều hành|\bkpi\b|\bokr\b|\bbsc\b|p&l|dòng tiền|doanh thu|tổng kết dự án|scorecard/i },
  { cat: 'Nội bộ', kw: /bảo mật|kiến trúc|phân quyền|security|architecture|portal|connector|\bmcp\b|\bapi\b|playbook|methodology|phương pháp luận|đánh giá rủi ro|tuân thủ/i },
];

// Trích text hiển thị từ HTML nội dung deck (bỏ script/style/tag/data-URI ảnh) để review nội dung.
function extractText(html: string): string {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/data:[^\s"')]+/g, ' ') // bỏ data-URI (ảnh nhúng của deck ảnh)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 40000); // đủ để bắt từ khoá, tránh quét cả file lớn
}

export function inferCategory(d: {
  title?: string | null;
  description?: string | null;
  tags?: string[] | null;
  content?: string | null;
}): string {
  // Vòng 1: metadata (tín hiệu mạnh nhất, ưu tiên).
  const meta = [d.title ?? '', d.description ?? '', ...(d.tags ?? [])].join(' ');
  for (const r of RULES) if (r.kw.test(meta)) return r.cat;
  // Vòng 2: review NỘI DUNG khi metadata chưa rõ.
  if (d.content) {
    const body = extractText(d.content);
    for (const r of RULES) if (r.kw.test(body)) return r.cat;
  }
  return FALLBACK;
}

// Quyết định danh mục cuối cùng cho 1 lần ghi deck. KHÔNG ghi đè danh mục sẵn có khi không có ý định đổi.
//   explicit = giá trị người dùng/API vừa nhập (nếu có) ; existing = danh mục hiện tại của deck.
//   d.content (tuỳ chọn) = HTML nội dung deck để review khi phải tự suy.
export function resolveCategory(
  explicit: string | null | undefined,
  existing: string | null | undefined,
  d: { title?: string | null; description?: string | null; tags?: string[] | null; content?: string | null },
): string {
  const e = (explicit ?? '').trim();
  if (e) return e;
  const cur = (existing ?? '').trim();
  if (cur) return cur;
  return inferCategory(d);
}
