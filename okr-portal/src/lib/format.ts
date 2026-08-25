import type { MetricType } from './okr';

/** Định dạng số kiểu VN (dấu chấm ngăn nghìn). */
export function fmtNumber(n: number, maxFrac = 2): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: maxFrac }).format(n);
}

/** Định dạng tiền VND gọn (tỷ/triệu) — dùng cho ngân sách. */
export function fmtVnd(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${fmtNumber(n / 1e9, 2)} tỷ`;
  if (abs >= 1e6) return `${fmtNumber(n / 1e6, 1)} tr`;
  return `${fmtNumber(n, 0)} đ`;
}

/** Hiển thị giá trị 1 Key Result theo loại metric. */
export function fmtMetric(v: number, metric: MetricType, unitLabel: string | null): string {
  if (metric === 'boolean') return v >= 1 ? 'Đạt' : 'Chưa';
  if (metric === 'currency') return fmtVnd(v);
  if (metric === 'percent') return `${fmtNumber(v, 1)}%`;
  return unitLabel ? `${fmtNumber(v)} ${unitLabel}` : fmtNumber(v);
}

export function progressColor(p: number): string {
  if (p >= 70) return '#1f9d55';
  if (p >= 40) return '#d97706';
  return '#dc2626';
}

// Múi giờ chuẩn TOÀN HỆ THỐNG = Hà Nội / Việt Nam (giờ hiển thị luôn theo VN, không phụ thuộc
// máy chủ chạy ở UTC hay trình duyệt ở múi giờ khác) — CFO 25/08.
export const VN_TZ = 'Asia/Ho_Chi_Minh';

export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('vi-VN', { timeZone: VN_TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

export function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VN_TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(d);
}
