// Bộ LÀM SẠCH HTML tối giản, KHÔNG phụ thuộc thư viện — dùng cho nội dung rich-text
// (biên bản/quyết định cuộc họp) do người dùng nhập qua editor WYSIWYG.
//
// Nguyên tắc AN TOÀN (chống XSS): chỉ giữ MỘT allowlist thẻ định dạng, DỰNG LẠI thẻ từ đầu
// nên MỌI thuộc tính bị bỏ (trừ href hợp lệ trên <a>). Thẻ ngoài allowlist bị "mở gói" (bỏ thẻ,
// giữ nội dung bên trong dưới dạng text). Mọi ký tự < > lạc trong text được escape. Vì thế
// script/style/on*=…/javascript: KHÔNG thể tồn tại sau khi làm sạch.

const ALLOWED = new Set([
  'p', 'div', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a',
]);
const VOID_TAGS = new Set(['br']);
const MAX_LEN = 60_000; // trần an toàn

function escLtGt(s: string): string {
  // Chỉ escape < và > (không đụng &, tránh double-encode entity sẵn có trong innerHTML).
  return s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Làm sạch HTML rich-text → chỉ còn thẻ định dạng an toàn. Trả '' nếu rỗng/không có nội dung. */
export function sanitizeRichHtml(input: string | null | undefined): string {
  if (!input) return '';
  const src = input.slice(0, MAX_LEN);
  let out = '';
  let last = 0;
  const re = /<\/?([a-zA-Z0-9]+)([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    out += escLtGt(src.slice(last, m.index));
    last = re.lastIndex;
    const closing = m[0][1] === '/';
    const tag = m[1].toLowerCase();
    if (!ALLOWED.has(tag)) continue; // mở gói: bỏ thẻ, giữ nội dung
    if (VOID_TAGS.has(tag)) { if (!closing) out += '<br>'; continue; }
    if (closing) { out += `</${tag}>`; continue; }
    if (tag === 'a') {
      const hrefM = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[2]);
      const href = hrefM ? (hrefM[2] ?? hrefM[3] ?? hrefM[4] ?? '') : '';
      if (/^(https?:|mailto:)/i.test(href.trim())) {
        out += `<a href="${escAttr(href.trim())}" target="_blank" rel="noopener noreferrer">`;
      } else {
        out += '<a>';
      }
      continue;
    }
    out += `<${tag}>`;
  }
  out += escLtGt(src.slice(last));
  return out.trim();
}

/** Nội dung rich-text có "thực sự rỗng" không (bỏ thẻ + khoảng trắng)? → để lưu NULL khi trống. */
export function isRichEmpty(html: string | null | undefined): boolean {
  if (!html) return true;
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, '')
    .trim();
  return text.length === 0;
}
