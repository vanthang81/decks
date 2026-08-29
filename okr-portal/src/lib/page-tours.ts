// SỔ TOUR WALKTHROUGH THEO TRANG — mỗi trang một "tour" pop-up nhiều bước (giống tour Trang chủ).
// Mục tiêu: người mới được DẪN ĐI TỪNG BƯỚC, KHOÉT SÁNG đúng nút/khu vực TẠI VỊ TRÍ THẬT trên trang.
//
// ⭐ TỰ CẬP NHẬT (CFO 29/08): đây là NGUỒN DUY NHẤT của mọi walkthrough. Thêm TRANG mới ⇒ thêm 1 entry
// vào PAGE_TOURS + 1 dòng ánh xạ trong tourKeyForPath → tour tự chạy (AutoPageTour ở layout) và nút
// "Hướng dẫn" tự hiện trên header, KHÔNG cần sửa từng trang. Thêm/đổi TÍNH NĂNG ⇒ thêm/sửa 1 bước ở
// tour của trang tương ứng + gắn `data-tour="<target>"` vào phần tử trên trang. Giữ TỐI ĐA 10 bước/trang.
//
// Bước có `target` → khoét sáng phần tử [data-tour="<target>"] ĐÚNG vị trí; không có/không thấy → thẻ giữa màn.

export type TourStep = { target?: string; title: string; body: string; link?: { href: string; label: string } };

// Deck giới thiệu hệ thống (mở tab mới) — gắn ở bước kết thúc mỗi tour.
export const DECK_URL = 'https://deck.consultx.vn/d/he-thong-quan-tri-hieu-suat-btmh';
const DECK_LINK = { href: DECK_URL, label: '📖 Xem tài liệu giới thiệu hệ thống (slide)' };

// Bước kết thúc dùng chung — nhắc mở lại tour + link tài liệu.
const done = (body: string): TourStep => ({ title: '🎉 Xong rồi!', body, link: DECK_LINK });

