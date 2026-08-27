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

// ================= Tự suy MÔ TẢ NGẮN (description) cho card thư viện =================
// Mục tiêu: mọi deck LUÔN có "đoạn tóm tắt nội dung" ở card (giống các tài liệu khác) kể cả khi
// người publish không nhập mô tả. Suy từ NỘI DUNG deck: ưu tiên meta description → phụ đề trang bìa
// (deck generator MBB dùng .csub) → câu có nghĩa đầu tiên. KHÔNG dùng LLM (nhanh, xác định).

function normText(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

// Cắt gọn về độ dài card, ưu tiên cắt ở ranh giới từ + thêm dấu … khi bị cắt.
function clip(s: string, max = 220): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s·|–—-]+$/, '').trim() + '…';
}

function metaDesc(html: string): string | null {
  const m =
    html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*\scontent=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+\scontent=["']([^"']+)["'][^>]*(?:name|property)=["'](?:description|og:description)["']/i);
  const t = m ? normText(m[1]) : '';
  return t || null;
}

// Inner text của phần tử ĐẦU TIÊN có class khớp (lấy thô tới thẻ đóng cùng tên — đủ cho phụ đề 1 dòng).
function firstByClass(html: string, cls: string): string | null {
  const re = new RegExp(`<([a-z0-9]+)[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
  const m = html.match(re);
  const t = m ? normText(m[2]) : '';
  return t || null;
}

function sameAsTitle(s: string, title?: string | null): boolean {
  const a = normText(s).toLowerCase();
  const b = normText(title ?? '').toLowerCase();
  return !!b && (a === b || a.startsWith(b) || b.startsWith(a));
}

// Suy mô tả ngắn từ HTML nội dung deck. Trả null nếu không moi được gì đáng kể.
export function inferDescription(content: string | null | undefined, title?: string | null): string | null {
  if (!content) return null;
  const html = String(content);
  // 1) meta description (nếu deck có khai báo)
  const md = metaDesc(html);
  if (md && md.length >= 12) return clip(md);
  // 2) phụ đề trang bìa của deck generator / các lớp phụ đề thường gặp
  for (const cls of ['csub', 'deck-sub', 'subtitle', 'lead', 'sub']) {
    const t = firstByClass(html, cls);
    if (t && t.length >= 12 && !sameAsTitle(t, title)) return clip(t);
  }
  // 3) fallback: câu/đoạn có nghĩa đầu tiên sau tiêu đề
  const body = normText(
    html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/data:[^\s"')]+/g, ' '),
  ).slice(0, 4000);
  const t = normText(title ?? '');
  let rest = body;
  if (t) { const idx = body.indexOf(t); if (idx >= 0) rest = body.slice(idx + t.length); }
  rest = rest.replace(/^[\s·|–—-]+/, '').trim();
  const first = rest.split(/(?<=[.!?])\s+/)[0] ?? rest;
  const pick = first.length >= 20 ? first : rest;
  return pick.length >= 12 ? clip(pick) : null;
}

// Quyết định mô tả cuối cùng cho 1 lần ghi deck: người nhập > mô tả hiện có (GIỮ NGUYÊN, không mất khi
// republish thiếu description) > tự suy từ nội dung. → card luôn có tóm tắt.
export function resolveDescription(
  explicit: string | null | undefined,
  existing: string | null | undefined,
  d: { content?: string | null; title?: string | null },
): string | null {
  const e = (explicit ?? '').trim();
  if (e) return e;
  const cur = (existing ?? '').trim();
  if (cur) return cur;
  return inferDescription(d.content, d.title);
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
