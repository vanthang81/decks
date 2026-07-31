// ============================================================================
// NGUỒN DUY NHẤT cho Hướng dẫn sử dụng + tooltip trợ giúp.
// Trang /guide và component HelpTip đều đọc từ đây. Phần cấu trúc (vai trò, cấp,
// KPI metric, kỳ, số đơn vị) được trang /guide render ĐỘNG từ code/DB → tự cập
// nhật khi hệ thống thay đổi. Khi THÊM tính năng: thêm 1 mục vào FEATURES +
// 1 dòng vào CHANGELOG (xem CLAUDE.md "Quy tắc cập nhật tài liệu").
// ============================================================================

export const GUIDE_VERSION = '2026-07-31.14';

export type Block = { p?: string; list?: string[]; note?: string };
export type GuideSection = { id: string; title: string; blocks: Block[] };

// ---- Phương pháp luận (best practice OKR/KPI/Action Plan, áp cho BTMH) ----
export const METHODOLOGY: GuideSection[] = [
  {
    id: 'tong-quan',
    title: '1. OKR là gì & vì sao BTMH dùng',
    blocks: [
      {
        p: 'OKR (Objectives & Key Results) là khung đặt & thực thi mục tiêu: mỗi Objective (mục tiêu — định tính, truyền cảm hứng) đi kèm 2–5 Key Result (kết quả then chốt — số đo được). OKR kết nối chiến lược công ty xuống từng khối, phòng, cá nhân để mọi người kéo cùng một hướng.',
      },
      {
        p: 'BTMH dùng OKR để: (1) minh bạch mục tiêu toàn công ty; (2) gắn kế hoạch kinh doanh (ĐHCĐ) với thực thi hàng ngày; (3) đo tiến độ khách quan bằng số liệu tự động thay vì báo cáo tay.',
      },
      {
        note: 'Nguyên tắc số lượng: mỗi cấp nên có 3–5 Objective, mỗi Objective 2–5 KR. Nhiều hơn = mất tập trung.',
      },
    ],
  },
  {
    id: 'okr-vs-kpi',
    title: '2. OKR vs KPI — chỉ số dẫn dắt & chỉ số kết quả',
    blocks: [
      {
        p: 'KPI là chỉ số đo sức khoẻ vận hành thường xuyên (VD: doanh thu, lãi gộp, tồn kho). OKR là mục tiêu THAY ĐỔI trong một kỳ. KPI cho biết "đang tốt/xấu", OKR cho biết "cần đi đâu".',
      },
      {
        p: 'KR nên phối hợp: 1 chỉ số KẾT QUẢ (lagging — VD doanh thu) + tối đa 3 chỉ số DẪN DẮT (leading — hành động tạo ra kết quả, VD số cửa hàng mở mới, số khách B2B tiếp cận). Càng xuống cấp thấp, càng nên dùng chỉ số dẫn dắt.',
      },
      {
        note: 'Trong hệ thống: KR gắn "Nguồn KPI" (doanh thu / lợi nhuận gộp) sẽ tự lấy kế hoạch (target) + thực hiện (current) từ BigQuery — không cần nhập tay.',
      },
    ],
  },
  {
    id: 'cach-viet',
    title: '3. Cách viết Objective & Key Result tốt',
    blocks: [
      { p: 'Objective: ngắn, định hướng, có ý nghĩa kinh doanh. Tránh "vận hành như thường lệ" (business-as-usual) — OKR là thứ MUỐN THAY ĐỔI, không phải việc duy trì.' },
      {
        p: 'Key Result: đo được (SMART — Cụ thể, Đo được, Khả thi, Liên quan, Có hạn), có mốc bắt đầu → mục tiêu. Nêu "kết quả" chứ không nêu "việc làm" (việc làm thuộc Kế hoạch hành động).',
        list: [
          'Tốt: "Doanh thu bán lẻ quý đạt 500 tỷ" (đo được).',
          'Chưa tốt: "Đẩy mạnh bán hàng" (không đo được).',
        ],
      },
    ],
  },
  {
    id: 'cam-ket-khat-vong',
    title: '4. OKR cam kết vs khát vọng',
    blocks: [
      {
        p: 'OKR CAM KẾT (committed): bắt buộc đạt ~100%, không đạt phải giải trình. OKR KHÁT VỌNG (aspirational/moonshot): kỳ vọng đạt ~70%, chấp nhận rủi ro cao để tạo đột phá.',
      },
      {
        note: 'Đội mới nên bắt đầu bằng OKR cam kết khả thi để tạo nhịp, rồi mới thêm mục tiêu khát vọng. Đừng lẫn lộn hai loại — dễ quá tải hoặc mất trách nhiệm.',
      },
    ],
  },
  {
    id: 'nhip',
    title: '5. Nhịp làm việc — check-in tuần, review quý',
    blocks: [
      {
        p: 'Check-in hàng tuần (15–30 phút): cập nhật số liệu KR + mức độ tự tin + việc vướng. Cuối kỳ (quý): chấm điểm & rút kinh nghiệm, đặt OKR kỳ sau.',
      },
      {
        p: 'Độ tự tin (confidence) KHÁC tiến độ (%). Đầu kỳ tự tin ~50%. Có thể mới đạt 40% nhưng tự tin 80% sẽ về đích — hoặc ngược lại. Tụt tự tin = tín hiệu cần tung thêm kế hoạch hành động.',
        list: [
          'Đúng tiến độ (xanh) — đang bám kế hoạch.',
          'Có rủi ro (vàng) — cần chú ý/hỗ trợ.',
          'Chệch hướng (đỏ) — cần hành động sửa ngay.',
        ],
      },
    ],
  },
  {
    id: 'cham-diem',
    title: '6. Chấm điểm & tiến độ',
    blocks: [
      {
        p: 'Tiến độ mỗi KR tính từ (hiện tại − bắt đầu) / (mục tiêu − bắt đầu), kẹp 0–100%. Tiến độ Objective = bình quân theo trọng số các KR; không có KR thì lấy bình quân OKR con. Tiến độ tự "chảy ngược" lên: Cá nhân → Phòng → Khối → Công ty.',
      },
      { note: 'OKR cam kết đạt <100% nên có ghi chú lý do (dùng ô Check-in). Điểm không phải để phạt — để học và điều chỉnh.' },
    ],
  },
  {
    id: 'hanh-dong',
    title: '7. Dự án, Kế hoạch hành động & Ngân sách',
    blocks: [
      {
        p: 'Thực thi OKR bằng cây công việc: một Objective/KR có thể triển khai bằng công việc đơn, hoặc cả một DỰ ÁN có TIỂU DỰ ÁN và nhiều CÔNG VIỆC con. Mỗi nút có người phụ trách, hạn, ưu tiên, trạng thái, % hoàn thành và ngân sách.',
      },
      {
        p: 'Trưởng phòng (trở lên) tạo & giao việc; nhân viên tự cập nhật trạng thái/tiến độ việc được giao. Tiến độ công việc tự cuộn lên tiểu dự án → dự án. Đây là tiến độ THỰC THI (đã làm gì) — tách khỏi tiến độ KẾT QUẢ đo bằng Key Result (đạt được gì).',
      },
      {
        note: 'Ngân sách khai ở từng việc (kế hoạch vs thực chi); hệ thống tổng hợp giải ngân theo Objective, chỉ cộng nút lá để tránh trùng.',
      },
    ],
  },
  {
    id: 'phan-quyen',
    title: '8. Phân quyền theo cây tổ chức',
    blocks: [
      {
        p: 'Mọi người đăng nhập đều XEM được toàn bộ OKR (minh bạch). Quyền SỬA giới hạn theo vai trò & đơn vị: lãnh đạo quản OKR trong phạm vi đơn vị mình (gồm cấp dưới); ai cũng tạo/sửa OKR cá nhân của mình. Quản trị hệ thống (người dùng, tổ chức, kỳ) chỉ CEO/CFO.',
      },
    ],
  },
];

