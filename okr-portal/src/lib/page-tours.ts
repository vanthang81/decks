// SỔ TOUR WALKTHROUGH THEO TRANG — mỗi trang một "tour" pop-up nhiều bước (giống tour Trang chủ).
// Mục tiêu: người mới được DẪN ĐI TỪNG BƯỚC qua các tính năng của CHÍNH trang đó, nhìn là dùng được.
//
// ⭐ TỰ CẬP NHẬT (CFO 29/08): đây là NGUỒN DUY NHẤT của mọi walkthrough. Thêm TRANG mới ⇒ thêm 1 entry
// vào PAGE_TOURS + 1 dòng ánh xạ trong tourKeyForPath → tour tự chạy (AutoPageTour ở layout) và nút
// "Hướng dẫn" tự hiện trên header, KHÔNG cần sửa từng trang. Thêm/đổi TÍNH NĂNG ⇒ thêm/sửa 1 bước ở
// tour của trang tương ứng. Giữ TỐI ĐA 10 bước/trang (welcome + tính năng + kết thúc).
//
// Bước có `target` → khoét sáng phần tử [data-tour="<target>"]; không có/không thấy → thẻ giữa màn.

export type TourStep = { target?: string; title: string; body: string; link?: { href: string; label: string } };

// Deck giới thiệu hệ thống (mở tab mới) — gắn ở bước kết thúc mỗi tour.
export const DECK_URL = 'https://deck.consultx.vn/d/he-thong-quan-tri-hieu-suat-btmh';
const DECK_LINK = { href: DECK_URL, label: '📖 Xem tài liệu giới thiệu hệ thống (slide)' };

// Bước kết thúc dùng chung — nhắc mở lại tour + link tài liệu.
const done = (body: string): TourStep => ({ title: '🎉 Xong rồi!', body, link: DECK_LINK });