export const PAGE_TOURS: Record<string, TourStep[]> = {
  // ── Trang chủ / Bảng điều khiển (khoét sáng nav + chuông + tên + nút xem OKR) ──
  dashboard: [
    {
      title: '👋 Chào mừng đến Hệ thống Điều hành OKR BTMH',
      body: 'Đi nhanh một vòng (khoảng 1 phút) để biết đặt gì ở đâu và bắt đầu dùng được ngay. Bạn có thể Bỏ qua bất cứ lúc nào và mở lại từ nút "Hướng dẫn" trên thanh trên cùng.',
    },
    { target: 'nav-overview', title: 'Tổng quan & Họp điều hành', body: 'Bảng điều khiển cho bức tranh tiến độ toàn công ty; "Họp điều hành" (WBR/MBR) tổng hợp nhận định & khuyến nghị, KPI cảnh báo, việc quá hạn.' },
    { target: 'nav-strategy', title: 'Chiến lược → OKR → KPI', body: 'Chuỗi đo lường: khai báo Chiến lược → rải xuống OKR (Mục tiêu · Kết quả then chốt) theo cây Công ty → Khối → Phòng → Cá nhân → đo bằng Thư viện KPI (thẻ điểm BSC).' },
    { target: 'nav-exec', title: 'Thực thi: Dự án & Công việc', body: 'Nơi biến mục tiêu thành hành động: quản lý Dự án (xuyên nhiều OKR) và Công việc — xem dạng Danh sách / Kanban kéo-thả / Dòng thời gian, gán người & theo hạn.' },
    { target: 'tour-all-okr', title: 'Xem toàn bộ cây OKR', body: 'Bấm đây để mở toàn bộ cây mục tiêu của kỳ, tạo OKR mới và liên kết (cascade) lên cấp trên.' },
    { target: 'tour-bell', title: 'Thông báo', body: 'Chuông báo khi bạn được @nhắc tên, có người trả lời bình luận, có bình luận ở mục bạn phụ trách, hoặc được giao việc. Bấm để xem danh sách và mở tới đúng chỗ.' },
    { target: 'tour-user', title: 'Cài đặt cá nhân', body: 'Bấm TÊN của bạn để xem hồ sơ và bật/tắt từng loại thông báo (và email).' },
    done('Gợi ý thứ tự: Chiến lược → OKR → gắn KPI → tạo Dự án/Công việc → check-in định kỳ. Cần xem lại, bấm nút "Hướng dẫn" trên header. Chúc bạn điều hành hiệu quả!'),
  ],

  objectives: [
    { title: '🎯 Cây OKR — xem & tạo mục tiêu', body: 'Trang này gom toàn bộ Mục tiêu (Objective) và Kết quả then chốt (Key Result) của kỳ. Đi nhanh một vòng nhé.' },
    { target: 'objectives-new', title: 'Tạo OKR', body: 'Bấm đây để tạo OKR: chọn Cấp (Công ty/Khối/Phòng/Cá nhân) + đơn vị + kỳ, và "Liên kết lên" một OKR cấp trên để tạo dòng chảy chiến lược.' },
    { target: 'objectives-export', title: 'Xuất Excel', body: 'Xuất OKR ra Excel — chọn nhiều kỳ & đơn vị, tiện cho báo cáo và họp.' },
    { target: 'objectives-tree', title: 'Cây OKR & bộ lọc', body: 'Cây mục tiêu theo alignment. Có thanh lọc (tìm theo tên/mã/người, lọc Khối/Cấp/Trạng thái). Bấm TÊN một OKR để mở chi tiết.' },
    done('Bạn đã nắm cách xem và tạo OKR. Mở lại hướng dẫn này bất cứ lúc nào từ nút "Hướng dẫn" trên header.'),
  ],

  'objective-detail': [
    { title: '🎯 Chi tiết OKR — đo kết quả & thực thi', body: 'Đây là "phòng điều khiển" của một Mục tiêu. Đi nhanh một vòng các khu vực chính.' },
    { target: 'od-head', title: 'Thông tin & tiến độ OKR', body: 'Tên, cấp, người chủ trì, đơn vị, kỳ và tiến độ chung. Nút Sửa/Xoá (nếu có quyền) nằm ở góc phải-trên khu vực này.' },
    { target: 'od-kr', title: 'Key Result & Check-in', body: 'Kết quả đo được: bấm "Sửa KR" đặt mốc bắt đầu → hiện tại → mục tiêu & trọng số. Mục "Check-in" trong mỗi KR để cập nhật tiến độ theo tuần — tự cuộn lên Objective.' },
    { target: 'od-exec', title: 'Công việc thực thi', body: 'Biến mục tiêu thành hành động: Danh sách / Kanban (kéo-thả) / Dòng thời gian; gán người, đặt hạn, đính minh chứng. Đây là tiến độ THỰC THI (khác tiến độ KẾT QUẢ ở KR).' },
    { target: 'od-budget', title: 'Ngân sách & OKR con', body: 'Ngân sách kế hoạch/thực chi gắn OKR, và nút "+ Tạo OKR con" để phân rã mục tiêu xuống Khối/Phòng/Cá nhân.' },
    done('Đó là toàn bộ vòng đời một OKR. Cần xem lại, bấm nút "Hướng dẫn" trên header.'),
  ],

  tasks: [
    { title: '✅ Công việc — theo dõi & cập nhật', body: 'Nơi tập hợp mọi công việc thực thi. Đi nhanh một vòng các thao tác chính.' },
    { target: 'tasks-new', title: 'Tạo công việc', body: 'Bấm đây để tạo việc — nhân viên tạo được việc cá nhân (không cần gắn OKR/dự án); quản lý tạo việc gắn OKR/dự án/đơn vị.' },
    { target: 'tasks-explorer', title: 'Lọc, tìm & cập nhật', body: 'Ô tìm + lọc theo phụ trách/đơn vị/OKR/trạng thái/ưu tiên; tick "Quá hạn" hoặc "Việc của tôi". Bấm một dòng để mở chi tiết & cập nhật trạng thái/tiến độ/hạn. Quản trị tick nhiều dòng để thao tác hàng loạt.' },
    done('Bạn đã biết cách lọc, cập nhật và tạo việc. Mở lại hướng dẫn từ nút "Hướng dẫn" trên header.'),
  ],

  meetings: [
    { title: '📅 Cuộc họp — tổ chức & theo dõi hành động', body: 'Quản lý cuộc họp (check-in dự án · điều hành · IBP…), ghi biên bản và theo dõi hành động. Đi nhanh một vòng.' },
    { target: 'meetings-new', title: 'Tạo cuộc họp', body: 'Bấm đây để tạo cuộc họp: chọn loại, chủ trì/thư ký, người dự, đơn vị/dự án liên quan.' },
    { target: 'meetings-filter', title: 'Lọc & tìm', body: 'Tìm theo mã/tên/đơn vị/chủ trì + lọc theo Loại · Trạng thái · Chủ trì — lọc ngay tại chỗ, không tải lại trang.' },
    { target: 'meetings-list', title: 'Danh sách cuộc họp', body: 'Bấm TÊN một cuộc họp để mở chi tiết: biên bản, quyết định, danh sách hành động. Chỉ người tham gia/được thêm mới xem được nội dung.' },
    done('Bạn đã nắm cách tạo họp, lọc và mở chi tiết. Mở lại từ nút "Hướng dẫn" trên header.'),
  ],

  'meeting-detail': [
    { title: '📝 Chi tiết cuộc họp — biên bản & hành động', body: 'Trang ghi biên bản và biến thảo luận thành việc có người & có hạn. Đi nhanh một vòng.' },
    { target: 'md-head', title: 'Thông tin cuộc họp', body: 'Loại, thời gian, chủ trì/thư ký, người dự. Nút Sửa/Xoá cuộc họp (nếu có quyền) nằm ở góc phải-trên khu vực này.' },
    { target: 'md-minutes', title: 'Biên bản (kiểu Lark) & Quyết định', body: 'Bấm "Ghi biên bản": gõ "[]" tạo việc, "@tên" giao người, chọn lịch đặt hạn — tự đồng bộ xuống mục Hành động. Biên bản tự lưu nháp khi gõ.' },
    { target: 'md-actions', title: 'Hành động (next actions)', body: 'Danh sách việc của cuộc họp — xem Danh sách/Kanban/Gantt. Tick = việc "Xong"; chủ trì/thư ký sửa lại được hạn của việc sau khi tạo.' },
    done('Đó là cách ghi biên bản và quản hành động sau họp. Mở lại từ nút "Hướng dẫn" trên header.'),
  ],

  projects: [
    { title: '🗂 Dự án — gom việc xuyên nhiều OKR', body: 'Dự án là thực thể độc lập (mã PRJ) gom việc từ nhiều OKR/khối về một nơi. Đi nhanh một vòng.' },
    { target: 'projects-new', title: 'Tạo dự án', body: 'Bấm đây để tạo dự án: tên, chủ trì, đơn vị phụ trách, kỳ và ngân sách.' },
    { target: 'projects-list', title: 'Danh sách dự án', body: 'Bấm TÊN một dự án để xem chi tiết: việc gom theo OKR, ngân sách kế hoạch/thực chi và tiến độ. Gắn việc vào dự án ở popup sửa việc (tick "Thuộc dự án").' },
    done('Bạn đã biết cách dùng Dự án để gom & theo dõi việc xuyên OKR. Mở lại từ nút "Hướng dẫn" trên header.'),
  ],

  kpi: [
    { title: '📊 KPI / Scorecard — chỉ số đo lường', body: 'Thư viện chỉ số và thẻ điểm (scorecard) theo BSC. Đi nhanh một vòng.' },
    { target: 'kpi-new', title: 'Tạo KPI', body: 'Bấm đây để thêm chỉ số mới; thư viện đầy đủ ở Quản trị → Thư viện KPI.' },
    { target: 'kpi-filter', title: 'Lọc kỳ · đơn vị · viễn cảnh', body: 'Chọn kỳ, đơn vị và viễn cảnh BSC rồi bấm "Áp dụng" để xem đúng phạm vi mình cần.' },
    { target: 'kpi-score', title: 'Điểm scorecard', body: 'Tổng điểm chấm theo trọng số 3 tầng — nhìn nhanh mức đạt của cả bộ chỉ số theo phạm vi đang lọc.' },
    { target: 'kpi-table', title: 'Nhập số & cảnh báo', body: 'Nhập mục tiêu/thực hiện theo đơn vị mình; ô màu W/A/E cảnh báo. Bấm TÊN một KPI để xem đầy đủ công thức, nguồn, ngưỡng & "đang dùng bởi". Một số KPI tự đồng bộ từ BigQuery.' },
    done('Bạn đã nắm cách nhập số, đọc cảnh báo và dùng KPI tự động. Mở lại từ nút "Hướng dẫn" trên header.'),
  ],

  review: [
    { title: '🧭 Họp điều hành (WBR/MBR)', body: 'Trang tổng hợp một kỳ để chủ trì cuộc họp điều hành: đọc từ trên xuống là ra hành động. Đi nhanh một vòng.' },
    { target: 'review-kpis', title: 'Nhịp độ tổng quan', body: 'Đọc nhanh sức khỏe kỳ: tiến độ công ty vs thời gian đã trôi (nhịp độ), tỷ lệ check-in, số KPI cảnh báo, việc quá hạn.' },
    { target: 'review-insights', title: 'Nhận định & Khuyến nghị', body: 'Phần tự sinh theo quy tắc (Quan sát → Hàm ý → Khuyến nghị) — chốt hành động ngay trong cuộc họp.' },
    { target: 'review-breakdown', title: 'Theo Khối & BSC', body: 'Tiến độ theo từng Khối và theo 4 viễn cảnh BSC + điểm sức khỏe OKR — xác định chỗ chậm để dồn nguồn lực.' },
    done('Bạn đã biết cách dùng trang Họp điều hành để chạy WBR/MBR (có thể In/xuất PDF bằng Ctrl+P). Mở lại từ nút "Hướng dẫn".'),
  ],

  my: [
    { title: '👤 Của tôi — OKR & việc của bạn', body: 'Trang cá nhân gom mục tiêu và công việc của riêng bạn. Đi nhanh một vòng.' },
    { target: 'my-new', title: 'OKR cá nhân', body: 'Bấm đây để tự đặt mục tiêu cho mình — mọi vai trò đều tạo được.' },
    { target: 'my-tiles', title: 'Tổng quan việc của tôi', body: 'Các ô số việc (đang mở/quá hạn/hôm nay…) — bấm một ô để mở trang Công việc đã lọc sẵn.' },
    { target: 'my-okr', title: 'OKR tôi chủ trì', body: 'Danh sách OKR bạn phụ trách kèm tiến độ — bấm để mở chi tiết & check-in.' },
    { target: 'my-tasks', title: 'Việc đang mở của tôi', body: 'Việc được giao cho bạn; cập nhật trạng thái + tiến độ ngay tại đây.' },
    done('Đây là "bàn làm việc" cá nhân của bạn. Mở lại hướng dẫn từ nút "Hướng dẫn" trên header.'),
  ],

  strategy: [
    { title: '🧱 Chiến lược công ty — đỉnh của chuỗi', body: 'Nơi khai báo định hướng dài hạn để mọi OKR/KPI rải xuống. Đi nhanh một vòng.' },
    { target: 'strategy-edit', title: 'Khai báo / sửa (khi có quyền)', body: 'Người có quyền "Quản lý Chiến lược" bấm đây để khai báo/sửa Tầm nhìn · Sứ mệnh · Giá trị · Khát vọng.' },
    { target: 'strategy-chain', title: 'Sơ đồ chuỗi điều hành', body: 'Chiến lược → BSC → OKR → KRA/KR → KPI · Dự án · Công việc · Cuộc họp. Bấm từng mắt xích để đi tới đúng nơi.' },
    { target: 'strategy-vision', title: 'Tầm nhìn · Sứ mệnh · Giá trị', body: 'Nội dung định hướng đã khai báo, hiển thị ngay tại chỗ để cả tổ chức nhìn cùng một bức tranh.' },
    { target: 'strategy-pillars', title: 'Trụ cột chiến lược', body: 'Các trụ cột (OKR nhiều năm cấp Công ty) — kéo–thả để sắp xếp lại thứ tự theo ưu tiên.' },
    done('Bạn đã nắm bức tranh chiến lược đỉnh chuỗi. Mở lại từ nút "Hướng dẫn" trên header.'),
  ],

  budget: [
    { title: '💰 Ngân sách — kế hoạch vs thực chi', body: 'Theo dõi ngân sách theo dự án và khối trong một kỳ. Đi nhanh một vòng.' },
    { target: 'budget-filter', title: 'Lọc & công cụ', body: 'Lọc dự án theo trạng thái; người có quyền "Quản lý Ngân sách" nhập cấu trúc chi phí (CSV) hoặc đồng bộ thực chi tại thanh này. Đổi kỳ ở ô chọn kỳ góc phải-trên.' },
    { target: 'budget-kpis', title: 'Tổng quan ngân sách', body: 'Tổng kế hoạch, đã chi, còn lại và % đã dùng của toàn kỳ — nhìn nhanh sức khỏe ngân sách.' },
    { target: 'budget-projects', title: 'Theo dự án', body: 'Ngân sách kế hoạch/thực chi từng dự án; "Đã chi" gom từ ngân sách thực chi của công việc trong dự án.' },
    { target: 'budget-units', title: 'Theo khối / đơn vị', body: 'Bấm tên một đơn vị để mở chi tiết các dự án & hạng mục ngân sách cấu thành.' },
    done('Bạn đã biết cách đọc và quản ngân sách theo kỳ/đơn vị. Mở lại từ nút "Hướng dẫn" trên header.'),
  ],

  admin: [
    { title: '⚙️ Quản trị hệ thống', body: 'Khu vực dành cho CEO/CFO: nền tảng · đo lường · tự động hoá. Đi nhanh một vòng.' },
    { target: 'admin-foundation', title: '1 · Nền tảng tổ chức', body: 'Người dùng & phân quyền · Cây tổ chức · Kỳ OKR · Phân quyền (Nhóm quyền × Năng lực). Bấm từng thẻ để mở.' },
    { target: 'admin-measure', title: '2 · Đo lường & thiết lập', body: 'Thư viện KPI · Cài đặt & nhắc check-in · Nhật ký lỗi hệ thống.' },
    { target: 'admin-automation', title: '3 · Tự động hoá & dữ liệu', body: 'Đồng bộ KPI (BigQuery) · gửi Bản tin điều hành tuần · Import/Export Excel theo mã unique — bấm nút để chạy ngay.' },
    { target: 'admin-quickstart', title: '4 · Bắt đầu nhanh', body: 'Trình tự thiết lập hệ thống từ đầu — bấm từng bước để mở đúng nơi.' },
    done('Bạn đã nắm các mục quản trị chính. Mở lại từ nút "Hướng dẫn" trên header.'),
  ],

  'admin-users': [
    { title: '👥 Người dùng & phân quyền', body: 'Thêm và quản lý tài khoản, vai trò, đơn vị và nhóm quyền. Đi nhanh một vòng.' },
    { target: 'admin-users-add', title: 'Thêm / cập nhật người dùng', body: 'Thêm bằng email Google + đặt vai trò + đơn vị + Nhóm quyền, rồi bấm Lưu.' },
    { target: 'admin-users-filter', title: 'Tìm & lọc', body: 'Tìm theo tên/email + lọc theo vai trò/đơn vị/nhóm quyền để nhanh chóng tìm đúng người.' },
    { target: 'admin-users-table', title: 'Sửa · Bàn giao · Khoá · Xoá', body: 'Mỗi hàng có nút thao tác: Sửa; "Bàn giao" khi một người nghỉ (chuyển toàn bộ việc/OKR/dự án/họp sang người thay thế); Khoá để ngừng đăng nhập; Xoá (có xác nhận).' },
    done('Bạn đã biết cách quản người dùng và bàn giao khi có biến động nhân sự. Mở lại từ nút "Hướng dẫn".'),
  ],

  'admin-permissions': [
    { title: '🔐 Phân quyền — Nhóm quyền × Năng lực', body: 'Ma trận cấp/thu quyền theo từng nhóm. Đi nhanh một vòng.' },
    { target: 'perm-legend', title: 'Các nhóm quyền', body: 'Chú thích từng Nhóm quyền (Quản trị · OKR Admin · Quản lý · Cộng tác · Người xem) và ý nghĩa. Gán nhóm cho user ở trang Người dùng.' },
    { target: 'perm-matrix', title: 'Ma trận Năng lực', body: 'Mỗi cột là một Nhóm quyền, mỗi hàng là một Năng lực; tick/bỏ tick để cấp/thu quyền rồi Lưu. Thêm tính năng mới → năng lực mới TỰ hiện thành hàng ở đây. CEO/CFO luôn toàn quyền.' },
    done('Bạn đã nắm cách phân quyền theo nhóm × năng lực. Mở lại từ nút "Hướng dẫn" trên header.'),
  ],
};

// Ánh xạ đường dẫn → khoá tour. Thêm trang mới ⇒ thêm 1 dòng ở đây (khớp với entry PAGE_TOURS).
export function tourKeyForPath(pathname: string): string | null {
  const p = (pathname || '').replace(/\/+$/, '') || '/';
  if (p === '/') return 'dashboard';
  if (p === '/objectives') return 'objectives';
  if (/^\/objectives\/[^/]+$/.test(p) && p !== '/objectives/new') return 'objective-detail';
  if (p === '/tasks') return 'tasks';
  if (p === '/meetings') return 'meetings';
  if (/^\/meetings\/[^/]+$/.test(p)) return 'meeting-detail';
  if (p === '/projects') return 'projects';
  if (p === '/kpi') return 'kpi';
  if (p === '/review') return 'review';
  if (p === '/my') return 'my';
  if (p === '/strategy') return 'strategy';
  if (p === '/budget') return 'budget';
  if (p === '/admin') return 'admin';
  if (p === '/admin/users') return 'admin-users';
  if (p === '/admin/permissions') return 'admin-permissions';
  return null;
}
