// PROJECT CHARTER — điều lệ dự án theo best-practice PM (PMBOK rút gọn).
// File thuần hằng số (không import db) → an toàn dùng ở cả client lẫn server.
export const CHARTER_FIELDS = [
  { key: 'background', label: 'Bối cảnh & Lý do', ph: 'Vì sao cần dự án này? Vấn đề/cơ hội đang giải quyết.', rows: 3, list: false },
  { key: 'objective', label: 'Mục tiêu dự án', ph: 'Kết quả cuối cùng cần đạt (rõ ràng, đo được).', rows: 2, list: false },
  { key: 'scope_in', label: 'Trong phạm vi', ph: 'Mỗi dòng một hạng mục dự án SẼ làm.', rows: 3, list: true },
  { key: 'scope_out', label: 'Ngoài phạm vi', ph: 'Mỗi dòng một hạng mục KHÔNG thuộc dự án (tránh phình).', rows: 2, list: true },
  { key: 'deliverables', label: 'Sản phẩm bàn giao', ph: 'Mỗi dòng một đầu ra/sản phẩm bàn giao.', rows: 3, list: true },
  { key: 'milestones', label: 'Cột mốc chính', ph: 'Mỗi dòng: cột mốc — thời điểm dự kiến.', rows: 3, list: true },
  { key: 'stakeholders', label: 'Các bên liên quan', ph: 'Mỗi dòng: tên / vai trò / trách nhiệm.', rows: 3, list: true },
  { key: 'sponsor', label: 'Nhà tài trợ (Sponsor)', ph: 'Người bảo trợ, quyết định nguồn lực.', rows: 1, list: false },
  { key: 'risks', label: 'Rủi ro & Giả định', ph: 'Mỗi dòng: rủi ro/giả định + cách ứng phó.', rows: 3, list: true },
  { key: 'success', label: 'Tiêu chí thành công', ph: 'Đo bằng gì để coi dự án là thành công?', rows: 2, list: true },
] as const;

export type CharterKey = (typeof CHARTER_FIELDS)[number]['key'];
export type Charter = Partial<Record<CharterKey, string>>;

/** Charter có ít nhất 1 trường được điền? */
export function charterFilled(c: Charter | null | undefined): boolean {
  if (!c) return false;
  return CHARTER_FIELDS.some((f) => (c[f.key] ?? '').trim() !== '');
}