export const PAGE_TOURS: Record<string, TourStep[]> = {
  // ── Trang chủ / Bảng điều khiển (giữ tour gốc: có khoét sáng nav + chuông + tên) ──
  dashboard: [
    {
      title: '👋 Chào mừng đến Hệ thống Điều hành OKR BTMH',
      body: 'Đi nhanh một vòng (khoảng 1 phút) để biết đặt gì ở đâu và bắt đầu dùng được ngay. Bạn có thể Bỏ qua bất cứ lúc nào và mở lại từ nút "Hướng dẫn" trên thanh trên cùng.',
    },
    { target: 'nav-overview', title: 'Tổng quan & Họp điều hành', body: 'Bảng điều khiển cho bức tranh tiến độ toàn công ty; "Họp điều hành" (WBR/MBR) tổng hợp nhận định & khuyến nghị, KPI cảnh báo, việc quá hạn.' },
    { target: 'nav-strategy', title: 'Chiến lược → OKR → KPI', body: 'Chuỗi đo lường: khai báo Chiến lược (tầm nhìn/sứ mệnh) → rải xuống OKR (Mục tiêu · Kết quả then chốt) theo cây Công ty → Khối → Phòng → Cá nhân → đo bằng Thư viện KPI (thẻ điểm BSC).' },
    { target: 'nav-exec', title: 'Thực thi: Dự án & Công việc', body: 'Nơi biến mục tiêu thành hành động: quản lý Dự án (xuyên nhiều OKR) và Công việc — xem dạng Danh sách / Kanban kéo-thả / Dòng thời gian, gán người & theo hạn.' },
    { target: 'tour-all-okr', title: 'Xem toàn bộ cây OKR', body: 'Bấm đây để mở toàn bộ cây mục tiêu của kỳ, tạo OKR mới và liên kết (cascade) lên cấp trên.' },
    { target: 'tour-bell', title: 'Thông báo', body: 'Chuông báo khi bạn được @nhắc tên, có người trả lời bình luận, có bình luận ở mục bạn phụ trách, hoặc được giao việc. Bấm để xem danh sách và mở tới đúng chỗ.' },
    { target: 'tour-user', title: 'Cài đặt cá nhân', body: 'Bấm TÊN của bạn để xem hồ sơ và bật/tắt từng loại thông báo (và email). Mọi thao tác Sửa/Thêm nằm ở nút gọn góc phải-trên của mỗi khu vực.' },
    done('Gợi ý thứ tự: Chiến lược → OKR → gắn KPI → tạo Dự án/Công việc → check-in định kỳ. Cần xem lại, bấm nút "Hướng dẫn" trên header hoặc mở mục "Hướng dẫn" trên menu. Chúc bạn điều hành hiệu quả!'),
  ],

  objectives: [
    { title: '🎯 Cây OKR — xem & tạo mục tiêu', body: 'Trang này gom toàn bộ Mục tiêu (Objective) và Kết quả then chốt (Key Result) của kỳ theo cây Công ty → Khối → Phòng → Cá nhân. Đi nhanh một vòng nhé.' },
    { title: 'Tạo OKR', body: 'Bấm "+ Tạo OKR" ở góc phải-trên → chọn Cấp (Công ty/Khối/Phòng/Cá nhân) + đơn vị + kỳ, và có thể "Liên kết lên" một OKR cấp trên để tạo dòng chảy chiến lược.' },
    { title: 'Lọc & tìm', body: 'Thanh lọc ở đầu danh sách: tìm theo tên/mã/người chủ trì + lọc theo Khối/Phòng, Cấp, Trạng thái, Loại OKR. Nhân viên chỉ thấy OKR trong phạm vi đơn vị mình.' },
    { title: 'Mở chi tiết', body: 'Bấm TÊN một OKR để mở trang chi tiết: Key Result, check-in, công việc thực thi, ngân sách và OKR con.' },
    { title: 'Xuất Excel', body: 'Nút "Xuất Excel" cho phép chọn nhiều kỳ & đơn vị — tiện cho báo cáo và họp.' },
    done('Bạn đã nắm cách xem và tạo OKR. Mở lại hướng dẫn này bất cứ lúc nào từ nút "Hướng dẫn" trên header.'),
  ],

  'objective-detail': [
    { title: '🎯 Chi tiết OKR — đo kết quả & thực thi', body: 'Đây là "phòng điều khiển" của một Mục tiêu: kết quả then chốt, tiến độ, công việc và ngân sách. Đi nhanh một vòng.' },
    { title: 'Key Result (KR)', body: 'Kết quả đo được của mục tiêu. Bấm "Sửa KR" để đặt mốc bắt đầu → hiện tại → mục tiêu, chọn hướng tăng/giảm và trọng số (đóng góp vào tiến độ chung).' },
    { title: 'Check-in', body: 'Cập nhật tiến độ + độ tự tin theo tuần cho KR mình phụ trách — tiến độ tự cuộn lên Objective và OKR cha.' },
    { title: 'Công việc thực thi', body: 'Biến mục tiêu thành hành động: xem Danh sách / Kanban (kéo-thả đổi trạng thái) / Dòng thời gian; gán người, đặt hạn, đính minh chứng.' },
    { title: 'Ngân sách & OKR con', body: 'Khai báo ngân sách kế hoạch/thực chi; bấm "+ Tạo OKR con" để phân rã mục tiêu xuống Khối/Phòng/Cá nhân.' },
    done('Đó là toàn bộ vòng đời một OKR. Cần xem lại, bấm nút "Hướng dẫn" trên header.'),
  ],

  tasks: [
    { title: '✅ Công việc — theo dõi & cập nhật', body: 'Nơi tập hợp mọi công việc thực thi để theo dõi và cập nhật. Đi nhanh một vòng các thao tác chính.' },
    { title: 'Lọc & tìm', body: 'Ô tìm + lọc theo phụ trách / đơn vị / OKR / trạng thái / ưu tiên; tick nhanh "Quá hạn" hoặc "Việc của tôi" để lọc gọn.' },
    { title: 'Xem & cập nhật', body: 'Bấm một dòng để mở chi tiết; nút "Sửa" để cập nhật trạng thái, tiến độ, hạn (người quản việc), đính minh chứng, đánh dấu hoàn thành.' },
    { title: 'Tạo việc cá nhân', body: 'Nút "+ Tạo công việc" — việc của riêng bạn, không cần gắn OKR/dự án. Ai cũng tạo được.' },
    { title: 'Thao tác hàng loạt', body: 'Người quản trị tick nhiều dòng để đổi trạng thái hoặc xoá cùng lúc — xử lý nhanh khi tồn nhiều việc.' },
    done('Bạn đã biết cách lọc, cập nhật và tạo việc. Mở lại hướng dẫn từ nút "Hướng dẫn" trên header.'),
  ],

  meetings: [
    { title: '📅 Cuộc họp — tổ chức & theo dõi hành động', body: 'Quản lý cuộc họp (check-in dự án · điều hành công ty/khối/phòng · IBP…), ghi biên bản và theo dõi hành động. Đi nhanh một vòng.' },
    { title: 'Lọc & tìm', body: 'Thanh lọc ở đầu trang: tìm theo mã/tên/đơn vị/chủ trì + lọc theo Loại · Trạng thái · Chủ trì — lọc ngay tại chỗ.' },
    { title: 'Tạo cuộc họp', body: 'Nút "Cuộc họp mới" (góc phải-trên): chọn loại, chủ trì/thư ký, người dự, đơn vị/dự án liên quan.' },
    { title: 'Mở chi tiết', body: 'Bấm TÊN cuộc họp để mở: biên bản (soạn kiểu Lark), quyết định, danh sách hành động (next actions) đồng bộ sang Công việc.' },
    { title: 'Quyền xem', body: 'Chỉ người tham gia / được thêm mới xem được nội dung; chủ trì & thư ký duyệt các yêu cầu xin xem.' },
    done('Bạn đã nắm cách tạo họp, ghi biên bản và theo dõi hành động. Mở lại từ nút "Hướng dẫn" trên header.'),
  ],

  'meeting-detail': [
    { title: '📝 Chi tiết cuộc họp — biên bản & hành động', body: 'Trang ghi biên bản và biến thảo luận thành việc có người & có hạn. Đi nhanh một vòng.' },
    { title: 'Biên bản (kiểu Lark)', body: 'Gõ "[]" để tạo việc ngay trong biên bản, "@tên" để giao người, chọn lịch để đặt hạn — tự đồng bộ xuống mục Hành động.' },
    { title: 'Tự lưu nháp', body: 'Biên bản tự lưu khi bạn gõ; đóng ra mở lại vẫn còn để viết tiếp — không lo mất.' },
    { title: 'Tick việc trong biên bản', body: 'Tick = việc chuyển "Xong", bỏ tick = "Đang làm", xoá dòng = xoá việc. Trạng thái luôn khớp giữa biên bản và danh sách việc.' },
    { title: 'Sửa hạn việc', body: 'Chủ trì / thư ký sửa lại được hạn của công việc sau khi tạo — tiện điều chỉnh khi lịch thay đổi.' },
    done('Đó là cách ghi biên bản và quản hành động sau họp. Mở lại từ nút "Hướng dẫn" trên header.'),
  ],

  projects: [
    { title: '🗂 Dự án — gom việc xuyên nhiều OKR', body: 'Dự án là thực thể độc lập (mã PRJ) gom việc từ nhiều OKR/khối về một nơi để quản lý tiến độ & ngân sách. Đi nhanh một vòng.' },
    { title: 'Tạo dự án', body: 'Bấm tạo dự án (góc phải-trên): đặt tên, chủ trì, đơn vị phụ trách, kỳ và ngân sách.' },
    { title: 'Mở chi tiết', body: 'Bấm TÊN dự án để xem chi tiết: việc gom theo OKR, ngân sách kế hoạch/thực chi và tiến độ.' },
    { title: 'Gắn việc vào dự án', body: 'Trong popup sửa một việc, tick "Thuộc dự án" rồi chọn dự án có sẵn hoặc "＋ Dự án mới".' },
    done('Bạn đã biết cách dùng Dự án để gom & theo dõi việc xuyên OKR. Mở lại từ nút "Hướng dẫn" trên header.'),
  ],

  kpi: [
    { title: '📊 KPI / Scorecard — chỉ số đo lường', body: 'Thư viện chỉ số và thẻ điểm (scorecard) theo BSC để đo lường kết quả. Đi nhanh một vòng.' },
    { title: 'Nhập số', body: 'Nhập chỉ tiêu (target) và thực hiện (actual) theo đơn vị mình; ô màu W/A/E cảnh báo mức Watch / Alert / Escalate.' },
    { title: 'Mở chi tiết KPI', body: 'Bấm TÊN một KPI để xem đầy đủ công thức, nguồn, ngưỡng và "đang dùng bởi" (các KR đang liên kết).' },
    { title: 'Tạo & quản lý KPI', body: 'Nút "+ Tạo KPI" để thêm chỉ số; thư viện đầy đủ ở Quản trị → Thư viện KPI.' },
    { title: 'KPI tự động', body: 'Một số KPI (doanh thu, lãi gộp, tồn kho…) tự đồng bộ từ BigQuery mỗi giờ — không phải nhập tay.' },
    done('Bạn đã nắm cách nhập số, đọc cảnh báo và dùng KPI tự động. Mở lại từ nút "Hướng dẫn" trên header.'),
  ],

  review: [
    { title: '🧭 Họp điều hành (WBR/MBR)', body: 'Trang tổng hợp một kỳ để chủ trì cuộc họp điều hành: đọc từ trên xuống là ra hành động. Đi nhanh một vòng.' },
    { title: 'Đọc theo thứ tự', body: 'Nhịp độ → theo Khối → BSC → KPI cảnh báo (W/A/E) → OKR cần chú ý → việc quá hạn. Mỗi con số bấm được để về danh sách đích danh.' },
    { title: 'Nhận định & Khuyến nghị', body: 'Phần tự sinh theo quy tắc (Quan sát → Hàm ý → Khuyến nghị) giúp chốt hành động ngay trong cuộc họp.' },
    { title: 'In đẹp', body: 'Trang được tối ưu để in / xuất PDF phục vụ cuộc họp điều hành.' },
    done('Bạn đã biết cách dùng trang Họp điều hành để chạy WBR/MBR. Mở lại từ nút "Hướng dẫn" trên header.'),
  ],

  my: [
    { title: '👤 Của tôi — OKR & việc của bạn', body: 'Trang cá nhân gom mục tiêu và công việc của riêng bạn. Đi nhanh một vòng.' },
    { title: 'OKR cá nhân', body: 'Bấm "+ OKR cá nhân" để tự đặt mục tiêu cho mình — mọi vai trò đều tạo được.' },
    { title: 'Việc của tôi', body: 'Danh sách việc được giao; cập nhật trạng thái + tiến độ ngay tại đây, không cần đi đâu khác.' },
    { title: 'Check-in', body: 'Ghi check-in cho KR mình phụ trách để tiến độ luôn cập nhật và phản ánh đúng.' },
    done('Đây là "bàn làm việc" cá nhân của bạn. Mở lại hướng dẫn từ nút "Hướng dẫn" trên header.'),
  ],

  strategy: [
    { title: '🧱 Chiến lược công ty — đỉnh của chuỗi', body: 'Nơi khai báo định hướng dài hạn để mọi OKR/KPI rải xuống từ đây. Đi nhanh một vòng.' },
    { title: 'Xem tổng thể', body: 'Tầm nhìn · Sứ mệnh · Giá trị · Khát vọng + sơ đồ chuỗi chiến lược + các trụ cột + thẻ điểm BSC.' },
    { title: 'Sửa (khi có quyền)', body: 'Người có quyền "Quản lý Chiến lược" bấm nút ở góc phải-trên để khai báo/chỉnh sửa.' },
    { title: 'Sắp xếp trụ cột', body: 'Kéo–thả để sắp xếp lại thứ tự các trụ cột theo logic ưu tiên.' },
    done('Bạn đã nắm bức tranh chiến lược đỉnh chuỗi. Mở lại từ nút "Hướng dẫn" trên header.'),
  ],

  budget: [
    { title: '💰 Ngân sách — kế hoạch vs thực chi', body: 'Theo dõi ngân sách theo dự án và khối trong một kỳ. Đi nhanh một vòng.' },
    { title: 'Xem theo kỳ & đơn vị', body: 'Tổng ngân sách kế hoạch, đã chi và còn lại theo từng dự án và khối; đổi kỳ ở ô chọn kỳ góc phải-trên.' },
    { title: 'Nhập CSV / Đồng bộ', body: 'Người có quyền "Quản lý Ngân sách" nhập cấu trúc chi phí (CSV) hoặc đồng bộ thực chi từ công việc.' },
    { title: 'Chi tiết theo khối', body: 'Bấm tên một đơn vị để mở chi tiết các dự án & hạng mục ngân sách cấu thành.' },
    done('Bạn đã biết cách đọc và quản ngân sách theo kỳ/đơn vị. Mở lại từ nút "Hướng dẫn" trên header.'),
  ],

  admin: [
    { title: '⚙️ Quản trị hệ thống', body: 'Khu vực dành cho quản trị: người dùng, tổ chức, kỳ và các tác vụ vận hành. Đi nhanh một vòng.' },
    { title: 'Người dùng · Tổ chức · Kỳ', body: 'Quản lý allowlist đăng nhập, cây đơn vị (khối/phòng) và các kỳ OKR.' },
    { title: 'Đồng bộ KPI / Bản tin', body: 'Chạy đồng bộ KPI từ BigQuery hoặc gửi bản tin điều hành ngay bằng các nút tương ứng.' },
    { title: 'Nhắc check-in', body: 'Cấu hình lịch nhắc check-in ở Quản trị → Cấu hình để KR không bị bỏ quên.' },
    done('Bạn đã nắm các mục quản trị chính. Mở lại từ nút "Hướng dẫn" trên header.'),
  ],

  'admin-users': [
    { title: '👥 Người dùng & phân quyền', body: 'Thêm và quản lý tài khoản, vai trò, đơn vị và nhóm quyền. Đi nhanh một vòng.' },
    { title: 'Thêm / sửa người dùng', body: 'Thêm bằng email Google + đặt vai trò + đơn vị + Nhóm quyền; sửa nhanh bằng nút ở mỗi hàng.' },
    { title: 'Bàn giao khi nghỉ', body: 'Khi một người nghỉ, bấm "Bàn giao" ở hàng của họ để chuyển toàn bộ việc/OKR/dự án/họp đang dở sang người thay thế.' },
    { title: 'Khoá / Mở / Xoá', body: 'Khoá tài khoản để ngừng đăng nhập mà vẫn giữ dữ liệu; xoá cần xác nhận để tránh nhầm.' },
    done('Bạn đã biết cách quản người dùng và bàn giao khi có biến động nhân sự. Mở lại từ nút "Hướng dẫn".'),
  ],

  'admin-permissions': [
    { title: '🔐 Phân quyền — Nhóm quyền × Năng lực', body: 'Ma trận cấp/thu quyền theo từng nhóm. Đi nhanh một vòng.' },
    { title: 'Ma trận quyền', body: 'Mỗi Nhóm quyền = một bộ Năng lực; tick / bỏ tick để cấp hoặc thu từng quyền.' },
    { title: 'Tự mở rộng', body: 'Thêm tính năng mới → năng lực mới TỰ hiện thành dòng ở đây để bạn phân quyền.' },
    { title: 'CEO/CFO', body: 'Luôn toàn quyền và không thể tự khoá — bảo đảm không bao giờ mất quyền quản trị.' },
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
