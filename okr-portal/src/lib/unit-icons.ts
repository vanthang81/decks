// Icon nhận diện riêng cho mỗi Khối (division) — UI/UX dễ phân biệt.
// Ưu tiên khớp theo MÃ khối (BL/B2B/…); nếu không có mã thì khớp từ khoá trong tên;
// cuối cùng fallback deterministic theo hash (ổn định, không đổi giữa các lần render).

const DIV_ICON: Record<string, string> = {
  BL: '🏬',   // Kinh doanh Bán lẻ
  B2B: '🤝',  // Kinh doanh B2B & Phát triển đối tác
  SP: '🏷️',  // Quản lý Sản phẩm
  MKT: '📣',  // Marketing
  SX: '🏭',   // Sản xuất
  CU: '📦',   // Cung ứng
  DB: '🏪',   // Phát triển Hệ thống Điểm bán
  CN: '💻',   // Công nghệ
  TC: '💰',   // Tài chính
  NS: '👥',   // Nhân sự
  DT: '🎓',   // Đào tạo & Phát triển Văn hóa
  VH: '⚙️',   // Dịch vụ Vận hành
  PC: '⚖️',   // Pháp chế & Kiểm soát Tuân thủ
};

const NAME_KW: [string, string][] = [
  ['tài chính', '💰'], ['kế toán', '💰'],
  ['bán lẻ', '🏬'],
  ['b2b', '🤝'], ['đối tác', '🤝'],
  ['sản phẩm', '🏷️'],
  ['marketing', '📣'], ['ecom', '📣'], ['thương hiệu', '📣'],
  ['sản xuất', '🏭'], ['xưởng', '🏭'],
  ['cung ứng', '📦'], ['logistic', '📦'], ['mua hàng', '📦'],
  ['điểm bán', '🏪'], ['cửa hàng', '🏪'],
  ['công nghệ', '💻'],
  ['nhân sự', '👥'],
  ['đào tạo', '🎓'], ['văn hóa', '🎓'],
  ['vận hành', '⚙️'],
  ['pháp chế', '⚖️'], ['kiểm soát', '⚖️'], ['tuân thủ', '⚖️'],
];

const FALLBACK = ['🔷', '🔶', '🟣', '🟢', '🟠', '🔵', '🟡', '🟤', '⭐', '🔺', '🔻', '🟩'];

export function unitIcon(opts: {
  code?: string | null;
  name?: string | null;
  type?: string | null;
}): string {
  const { code, name, type } = opts;
  if (type === 'company') return '🏢';
  // Mã khối = phần trước dấu '-' (phòng ban kế thừa icon của khối cha).
  const div = (code ?? '').split('-')[0].trim().toUpperCase();
  if (div && DIV_ICON[div]) return DIV_ICON[div];
  const n = (name ?? '').toLowerCase();
  for (const [k, ic] of NAME_KW) if (n.includes(k)) return ic;
  const s = (code || name || '').trim();
  if (!s) return '🏢';
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return FALLBACK[h % FALLBACK.length];
}
