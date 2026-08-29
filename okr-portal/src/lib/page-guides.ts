// SỔ HƯỚNG DẪN NHANH THEO TRANG — mỗi trang 1 khung "Hướng dẫn nhanh" cố định (component PageGuide).
// Mục tiêu: người dùng NHÌN LÀ DÙNG ĐƯỢC NGAY, không cần đào tạo. Thêm trang mới ⇒ thêm 1 entry ở đây
// + đặt <PageGuide pageKey="..." /> ngay dưới tiêu đề trang (xem CLAUDE.md "HƯỚNG DẪN NHANH THEO TRANG").
// Nội dung viết NGẮN, hành động cụ thể (bấm ở đâu, để làm gì). `guideHref` = link tới hướng dẫn đầy đủ.

export type PageTip = { k: string; v: string }; // k = việc làm (in đậm), v = cách làm/ý nghĩa
export type PageGuide = { title: string; intro?: string; tips: PageTip[]; guideHref?: string };

export const PAGE_GUIDES: Record<string, PageGuide> = {
  dashboard: {
    title: 'Bảng điều khiển — nhìn nhanh sức khỏe OKR',
    intro: 'Trang tổng quan tiến độ công ty/khối và cảnh báo cần xử lý.',
    tips: [
      { k: 'Xem toàn bộ OKR', v: 'bấm nút "Xem toàn bộ OKR" để mở cây OKR đầy đủ theo kỳ.' },
      { k: 'Nhận định & Khuyến nghị', v: 'các thẻ màu tự sinh (Quan sát → Khuyến nghị) chỉ ra chỗ chậm/rủi ro cần làm.' },
      { k: 'Bấm vào con số cảnh báo', v: 'dẫn thẳng tới danh sách đích danh (OKR/việc) để xử lý — không phải số trơ.' },
      { k: 'Đổi kỳ', v: 'kỳ hiện tại hiển thị ở đầu trang; quản trị đổi kỳ ở Quản trị → Kỳ.' },
    ],
    guideHref: '/guide',
  },
  objectives: {
    title: 'Cây OKR — xem & tạo mục tiêu',
    tips: [
      { k: 'Tạo OKR', v: 'bấm "+ Tạo OKR" (góc phải) → chọn cấp (Công ty/Khối/Phòng/Cá nhân) + đơn vị + kỳ.' },
      { k: 'Bấm tên OKR', v: 'mở trang chi tiết: Key Result, check-in, công việc thực thi, ngân sách, OKR con.' },
      { k: 'Lọc', v: 'lọc theo kỳ/đơn vị ở đầu danh sách; nhân viên chỉ thấy OKR trong phạm vi mình.' },
      { k: 'Xuất Excel', v: 'nút "Xuất Excel" cho phép chọn nhiều kỳ & đơn vị.' },
    ],
    guideHref: '/guide#feat-okr-tree',
  },
  'objective-detail': {
    title: 'Chi tiết OKR — đo kết quả & thực thi',
    tips: [
      { k: 'Key Result (KR)', v: 'kết quả đo được; bấm "Sửa KR" để đặt mốc bắt đầu–hiện tại–mục tiêu, trọng số.' },
      { k: 'Check-in', v: 'cập nhật tiến độ + độ tự tin hằng tuần — tiến độ tự cuộn lên Objective.' },
      { k: 'Công việc thực thi', v: '3 chế độ xem Danh sách/Kanban/Gantt; kéo–thả đổi trạng thái.' },
      { k: 'OKR con', v: 'bấm "+ Tạo OKR con" để phân rã xuống Khối/Phòng/Cá nhân.' },
    ],
    guideHref: '/guide#feat-key-result',
  },
  tasks: {
    title: 'Công việc — theo dõi & cập nhật thực thi',
    tips: [
      { k: 'Lọc/tìm', v: 'ô tìm + lọc theo phụ trách/đơn vị/OKR/trạng thái/ưu tiên; tick "Quá hạn" hoặc "Việc của tôi".' },
      { k: 'Bấm 1 dòng', v: 'mở popup xem chi tiết; nút "Sửa" để cập nhật trạng thái, tiến độ, hạn (người quản việc), hoàn thành.' },
      { k: 'Tạo việc cá nhân', v: 'nút "+ Tạo công việc" — việc của riêng bạn, không cần gắn OKR/dự án.' },
      { k: 'Thao tác hàng loạt', v: 'quản trị tick nhiều dòng để đổi trạng thái/xoá cùng lúc.' },
    ],
    guideHref: '/guide#feat-initiative',
  },
  meetings: {
    title: 'Cuộc họp — tổ chức & theo dõi hành động',
    tips: [
      { k: 'Lọc/tìm', v: 'thanh lọc đầu trang: tìm theo mã/tên/đơn vị/chủ trì + lọc Loại · Trạng thái · Chủ trì.' },
      { k: 'Tạo cuộc họp', v: 'nút "Cuộc họp mới" — chọn loại, chủ trì/thư ký, người dự, đơn vị/dự án liên quan.' },
      { k: 'Bấm tên họp', v: 'mở chi tiết: biên bản (WYSIWYG), quyết định, danh sách hành động (next actions).' },
      { k: 'Quyền xem', v: 'chỉ người tham gia/được thêm mới xem nội dung; chủ trì/thư ký duyệt yêu cầu xem.' },
    ],
    guideHref: '/guide#feat-meetings',
  },
  'meeting-detail': {
    title: 'Chi tiết cuộc họp — biên bản & hành động',
    tips: [
      { k: 'Biên bản (Lark-style)', v: 'gõ "[]" tạo việc, "@tên" giao người, chọn lịch đặt hạn — tự đồng bộ xuống mục Hành động.' },
      { k: 'Tự lưu nháp', v: 'biên bản tự lưu khi gõ; đóng ra mở lại vẫn còn để viết tiếp.' },
      { k: 'Tick việc trong biên bản', v: 'tick = việc sang "Xong", bỏ tick = "Đang làm", xoá dòng = xoá việc.' },
      { k: 'Sửa hạn việc', v: 'chủ trì/thư ký sửa lại được hạn công việc sau khi tạo.' },
    ],
    guideHref: '/guide#feat-meetings',
  },
  projects: {
    title: 'Dự án — gom việc xuyên nhiều OKR',
    tips: [
      { k: 'Tạo dự án', v: 'dự án độc lập (mã PRJ), gắn việc từ nhiều OKR/khối vào một nơi.' },
      { k: 'Bấm tên dự án', v: 'xem chi tiết + việc gom theo OKR + ngân sách + tiến độ.' },
      { k: 'Gắn việc vào dự án', v: 'trong popup sửa việc, tick "Thuộc dự án" rồi chọn/"＋ Dự án mới".' },
    ],
    guideHref: '/guide#feat-initiative',
  },
  kpi: {
    title: 'KPI / Scorecard — chỉ số đo lường',
    tips: [
      { k: 'Nhập số', v: 'nhập target/actual theo đơn vị mình; ô màu W/A/E cảnh báo (Watch/Alert/Escalate).' },
      { k: 'Bấm tên KPI', v: 'mở chi tiết đầy đủ (công thức, nguồn, ngưỡng) + "đang dùng bởi" (KR liên kết).' },
      { k: 'Tạo/Quản lý KPI', v: 'nút "+ Tạo KPI"; thư viện đầy đủ ở Quản trị → Thư viện KPI.' },
      { k: 'Tự động', v: 'một số KPI (doanh thu, lãi gộp…) tự đồng bộ từ BigQuery, không cần nhập tay.' },
    ],
    guideHref: '/guide#feat-kpi-auto',
  },
  review: {
    title: 'Họp điều hành (WBR/MBR) — tổng hợp 1 kỳ',
    tips: [
      { k: 'Đọc từ trên xuống', v: 'nhịp độ → theo Khối → BSC → KPI cảnh báo → OKR cần chú ý → việc quá hạn.' },
      { k: 'Nhận định & Khuyến nghị', v: 'phần rule-based (Quan sát → Hàm ý → Khuyến nghị) để chốt hành động họp.' },
      { k: 'In đẹp', v: 'trang tối ưu để in/xuất PDF phục vụ cuộc họp điều hành.' },
    ],
    guideHref: '/guide#feat-review',
  },
  my: {
    title: 'Của tôi — OKR & việc của bạn',
    tips: [
      { k: 'OKR cá nhân', v: 'bấm "+ OKR cá nhân" để tự đặt mục tiêu cho mình (mọi vai trò đều tạo được).' },
      { k: 'Việc của tôi', v: 'danh sách việc được giao; cập nhật trạng thái + tiến độ ngay tại đây.' },
      { k: 'Check-in', v: 'ghi check-in cho KR mình phụ trách để tiến độ luôn cập nhật.' },
    ],
    guideHref: '/guide',
  },
  strategy: {
    title: 'Chiến lược công ty — đỉnh của chuỗi',
    tips: [
      { k: 'Xem', v: 'Tầm nhìn · Sứ mệnh · Giá trị · Khát vọng + sơ đồ chuỗi + trụ cột + BSC.' },
      { k: 'Sửa (có quyền)', v: 'người có quyền "Quản lý Chiến lược" bấm nút góc phải để khai báo/sửa.' },
      { k: 'Trụ cột', v: 'kéo–thả để sắp xếp lại thứ tự trụ cột theo logic.' },
    ],
    guideHref: '/guide#feat-strategy',
  },
  budget: {
    title: 'Ngân sách — kế hoạch vs thực chi',
    tips: [
      { k: 'Xem theo kỳ/đơn vị', v: 'tổng ngân sách kế hoạch, thực chi, còn lại theo dự án & khối.' },
      { k: 'Nhập CSV / Đồng bộ', v: 'người có quyền "Quản lý Ngân sách" nhập cấu trúc chi phí hoặc đồng bộ thực chi.' },
      { k: 'Chi tiết theo khối', v: 'bấm "Chi tiết" để xem dự án cấu thành từng đơn vị.' },
    ],
    guideHref: '/guide#feat-budget',
  },
  'admin-users': {
    title: 'Người dùng & phân quyền',
    tips: [
      { k: 'Thêm/sửa người dùng', v: 'thêm bằng email Google + vai trò + đơn vị + Nhóm quyền.' },
      { k: 'Bàn giao', v: 'khi 1 người nghỉ → nút "Bàn giao" chuyển toàn bộ việc/OKR/dự án/họp sang người thay thế.' },
      { k: 'Khoá/Mở/Xoá', v: 'khoá tài khoản để ngừng đăng nhập mà vẫn giữ dữ liệu; xoá cần xác nhận.' },
    ],
    guideHref: '/guide#feat-okr-perms',
  },
  'admin-permissions': {
    title: 'Phân quyền — Nhóm quyền × Năng lực',
    tips: [
      { k: 'Ma trận', v: 'mỗi Nhóm quyền = một bộ Năng lực; tick/bỏ tick để cấp/thu quyền.' },
      { k: 'Tự mở rộng', v: 'thêm tính năng mới → năng lực mới tự hiện thành dòng ở đây.' },
      { k: 'CEO/CFO', v: 'luôn toàn quyền, không thể tự khoá.' },
    ],
    guideHref: '/guide#feat-okr-perms',
  },
  admin: {
    title: 'Quản trị hệ thống',
    tips: [
      { k: 'Người dùng · Tổ chức · Kỳ', v: 'quản lý allowlist, cây đơn vị, kỳ OKR.' },
      { k: 'Đồng bộ KPI / Bản tin', v: 'chạy đồng bộ KPI hoặc gửi bản tin điều hành ngay.' },
      { k: 'Nhắc check-in', v: 'cấu hình lịch nhắc ở Quản trị → Cấu hình.' },
    ],
    guideHref: '/guide',
  },
};
