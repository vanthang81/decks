// Parse số người dùng nhập theo kiểu VN: '.' = ngăn nghìn, ',' = thập phân.
// An toàn cả với số đã render sẵn (vd "12.5" thập phân) — chỉ bỏ '.' khi đúng
// dạng nhóm nghìn (phần nguyên bắt đầu 1-9: 1.000 / 500.000), nếu không thì giữ
// '.' là dấu thập phân. Phần nguyên bắt đầu bằng 0 (vd "0.006", "0.5") LUÔN là
// thập phân → giữ nguyên, tránh biến 0.006 thành 6 (nhóm nghìn không bao giờ có
// số 0 dẫn đầu).
export function parseNum(raw: unknown, def = 0): number {
  let s = String(raw ?? '').trim();
  if (s === '') return def;
  s = s.replace(/\s/g, '');
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    // "1.234.567,89" → '.' nghìn, ',' thập phân
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    // chỉ có ',' → dấu thập phân
    s = s.replace(',', '.');
  } else if (hasDot) {
    // chỉ có '.': nếu là nhóm nghìn (1.000.000 / -500.000) thì bỏ; nếu là thập phân (12.5) thì giữ
    if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  }
  const v = Number(s);
  return Number.isFinite(v) ? v : def;
}