// ---- Tính năng hệ thống (dùng cho /guide + tooltip HelpTip) ----
export type Feature = {
  key: string;
  title: string;
  where: string; // vị trí trong app
  help: string; // câu ngắn cho tooltip
  detail: string; // mô tả đầy đủ cho trang guide
};

export const FEATURES: Feature[] = [
  {
    key: 'okr-cascade',
    title: 'OKR & liên kết (cascade)',
    where: 'Menu "OKR"',
    help: 'Cây mục tiêu Công ty → Khối → Phòng → Cá nhân, thu gọn/mở rộng từng cấp. Liên kết OKR con lên OKR cấp trên để đồng bộ hướng đi.',
    detail:
      'Trang OKR hiển thị toàn bộ mục tiêu trong kỳ dạng cây theo alignment. Mỗi nút CÓ cấp con hiện mũi tên ▸ để thu gọn/mở rộng (kèm số OKR con); có nút "Mở rộng tất cả / Thu gọn tất cả". Mặc định mở tới cấp Khối, thu gọn từ Phòng trở xuống cho dễ nhìn tổng thể. Mỗi cấp có màu viền + nhãn riêng (Công ty/Khối/Phòng/Cá nhân). Khi tạo OKR, chọn cấp, đơn vị, người chủ trì và "Liên kết lên" một OKR cấp trên để tạo dòng chảy chiến lược.',
  },
  {
    key: 'key-result',
    title: 'Key Result (kết quả then chốt)',
    where: 'Trang chi tiết OKR → "Kết quả then chốt"',
    help: 'Số đo của mục tiêu: bắt đầu → hiện tại → mục tiêu. Nhập tay hoặc gắn Nguồn KPI để tự cập nhật.',
    detail:
      'Mỗi Objective có 2–5 KR. Khai báo loại (số/phần trăm/tiền/có-không), hướng (càng cao/càng thấp càng tốt), mốc bắt đầu–hiện tại–mục tiêu và trọng số. Tiến độ tự tính và roll-up lên Objective.',
  },
  {
    key: 'checkin',
    title: 'Check-in tiến độ',
    where: 'Trang chi tiết OKR → mỗi KR → "Check-in / cập nhật"',
    help: 'Cập nhật giá trị KR hàng tuần + mức độ tự tin (xanh/vàng/đỏ) + ghi chú diễn biến.',
    detail:
      'Check-in định kỳ (khuyến nghị hàng tuần) ghi lại giá trị mới, độ tự tin và ghi chú. Lịch sử check-in lưu ở cuối trang chi tiết OKR để theo dõi xu hướng.',
  },
  {
    key: 'initiative',
    title: 'Dự án & Kế hoạch hành động (thực thi)',
    where: 'Trang chi tiết OKR → "Dự án & Kế hoạch hành động"',
    help: 'Cây Dự án → Tiểu dự án → Công việc, gắn KR + Khối/Phòng/cá nhân phụ trách. Bấm thẻ Kanban để sửa nhanh (popup). Tiến độ tự cuộn lên.',
    detail:
      'Một Objective/KR có thể được thực thi bằng công việc đơn HOẶC cả một dự án có cấu trúc. Cấu trúc 3 tầng: Dự án → Tiểu dự án → Công việc. Mỗi nút KHAI BÁO & LIÊN KẾT với Đơn vị phụ trách (Khối/Phòng ban) và người phụ trách (cá nhân), kèm hạn, ưu tiên, trạng thái (Chưa làm/Đang làm/Vướng/Xong/Huỷ), % hoàn thành và ngân sách. Tiến độ công việc TỰ CUỘN lên tiểu dự án → dự án. Phân quyền: người quản OKR (trưởng phòng trở lên trong phạm vi) tạo/giao/sửa/xoá; người ĐƯỢC GIAO tự cập nhật trạng thái + tiến độ việc của mình. Đây là tiến độ THỰC THI (output), tách khỏi tiến độ KẾT QUẢ đo bằng Key Result (outcome). Có 3 chế độ xem (nhớ lựa chọn): DANH SÁCH (cây phân cấp, thêm/sửa/giao), KANBAN (BẤM thẻ để mở popup sửa nhanh; kéo–thả thẻ giữa các cột trạng thái — chỉ sửa/kéo được việc bạn quản lý hoặc được giao), DÒNG THỜI GIAN (Gantt: thanh bắt đầu→hạn, vạch hôm nay, màu theo trạng thái; bấm để sửa).',
  },
  {
    key: 'projects',
    title: 'Dự án (xuyên nhiều OKR)',
    where: 'Menu "Dự án" · popup sửa việc → tick "Thuộc dự án"',
    help: 'Dự án là thực thể độc lập, gom công việc từ NHIỀU OKR/khối. Quản trị tập trung ở trang Dự án.',
    detail:
      'Khác với cây thực thi trong 1 OKR, "Dự án" là thực thể độc lập có thể gom công việc từ NHIỀU OKR và nhiều khối/phòng khác nhau (vd "Khai trương chuỗi cửa hàng Q3" chạm Bán lẻ + Marketing + Cung ứng). Tạo/sửa dự án ở menu "Dự án" (tên, chủ trì, đơn vị, trạng thái, mốc thời gian, ngân sách). Để gắn 1 công việc vào dự án: mở OKR → bấm việc → tick "🗂 Thuộc dự án" và chọn dự án (hoặc "＋ Dự án mới" để tạo & gắn ngay). Trang chi tiết dự án gom mọi việc theo OKR gốc, hiện % hoàn thành + ngân sách để quản trị theo dự án. Chỉ CEO/CFO · GĐ khối · Trưởng phòng được tạo dự án; ai cũng có thể gắn việc mình phụ trách vào dự án.',
  },
  {
    key: 'budget',
    title: 'Ngân sách gắn OKR',
    where: 'Trang chi tiết OKR → "Ngân sách" + mỗi kế hoạch hành động',
    help: 'Ngân sách kế hoạch vs thực chi cho từng việc; tổng hợp giải ngân theo Objective.',
    detail:
      'Mỗi kế hoạch hành động khai báo ngân sách kế hoạch và thực chi (VND). Hệ thống tổng hợp tỷ lệ giải ngân của cả Objective để CFO theo dõi chi tiêu gắn với mục tiêu.',
  },
  {
    key: 'kpi-auto',
    title: 'KPI tự động từ BigQuery',
    where: 'Tạo KR → "Nguồn KPI" · Quản trị → "Đồng bộ KPI"',
    help: 'KR gắn Nguồn KPI tự lấy KẾ HOẠCH (ĐHCĐ) làm mục tiêu + THỰC HIỆN làm giá trị hiện tại, theo kỳ.',
    detail:
      'Khi tạo KR, chọn Nguồn KPI (Doanh thu / Lợi nhuận gộp). Hệ thống tự điền mục tiêu = kế hoạch cả kỳ (bảng kế hoạch ĐHCĐ trên BigQuery) và giá trị hiện tại = thực hiện tới hôm nay (dữ liệu bán hàng), rồi tính tiến độ. Cron tự đồng bộ mỗi giờ (7–22h); CEO/CFO có thể bấm "Đồng bộ ngay" ở trang Quản trị.',
  },
  {
    key: 'import-export',
    title: 'Mã unique & Import/Export Excel',
    where: 'Trang OKR (Xuất Excel) · Quản trị → Import/Export (CEO/CFO)',
    help: 'Mỗi Objective/KR/Công việc có mã (BL-O1, BL-O1.KR1, BL-O1.H01). Xuất/nhập Excel theo mã.',
    detail:
      'Mọi mục có mã unique gắn mã khối: Objective = <KHỐI>-O<n>, Key Result = <objective>.KR<m>, Công việc = <objective>.H<kk>. Bấm "Xuất Excel" (trang OKR hoặc Quản trị) để tải file .xlsx gồm 3 sheet (Objectives, KeyResults, Initiatives). Sửa trực tiếp trên Excel/Google Sheets rồi CEO/CFO "Nhập Excel" ở Quản trị: hệ thống khớp theo cột Mã để cập nhật (tiêu đề, trạng thái, tiến độ, giá trị KR, ngày, ngân sách…); công việc để trống Mã (kèm Mã Objective) sẽ được tạo mới. Không dòng nào bị xoá khi nhập.',
  },
  {
    key: 'my',
    title: 'OKR & việc của tôi',
    where: 'Menu "Của tôi"',
    help: 'Gom OKR bạn chủ trì và các việc đang mở của bạn vào một chỗ.',
    detail:
      'Trang cá nhân hoá: các Objective bạn chủ trì trong kỳ + danh sách kế hoạch hành động đang mở do bạn phụ trách.',
  },
  {
    key: 'org',
    title: 'Cây tổ chức',
    where: 'Quản trị → "Cây tổ chức" (CEO/CFO)',
    help: 'Công ty → Khối → Phòng. Là khung để cấp & phân quyền OKR.',
    detail:
      'Quản lý cơ cấu tổ chức thật của BTMH. Đơn vị là nền cho việc gán OKR theo cấp và giới hạn quyền sửa theo phạm vi đơn vị.',
  },
  {
    key: 'roles',
    title: 'Người dùng & phân quyền',
    where: 'Quản trị → "Người dùng" (CEO/CFO)',
    help: 'Thêm bằng email Google, gán vai trò CEO/CFO · GĐ khối · Trưởng phòng · Nhân viên + đơn vị.',
    detail:
      'Chỉ người có trong danh sách mới đăng nhập được. Vai trò quyết định phạm vi quản trị OKR. Guard: không tự khoá/xoá mình, không xoá CEO/CFO cuối cùng.',
  },
  {
    key: 'periods',
    title: 'Kỳ OKR — khung thời gian nhiều cấp',
    where: 'Quản trị → "Kỳ OKR" (CEO/CFO); chọn kỳ ở trang OKR',
    help: 'Khung nhiều cấp: Chiến lược 2026–2030 → Năm → Quý → Tháng. Tuần/Ngày ở cấp công việc. Đặt "kỳ hiện tại" làm mặc định.',
    detail:
      'Kỳ có 4 cấp lồng nhau (gắn "kỳ cha" để tạo cây): Chiến lược nhiều năm (VD 2026–2030) → Năm → Quý → Tháng. Tuần/Ngày không tạo thành kỳ riêng mà nằm ở cấp CÔNG VIỆC (ngày bắt đầu/hạn + Gantt + check-in tuần). Objective có thể đặt ở bất kỳ cấp thời gian nào và liên kết (alignment) lên OKR cấp cao hơn để tạo dòng chảy chiến lược 5 năm → năm → quý. Trang OKR có bộ chọn kỳ (thả xuống theo cây) để xem từng cấp; mốc thời gian kỳ dùng để tính KPI kế hoạch/thực hiện theo đúng khoảng.',
  },
  {
    key: 'okr-type',
    title: 'Loại OKR: Cam kết / Khát vọng / Học hỏi',
    where: 'Tạo OKR → "Loại OKR"',
    help: 'Cam kết kỳ vọng ~100%; Khát vọng ~70% (đột phá); Học hỏi không ép điểm. Hiện badge trên OKR.',
    detail:
      'Đặt kỳ vọng đúng với bản chất mục tiêu. OKR cam kết là việc phải đạt; khát vọng là mục tiêu đột phá chấp nhận rủi ro; học hỏi ưu tiên khám phá. Loại OKR hiện dưới dạng nhãn màu ở trang chi tiết.',
  },
  {
    key: 'indicator',
    title: 'Nhãn chỉ số KR: Dẫn dắt / Kết quả',
    where: 'Thêm Key Result → "Loại chỉ số"',
    help: 'Kết quả (lagging) = đầu ra cuối; Dẫn dắt (leading) = hành động tạo ra kết quả. Nên 1 lagging + ≤3 leading.',
    detail:
      'Mỗi KR gắn nhãn Dẫn dắt hoặc Kết quả. Best practice: mỗi mục tiêu có 1 chỉ số kết quả + tối đa 3 chỉ số dẫn dắt. Trang chi tiết hiện cơ cấu (X kết quả · Y dẫn dắt) và cảnh báo nếu thiếu chỉ số kết quả hoặc quá nhiều dẫn dắt.',
  },
  {
    key: 'guardrail',
    title: 'Guardrail tập trung',
    where: 'Trang chi tiết OKR & danh sách OKR',
    help: 'Cảnh báo khi >5 KR/mục tiêu hoặc >5 OKR/người — nhắc giữ tập trung (không chặn).',
    detail:
      'Hệ thống nhắc nhẹ khi vượt ngưỡng khuyến nghị (≤5 KR mỗi Objective, ≤5 Objective mỗi người/kỳ) để tránh dàn trải. Đây là cảnh báo, không chặn thao tác.',
  },
  {
    key: 'reminder',
    title: 'Nhắc check-in tự động (email)',
    where: 'Quản trị → "Cài đặt · Nhắc check-in" (CEO/CFO)',
    help: 'Bật/tắt, chọn thứ gửi · ngưỡng ngày chưa check-in · người nhận. Có nút "Gửi thử ngay".',
    detail:
      'CEO/CFO cấu hình email nhắc: bật/tắt, gửi vào thứ mấy, ngưỡng số ngày KR chưa check-in, và người nhận (mọi người chủ trì hoặc từ trưởng phòng trở lên). Cron chạy 08:00 hằng ngày (giờ VN) và chỉ gửi vào đúng thứ đã chọn; người có KR trễ nhận email kèm danh sách + link. Nút "Gửi thử ngay" để kiểm tra ngay.',
  },
];

