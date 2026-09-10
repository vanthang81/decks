// Kiểu + nhãn + màu cho phân hệ Bảng kiểm tuân thủ — CLIENT-SAFE (không import server-only).
// Cả server (compliance.ts) lẫn client component đều dùng từ đây.

export type Conclusion = 'chua_ra_soat' | 'tuan_thu' | 'chua_tuan_thu' | 'vi_pham' | 'khong_ap_dung';
export type IssueStatus = 'no_plan' | 'in_remediation' | 'pending_review' | 'kstt_passed' | 'closed';
export type ProjectFn = 'phap_che' | 'kstt' | 'qlda';

export const CONCLUSION_LABEL: Record<Conclusion, string> = {
  chua_ra_soat: 'Chưa rà soát',
  tuan_thu: 'Tuân thủ',
  chua_tuan_thu: 'Chưa tuân thủ',
  vi_pham: 'Vi phạm',
  khong_ap_dung: 'Không áp dụng',
};
export const CONCLUSION_CLS: Record<Conclusion, string> = {
  chua_ra_soat: 'slate',
  tuan_thu: 'green',
  chua_tuan_thu: 'amber',
  vi_pham: 'red',
  khong_ap_dung: 'gray',
};

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  no_plan: 'Chưa có KH khắc phục',
  in_remediation: 'Đang khắc phục',
  pending_review: 'Chờ thẩm định hoàn thành',
  kstt_passed: 'KSTT đã duyệt · chờ Pháp chế',
  closed: 'Đã đóng',
};
export const ISSUE_STATUS_CLS: Record<IssueStatus, string> = {
  no_plan: 'red',
  in_remediation: 'amber',
  pending_review: 'blue',
  kstt_passed: 'blue',
  closed: 'green',
};

export const FN_LABEL: Record<ProjectFn, string> = {
  phap_che: 'Pháp chế',
  kstt: 'KSTT (Kiểm soát tuân thủ)',
  qlda: 'KH & QLDA',
};
