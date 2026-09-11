import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireUser } from '@/lib/current-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Tải FORM MẪU Bảng kiểm (.xlsx) — người dùng điền theo cột này rồi Import. Cột nhận diện linh hoạt
// (có dấu/không dấu, biến thể tên) nhưng dùng đúng form mẫu là chắc khớp nhất. Cột lạ vẫn được giữ.
export async function GET() {
  await requireUser(); // chỉ người đã đăng nhập tải được

  const HEAD = [
    'Mã', 'Yêu cầu tuân thủ', 'Cơ sở pháp lý', 'Đơn vị rà soát', 'Hạn rà soát',
    'Kết quả đơn vị', 'Bằng chứng', 'Thẩm định Pháp chế', 'Kết quả KSTT', 'Kết luận',
    'Kế hoạch khắc phục', 'Đơn vị khắc phục', 'PIC', 'Hạn khắc phục', 'Kết quả đầu ra',
  ];
  const example = [
    '1', 'Niêm yết công khai giá vàng tại điểm bán', 'Nghị định 24/2012/NĐ-CP, Điều 10',
    'Phòng KD Vàng', '2026-09-30', 'Đã niêm yết đầy đủ tại 12/12 cửa hàng', 'Ảnh bảng giá các CH',
    'Đạt yêu cầu công khai', 'Đã kiểm tra thực tế', 'Tuân thủ',
    '', '', '', '', '',
  ];
  const exampleViolation = [
    '2', 'Lưu hồ sơ nguồn gốc vàng nguyên liệu', 'Thông tư 22/2013/TT-BKHCN',
    'Phòng Thu mua', '2026-09-25', 'Thiếu hồ sơ 3 lô nhập tháng 8', 'File kiểm kê',
    'Chưa đủ hồ sơ theo quy định', 'Phát hiện thiếu chứng từ', 'Chưa tuân thủ',
    'Bổ sung & số hoá hồ sơ nguồn gốc 3 lô còn thiếu', 'Phòng Thu mua', 'nguyenvana@congty.vn',
    '2026-10-15', 'Bộ hồ sơ đầy đủ cho 3 lô',
  ];

  const wsData = XLSX.utils.aoa_to_sheet([HEAD, example, exampleViolation]);
  wsData['!cols'] = HEAD.map((h, i) => ({ wch: i === 1 || i === 10 ? 40 : i === 2 ? 28 : 18 }));

  const guide = [
    ['HƯỚNG DẪN ĐIỀN BẢNG KIỂM TUÂN THỦ'],
    [''],
    ['• Mỗi dòng là MỘT tiêu chí rà soát (không phải công việc). Cột "Mã" là bắt buộc & duy nhất trong 1 dự án.'],
    ['• Import lại theo cùng "Mã" sẽ CẬP NHẬT dòng cũ (không tạo trùng).'],
    ['• Cột "Kết luận" nhận các giá trị: Tuân thủ · Chưa tuân thủ · Vi phạm · Không áp dụng · Chưa rà soát.'],
    ['   - Khi Kết luận = "Chưa tuân thủ" hoặc "Vi phạm": hệ thống TỰ TẠO một "Vấn đề tuân thủ".'],
    ['   - Nếu có điền "Kế hoạch khắc phục" (+ PIC/Hạn/Kết quả đầu ra): tự tạo luôn công việc khắc phục, không phải nhập tay.'],
    ['• Ngày ghi dạng YYYY-MM-DD (vd 2026-09-30) hoặc DD/MM/YYYY.'],
    ['• PIC nên là email trong hệ thống để tự gán người phụ trách; nếu ghi tên, hệ thống cố khớp theo tên.'],
    ['• Cột lạ ngoài danh sách trên vẫn được giữ nguyên (không mất dữ liệu), chỉ không đưa vào các trường chuẩn.'],
    [''],
    ['Các cột chuẩn:'],
    ...HEAD.map((h) => [`   - ${h}`]),
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guide);
  wsGuide['!cols'] = [{ wch: 100 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsData, 'Bảng kiểm');
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Hướng dẫn');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': 'attachment; filename="form-mau-bang-kiem-tuan-thu.xlsx"',
      'cache-control': 'no-store',
    },
  });
}