// ---- Lộ trình đề xuất (từ research best practice — chưa có, chờ CFO duyệt) ----
export type Roadmap = { title: string; why: string; ref: string };
export const ROADMAP: Roadmap[] = [
  {
    title: 'Điểm tự tin dạng số (1–10) + biểu đồ xu hướng tự tin/tiến độ',
    why: 'Tách "độ tự tin" khỏi "% tiến độ"; xu hướng giúp phát hiện KR sắp chệch để can thiệp sớm.',
    ref: 'Weekdone, Quantive',
  },
  {
    title: 'Digest lãnh đạo hằng tuần (tổng hợp trạng thái OKR toàn khối)',
    why: 'Lãnh đạo nắm nhanh KR rủi ro/chệch mà không cần mở từng OKR.',
    ref: 'Weekdone, WorkBoard',
  },
  {
    title: 'CFR nhẹ: bình luận & ghi nhận (recognition) trên OKR',
    why: 'Biến theo dõi mục tiêu thành đối thoại + phản hồi liên tục (mặt con người của OKR).',
    ref: 'What Matters (CFR)',
  },
  {
    title: 'Dashboard sức khoẻ OKR (RAG) + xuất báo cáo quý (PDF/deck)',
    why: 'Nhìn nhanh trạng thái toàn công ty; phục vụ họp Ban điều hành/HĐQT.',
    ref: 'Perdoo/WorkBoard, tái dùng hạ tầng deck.consultx.vn',
  },
  {
    title: 'Ngân sách tự đồng bộ thực chi từ pe_cf_budget',
    why: 'Thực chi cập nhật tự động thay vì nhập tay (cần quy ước ghép dòng ngân sách ↔ initiative).',
    ref: 'Nội bộ BTMH',
  },
];

export const GLOSSARY: { term: string; def: string }[] = [
  { term: 'Objective', def: 'Mục tiêu định tính, truyền cảm hứng, cho một kỳ.' },
  { term: 'Key Result (KR)', def: 'Kết quả then chốt — số đo được cho biết Objective đã đạt hay chưa.' },
  { term: 'Initiative', def: 'Kế hoạch hành động — có thể là công việc đơn hoặc cây Dự án → Tiểu dự án → Công việc để đạt KR.' },
  { term: 'Cascade / Alignment', def: 'Liên kết OKR cấp dưới lên OKR cấp trên để đồng bộ chiến lược.' },
  { term: 'Leading / Lagging', def: 'Chỉ số dẫn dắt (hành động) vs chỉ số kết quả (đầu ra cuối).' },
  { term: 'Confidence', def: 'Mức độ tự tin sẽ đạt KR — khác với % tiến độ hiện tại.' },
  { term: 'Committed / Aspirational', def: 'OKR cam kết (bắt buộc ~100%) vs khát vọng (~70%, đột phá).' },
  { term: 'ĐHCĐ', def: 'Phiên bản kế hoạch được Đại hội đồng cổ đông duyệt (dùng làm target KPI).' },
];

export type ChangeLog = { date: string; items: string[] };
export const CHANGELOG: ChangeLog[] = [
  {
    date: '31/07/2026 (chip ngữ cảnh có link + fix popup căn lề)',
    items: [
      'Việc hiển thị thông tin theo ngữ cảnh: trong Dự án → chip 🎯 Objective + 🔑 KR gốc (bấm mở); trong OKR → 🔑 KR + 🗂 Dự án (bấm mở). Ẩn cái hiển nhiên (không lặp tên dự án khi đang ở trong dự án).',
      'Bấm chip để nhảy tới Objective/KR/Dự án gốc; KR có neo cuộn tới đúng vị trí.',
      'Sửa popup sửa dự án bị căn phải (reset text-align cho mọi modal).',
    ],
  },
  {
    date: '31/07/2026 (trang dự án: sửa popup + việc List/Kanban/Gantt)',
    items: [
      'Trang chi tiết dự án: nút "✏️ Sửa dự án" ở đầu → popup (bỏ form sửa ở cuối trang).',
      'Việc thuộc dự án nay dùng chung List/Kanban/Dòng thời gian + bấm để sửa (như trong OKR).',
      'Mỗi việc hiện chip 🎯 OKR gốc để thấy dự án chạm những mục tiêu nào.',
    ],
  },
  {
    date: '31/07/2026 (nút lên đầu trang + seed dự án thực tế)',
    items: [
      'Thêm nút nổi "Lên đầu trang" (hiện khi cuộn xuống, cuộn mượt) ở mọi trang.',
      'Tạo sẵn 5 dự án thực tế (IPO, mở rộng NSO, 24K, chuyển đổi số, bán qua app NH) + gắn ~41 task liên quan.',
      'Sửa lỗi bộ chọn kỳ đè lên nút Xuất Excel (toolbar không còn ép giãn nút).',
    ],
  },
  {
    date: '31/07/2026 (bộ chọn kỳ mượt hơn)',
    items: [
      'Chọn kỳ ở trang OKR/Dự án: chọn là mở trang luôn (bỏ nút "Xem").',
      'Ô đã chọn hiển thị gọn, không thụt khoảng trắng; danh sách xổ ra vẫn thụt cấp theo cây.',
    ],
  },
  {
    date: '31/07/2026 (Dự án độc lập, xuyên nhiều OKR)',
    items: [
      'Thêm menu "Dự án": dự án là thực thể độc lập, gom công việc từ NHIỀU OKR/khối.',
      'Popup sửa việc có tick "🗂 Thuộc dự án" + chọn dự án (hoặc "＋ Dự án mới" tạo & gắn ngay).',
      'Trang chi tiết dự án gom việc theo OKR gốc + % hoàn thành + ngân sách; tạo/sửa/xoá dự án.',
      'Chỉ tasks thuộc dự án mới hiện tag dự án (trên thẻ Kanban + dòng danh sách).',
    ],
  },
  {
    date: '31/07/2026 (danh sách cũng bấm-để-sửa như Kanban)',
    items: [
      'View "Danh sách" nay gọn: mỗi dòng bấm để mở popup sửa (giống Kanban) — bỏ form sửa lộn xộn tại chỗ.',
      'Popup gồm cả "Thêm mục con" và "Xoá" (cho người quản lý) — quản trị dự án trọn vẹn trong 1 cửa sổ.',
    ],
  },
  {
    date: '31/07/2026 (popup sửa việc + gắn Khối/Phòng/cá nhân)',
    items: [
      'Kanban/Gantt: BẤM vào thẻ để mở popup sửa nhanh (tên, đơn vị, người giao, trạng thái, tiến độ, hạn, ngân sách).',
      'Dự án/công việc KHAI BÁO & LIÊN KẾT được Đơn vị phụ trách (Khối/Phòng ban) cạnh người phụ trách (cá nhân).',
      'Hiện đơn vị phụ trách trên thẻ Kanban + dòng danh sách; con kế thừa đơn vị của dự án cha.',
    ],
  },
  {
    date: '31/07/2026 (cây OKR thu gọn/mở rộng)',
    items: [
      'Cây OKR ở trang "OKR" nay thu gọn/mở rộng được từng cấp (mũi tên ▸, kèm số OKR con).',
      'Nút "Mở rộng tất cả / Thu gọn tất cả"; mặc định mở tới cấp Khối, thu gọn Phòng trở xuống.',
      'Chuẩn hoá hiển thị mỗi dòng: nhãn + viền màu theo cấp (Công ty/Khối/Phòng/Cá nhân), mã, tiến độ.',
    ],
  },
  {
    date: '31/07/2026 (mã unique + Import/Export Excel)',
    items: [
      'Mã unique theo khối: Objective BL-O1, Key Result BL-O1.KR1, Công việc BL-O1.H01.',
      'Xuất Excel (.xlsx) toàn bộ/kỳ ở trang OKR & Quản trị — 3 sheet Objectives/KeyResults/Initiatives.',
      'Nhập Excel (CEO/CFO): khớp theo Mã để cập nhật hàng loạt; công việc trống Mã → tạo mới.',
      'Điền toàn bộ OKR/KPI/kế hoạch hành động 2026 cho 17 khối từ bộ KHHĐ (Drive).',
    ],
  },
  {
    date: '31/07/2026 (khung thời gian nhiều cấp)',
    items: [
      'Kỳ OKR nhiều cấp: Chiến lược 2026–2030 → Năm → Quý → Tháng (gắn kỳ cha thành cây).',
      'Seed sẵn khung 2026–2030: 5 năm + Quý & Tháng của 2026; mặc định xem "Năm 2026".',
      'Bộ chọn kỳ ở trang OKR hiển thị theo cây; Tuần/Ngày nằm ở cấp công việc.',
    ],
  },
  {
    date: '31/07/2026 (quản trị dự án — đợt 2)',
    items: [
      'Bảng KANBAN kéo–thả: đổi trạng thái việc bằng cách kéo thẻ giữa các cột (tôn trọng phân quyền).',
      'DÒNG THỜI GIAN (Gantt): thanh thời gian bắt đầu→hạn, vạch "hôm nay", màu theo trạng thái, % hoàn thành.',
      'Bộ chuyển 3 chế độ xem Danh sách / Kanban / Dòng thời gian (nhớ lựa chọn của bạn).',
    ],
  },
  {
    date: '31/07/2026 (quản trị dự án — đợt 1)',
    items: [
      'Quản trị dự án gắn OKR: cây Dự án → Tiểu dự án → Công việc (thay bảng kế hoạch phẳng cũ).',
      'Tiến độ công việc tự cuộn lên tiểu dự án → dự án; ngân sách gộp theo nút lá (không cộng đôi).',
      'Phân quyền thực thi: trưởng phòng trở lên giao việc; nhân viên tự cập nhật trạng thái/tiến độ việc được giao.',
      'Đăng nhập gốc trên cả okr.consultx.vn và okr.vanthang.io.',
    ],
  },
  {
    date: '31/07/2026 (cập nhật)',
    items: [
      'Loại OKR: Cam kết / Khát vọng / Học hỏi (kỳ vọng điểm khác nhau).',
      'Nhãn chỉ số KR: Dẫn dắt (leading) / Kết quả (lagging) + cảnh báo cơ cấu.',
      'Guardrail tập trung: cảnh báo khi >5 KR/mục tiêu hoặc >5 OKR/người.',
      'Nhắc check-in tự động qua email — cấu hình ở Quản trị → Cài đặt.',
      'Giao diện thương hiệu BTMH (maroon/gold) + tối ưu mobile (menu hamburger).',
      'Footer bản quyền + link "Góp ý & đề xuất tính năng" (ideas.vanthang.io).',
    ],
  },
  {
    date: '31/07/2026',
    items: [
      'Ra mắt: OKR cascade Công ty→Khối→Phòng→Cá nhân, đăng nhập Google, 4 vai trò.',
      'Kế hoạch hành động (initiatives) + ngân sách gắn OKR.',
      'KPI tự động từ BigQuery (kế hoạch ĐHCĐ + thực hiện); cron đồng bộ mỗi giờ.',
      'Cây tổ chức thật BTMH (13 khối, 36 phòng).',
      'Trang Hướng dẫn sử dụng + tooltip trợ giúp (tự cập nhật theo hệ thống).',
    ],
  },
];

const HELP = new Map(FEATURES.map((f) => [f.key, f]));
export function helpFor(key: string): Feature | undefined {
  return HELP.get(key);
}
