// ============================================================================
// NGUỒN DUY NHẤT cho Hướng dẫn sử dụng + tooltip trợ giúp.
// Trang /guide và component HelpTip đều đọc từ đây. Phần cấu trúc (vai trò, cấp,
// KPI metric, kỳ, số đơn vị) được trang /guide render ĐỘNG từ code/DB → tự cập
// nhật khi hệ thống thay đổi. Khi THÊM tính năng: thêm 1 mục vào FEATURES +
// 1 dòng vào CHANGELOG (xem CLAUDE.md "Quy tắc cập nhật tài liệu").
// ============================================================================

export const GUIDE_VERSION = '2026-08-03.47';

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
    id: 'chuoi-lien-ket',
    title: '2. Khung liên kết chuẩn: Chiến lược → Thực thi',
    blocks: [
      {
        p: 'BTMH quản trị theo MỘT CHUỖI LIÊN KẾT thống nhất — để mọi việc hằng ngày truy ngược được về chiến lược, và mọi mục tiêu chiến lược đo được xuống tới cấp Phòng ban.',
      },
      {
        p: 'Chuỗi chuẩn gồm 6 lớp lồng nhau:',
        list: [
          'BSC (4 viễn cảnh): Tài chính · Khách hàng · Quy trình nội bộ · Học hỏi & Phát triển — lăng kính cân bằng của chiến lược.',
          'Mục tiêu chiến lược (cấp Công ty): điều muốn thắng trong 3–5 năm, gắn một viễn cảnh BSC.',
          'KRA — Khu vực kết quả trọng yếu: ai / đơn vị chịu trách nhiệm mảng kết quả nào (ở BTMH = các module chức năng, mỗi module một chủ).',
          'OKR = Objective + Key Results: mục tiêu có thời hạn + kết quả đo được; cascade xuống Khối → Phòng → Cá nhân.',
          'KPI: chỉ số đo — gắn vào KR để tự đo, hoặc theo dõi thường xuyên (sức khỏe vận hành). Tự động từ BigQuery nơi có sẵn, nhập tay nơi chưa có.',
          'Projects → Action Plans → Tasks: phần THỰC THI để đạt KR/KPI.',
        ],
      },
      {
        note: 'Sơ đồ: BSC → Mục tiêu chiến lược → KRA → OKR (Objective + KR) → { KPI · Dự án → Kế hoạch → Công việc }. "Bộ khung chuẩn" này là xương sống; hệ điều hành nội bộ (module chức năng, scorecard có trọng số, ngưỡng cảnh báo) là bản HIỆN THỰC HÓA cụ thể của lớp KRA + KPI cho BTMH.',
      },
      {
        p: 'Đo lường chạy HAI CHIỀU: MỤC TIÊU (target) chảy XUỐNG (Công ty → Khối → Phòng), THỰC HIỆN (actual) cuộn LÊN theo cách gộp của từng chỉ số. Tiến độ Công việc cuộn lên Dự án → KR → Objective.',
      },
      {
        p: 'Phân biệt hai loại "đo": KR đo KẾT QUẢ của một mục tiêu có thời hạn (điều muốn thay đổi); KPI đo SỨC KHỎE lặp lại của vận hành, có ngưỡng xanh/vàng/đỏ. Một KR có thể đặt mục tiêu TRÊN một KPI để không phải nhập số hai lần.',
      },
      {
        note: 'Calibration riêng của BTMH: đo BIÊN thật / lãi thật, KHÔNG đo doanh thu đơn thuần — vì doanh thu bị giá vàng chi phối, biên mỗi chỉ mới phản ánh "công" thật của chuỗi.',
      },
    ],
  },
  {
    id: 'okr-vs-kpi',
    title: '3. OKR vs KPI — chỉ số dẫn dắt & chỉ số kết quả',
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
    title: '4. Cách viết Objective & Key Result tốt',
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
    title: '5. OKR cam kết vs khát vọng',
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
    title: '6. Nhịp làm việc — check-in tuần, review quý',
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
    title: '7. Chấm điểm & tiến độ',
    blocks: [
      {
        p: 'Tiến độ mỗi KR tính từ (hiện tại − bắt đầu) / (mục tiêu − bắt đầu), kẹp 0–100%. Tiến độ Objective = bình quân theo trọng số các KR; không có KR thì lấy bình quân OKR con. Tiến độ tự "chảy ngược" lên: Cá nhân → Phòng → Khối → Công ty.',
      },
      { note: 'OKR cam kết đạt <100% nên có ghi chú lý do (dùng ô Check-in). Điểm không phải để phạt — để học và điều chỉnh.' },
    ],
  },
  {
    id: 'hanh-dong',
    title: '8. Dự án, Kế hoạch hành động & Ngân sách',
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
    title: '9. Phân quyền theo cây tổ chức',
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
  detail: string | string[]; // mô tả đầy đủ: chuỗi = 1 đoạn; mảng = danh sách gạch đầu dòng
};

export const FEATURES: Feature[] = [
  {
    key: 'okr-cascade',
    title: 'OKR & liên kết (cascade)',
    where: 'Menu "OKR"',
    help: 'Cây mục tiêu Công ty → Khối → Phòng → Cá nhân, thu gọn/mở rộng + BỘ LỌC (khối/phòng, cấp, trạng thái, loại, tìm kiếm).',
    detail:
      'Trang OKR hiển thị toàn bộ mục tiêu trong kỳ dạng cây theo alignment. Có THANH LỌC: tìm theo tên/mã/người chủ trì + lọc theo Khối/Phòng, Cấp, Trạng thái, Loại OKR — khi lọc sẽ hiện danh sách kết quả khớp (kèm số lượng), bỏ lọc để về lại cây. Mỗi nút CÓ cấp con hiện mũi tên ▸ để thu gọn/mở rộng (kèm số OKR con); có nút "Mở rộng tất cả / Thu gọn tất cả". Mặc định mở tới cấp Khối, thu gọn từ Phòng trở xuống. Khi tạo OKR, chọn cấp, đơn vị, người chủ trì và "Liên kết lên" một OKR cấp trên để tạo dòng chảy chiến lược.',
  },
  {
    key: 'bsc',
    title: 'Viễn cảnh BSC (Balanced Scorecard)',
    where: 'Tạo/chi tiết OKR → "Viễn cảnh BSC" · Bảng điều khiển → "Tiến độ theo Viễn cảnh BSC"',
    help: 'Gắn mỗi OKR Công ty/Khối vào 1 trong 4 viễn cảnh: Tài chính · Khách hàng · Quy trình nội bộ · Học hỏi & Phát triển — để đọc chiến lược cân bằng.',
    detail: [
      'BSC (Balanced Scorecard) là lăng kính cân bằng của chiến lược, chia mục tiêu thành 4 viễn cảnh: 💰 Tài chính · 🛍️ Khách hàng · ⚙️ Quy trình nội bộ · 🎓 Học hỏi & Phát triển.',
      'Gắn viễn cảnh cho OKR khi tạo mới, hoặc bấm "Viễn cảnh BSC" ở đầu trang chi tiết OKR (người quản OKR) để đặt/đổi.',
      'Bảng điều khiển hiện "Tiến độ theo Viễn cảnh BSC" — bình quân tiến độ các OKR theo từng viễn cảnh, để nhìn công ty có đang cân bằng cả 4 mặt hay lệch về một phía.',
      'Đây là lớp trên cùng của chuỗi liên kết chuẩn (xem mục "Khung liên kết chuẩn"): BSC → Mục tiêu chiến lược → KRA → OKR → KPI/Thực thi.',
    ],
  },
  {
    key: 'align-map',
    title: 'Bản đồ liên kết chiến lược',
    where: 'Menu "Bản đồ"',
    help: 'Toàn cảnh chuỗi BSC → Mục tiêu → Kết quả then chốt → KPI; kéo–thả mục tiêu để gắn viễn cảnh, mở ⚙ để đặt cấp trên & gắn KPI.',
    detail: [
      'Trang "Bản đồ" xếp toàn bộ mục tiêu trong kỳ theo 5 làn: 4 viễn cảnh BSC (💰 Tài chính · 🛍️ Khách hàng · ⚙️ Quy trình nội bộ · 🎓 Học hỏi & Phát triển) + "Chưa gắn viễn cảnh".',
      'Mỗi thẻ mục tiêu hiển thị mã, cấp, người chủ trì, tiến độ, OKR cấp trên (cascade), và danh sách Key Result kèm trạng thái GẮN KPI — nhìn 1 chỗ thấy cả chuỗi liên kết.',
      'KÉO–THẢ (chuột hoặc chạm) thẻ mục tiêu (nắm ở biểu tượng ⠿) sang làn viễn cảnh khác để gắn BSC ngay.',
      'Bấm ⚙ "Liên kết" trên thẻ để đặt Viễn cảnh BSC, chọn OKR cấp trên (cascade — tự chặn vòng lặp), và gắn KPI cho từng KR. Chỉ mục tiêu bạn có quyền sửa mới kéo/chỉnh được.',
      'Dùng bản đồ này để THIẾT LẬP và soát nhanh sự liền mạch chiến lược → thực thi trên toàn công ty.',
    ],
  },
  {
    key: 'company-strategy',
    title: 'Chiến lược công ty (điểm khởi đầu)',
    where: 'Menu "Chiến lược"',
    help: 'Khai báo Tầm nhìn · Sứ mệnh · Giá trị cốt lõi · Khát vọng + Trụ cột chiến lược (OKR nhiều năm) — TRƯỚC khi cascade OKR.',
    detail: [
      'Theo phương pháp luận, chiến lược được khai báo TRƯỚC: Tầm nhìn (Vision) · Sứ mệnh (Mission) · Giá trị cốt lõi · Khát vọng/định vị · chân trời chiến lược (vd 2026–2030). CEO/CFO nhập tại trang "Chiến lược" (mục "Khai báo/sửa chiến lược").',
      'TRỤ CỘT CHIẾN LƯỢC = các Mục tiêu cấp Công ty thuộc kỳ "Chiến lược nhiều năm" (multiyear). Mỗi OKR Công ty hằng năm sẽ "Liên kết lên" một trụ cột → tạo dòng chảy Chiến lược → OKR năm → Khối/Phòng.',
      'Trang này hiện sơ đồ chuỗi (Chiến lược → BSC → OKR → KRA → KPI/Thực thi) + 4 viễn cảnh BSC + danh sách trụ cột kèm tiến độ — là "kim chỉ nam" cho toàn hệ thống.',
    ],
  },
  {
    key: 'strategy-map',
    title: 'Sơ đồ chiến lược BSC (Strategy Map)',
    where: 'Menu "Bản đồ" → tab "Sơ đồ chiến lược BSC"',
    help: '4 tầng Balanced Scorecard xếp theo quan hệ nhân-quả: Học hỏi → Quy trình → Khách hàng → Tài chính.',
    detail: [
      'Sơ đồ chiến lược kinh điển của BSC: nền móng (Học hỏi & Phát triển) thúc đẩy Quy trình nội bộ → tạo giá trị Khách hàng → dẫn tới kết quả Tài chính. Mũi tên hướng lên thể hiện chuỗi nhân-quả.',
      'Mỗi tầng liệt kê các OKR thuộc viễn cảnh đó kèm tiến độ; bấm vào một OKR để mở chi tiết. Đọc từ dưới lên để thấy chiến lược được "xây" như thế nào.',
      'Chuyển qua lại giữa "Liên kết (kéo–thả)" và "Sơ đồ chiến lược BSC" bằng tab ở đầu trang Bản đồ.',
    ],
  },
  {
    key: 'review',
    title: 'Họp điều hành (WBR/MBR)',
    where: 'Menu "Họp điều hành"',
    help: 'Trang tổng hợp trạng thái để họp: nhịp độ, Nhận định & Khuyến nghị, tiến độ Khối, KPI cảnh báo, OKR cần chú ý, việc quá hạn.',
    detail: [
      'Một trang duy nhất tổng hợp mọi thứ cần cho cuộc họp điều hành tuần/tháng: nhịp độ công ty vs thời gian, độ phủ check-in, số KPI cảnh báo & việc quá hạn.',
      'Có panel "Nhận định & Khuyến nghị" tự sinh theo quy tắc, bảng tiến độ theo Khối, tiến độ theo Viễn cảnh BSC, danh sách KPI cần can thiệp, OKR tiến độ thấp và việc quá hạn.',
      'Mở ra là họp được ngay; số liệu tự cập nhật theo dữ liệu hiện tại.',
    ],
  },
  {
    key: 'insights',
    title: 'Nhận định & Khuyến nghị tự sinh',
    where: 'Bảng điều khiển & Họp điều hành',
    help: 'Hệ thống tự đọc số liệu và nêu Quan sát → Hàm ý → Khuyến nghị theo mức Ổn/Theo dõi/Rủi ro.',
    detail: [
      'Theo quy tắc, hệ thống tự phát hiện điểm đáng chú ý: nhịp độ nhanh/chậm, độ phủ check-in thấp, KPI vượt ngưỡng, điểm hở alignment, sức khỏe OKR yếu, việc quá hạn.',
      'Mỗi nhận định trình bày 3 lớp: Quan sát (số liệu) → Hàm ý (ý nghĩa điều hành) → Khuyến nghị (việc nên làm), gắn màu theo mức độ.',
    ],
  },
  {
    key: 'okr-health',
    title: 'Điểm sức khỏe OKR',
    where: 'Bảng điều khiển → "Sức khỏe OKR"',
    help: 'Chấm mỗi OKR theo 7 tiêu chí best-practice (chủ trì, KR, KR lagging, cascade, thực thi, check-in, gắn KPI).',
    detail: [
      'Mỗi OKR được chấm 0–100 theo 7 tiêu chí: có người chủ trì (20) · có KR (20) · có ≥1 KR đo kết quả lagging (10) · đã cascade cha/con (15) · có việc thực thi (15) · có check-in gần đây (10) · KR gắn KPI (10).',
      'Bảng điều khiển hiện điểm trung bình + phân bố tốt/khá/yếu + hạng mục còn thiếu nhiều nhất → biết cần bổ sung gì để chuẩn hóa OKR.',
    ],
  },
  {
    key: 'integrity',
    title: 'Cảnh báo toàn vẹn alignment',
    where: 'Bảng điều khiển → thẻ "⚠ Cảnh báo toàn vẹn alignment"',
    help: 'Tự soi các lỗ hổng trong chuỗi chiến lược → thực thi để bịt kịp thời.',
    detail: [
      'Hệ thống tự kiểm và đếm các "lỗ hổng" trong kỳ: OKR chưa có chủ trì · OKR Công ty/Khối chưa cascade xuống · Key Result chưa có việc thực thi · KPI thiếu chủ/đơn vị · KPI (có trọng số) chưa có số · Dự án chưa gắn công việc.',
      'Chỉ hiện mục còn vấn đề (count > 0) — mục nào sạch thì ẩn. Bịt hết = chuỗi chiến lược→thực thi liền mạch.',
    ],
  },
  {
    key: 'kr-kpi-link',
    title: 'Gắn Key Result với KPI thư viện',
    where: 'Trang chi tiết OKR → mỗi KR → "Gắn KPI"',
    help: 'KR lấy số (mục tiêu/thực hiện) thẳng từ một KPI trong Thư viện — khỏi nhập trùng.',
    detail: [
      'Chọn một KPI từ Thư viện gắn vào KR; hệ thống tự KÉO SỐ từ giá trị KPI ở đúng kỳ + đơn vị của OKR (Scorecard) vào KR (mục tiêu + thực hiện) và tính lại tiến độ.',
      'Nhờ vậy "đo" (KPI) và "làm" (OKR/Key Result) là một — không nhập hai lần, số luôn khớp giữa Scorecard và OKR.',
      'Bấm lại "Gắn & lấy số" để đồng bộ số mới nhất; chọn "— Không —" để gỡ liên kết.',
    ],
  },
  {
    key: 'kpi-scorecard',
    title: 'Scorecard KPI (đo đa cấp)',
    where: 'Menu "KPI"',
    help: 'Đo target vs thực hiện của KPI theo Công ty → Khối → Phòng, ngưỡng Watch/Alert/Escalate, chấm điểm theo trọng số 3 tầng.',
    detail: [
      'Chọn kỳ + đơn vị (Công ty / Khối / Phòng) + viễn cảnh để xem bảng KPI: mục tiêu, thực hiện, % đạt, trạng thái cảnh báo.',
      'Trạng thái W/A/E tự tính theo hướng tốt & ngưỡng của KPI: Ổn (xanh) · Theo dõi/Cảnh báo (vàng/cam) · Khẩn (đỏ).',
      'Điểm scorecard = Σ trọng số × min(% đạt, 100%) trên các KPI đã có đủ mục tiêu + thực hiện — ra điểm/tổng-trọng-số (vd 72/100).',
      'Nhập số: người có năng lực "Nhập số KPI" (kpi.input) nhập mục tiêu/thực hiện TRONG phạm vi đơn vị mình; người khác chỉ xem.',
      'KPI nguồn tự động (BigQuery/Postgres) sẽ được điền số qua đồng bộ (bước sau); nơi chưa có nguồn thì nhập tay tại đây.',
    ],
  },
  {
    key: 'kpi-library',
    title: 'Thư viện KPI',
    where: 'Quản trị → "Thư viện KPI" (cần năng lực Quản lý Thư viện KPI)',
    help: 'Khai báo chỉ số đo dùng lại cho toàn hệ thống — nguồn tự động/nhập tay, ngưỡng W/A/E, module (KRA), tầng & trọng số, chủ sở hữu.',
    detail: [
      'Thư viện KPI là NGUỒN DUY NHẤT định nghĩa mọi chỉ số đo — khai một lần, dùng lại cho nhiều OKR/đơn vị và đo ở nhiều cấp (Scorecard).',
      'Mỗi KPI mang đủ thuộc tính phục vụ cả lens BSC lẫn scorecard vận hành: viễn cảnh BSC · module (KRA = 1 trong 12 module Control Tower) · tầng (Kết quả/Động cơ/Bộ máy) + trọng số điểm · hướng tốt · cách gộp lên cấp trên.',
      'Nguồn dữ liệu: 🟢 tự động (BigQuery/Postgres — điền số tự động) hoặc 🟡 nhập tay (khai trên Scorecard). Nơi chưa có nguồn thì nhập tay trước, tự động hoá dần.',
      '3 ngưỡng cảnh báo Watch / Alert / Escalate: khi actual vượt ngưỡng sẽ đổi màu & bật cảnh báo trên Scorecard (vd DIO Watch >35 · Alert >45 · Escalate >60).',
      'Mỗi KPI gắn 2 vai trò: business owner (người tạo kết quả) và measurement owner (người đo) + đơn vị chủ — bảo đảm mọi KPI luôn có người chịu trách nhiệm ở từng cấp.',
      'Phân quyền: năng lực "Quản lý Thư viện KPI" (kpi.manage) mới khai báo/sửa/xoá; "Nhập số KPI" (kpi.input) để nhập target/actual trong phạm vi đơn vị — chỉnh ở Phân quyền.',
    ],
  },
  {
    key: 'key-result',
    title: 'Key Result (kết quả then chốt)',
    where: 'Trang chi tiết OKR → "Kết quả then chốt"',
    help: 'Số đo của mục tiêu: bắt đầu → hiện tại → mục tiêu. Nhập tay hoặc gắn Nguồn KPI để tự cập nhật.',
    detail:
      'Mỗi Objective có 2–5 KR. Khai báo loại (số/phần trăm/tiền/có-không), hướng (càng cao/càng thấp càng tốt), mốc bắt đầu–hiện tại–mục tiêu và trọng số. Tiến độ tự tính và roll-up lên Objective. SỬA/XOÁ KR: ai có quyền Sửa OKR (xem "Phân quyền OKR") sẽ thấy nút "✏️ Sửa KR" cạnh mỗi KR → popup sửa toàn bộ trường + "🗑 Xoá KR" (có xác nhận). KR gắn nguồn KPI tự động thì loại/đơn vị/mốc/giá trị do đồng bộ BigQuery quản (khoá sửa tay).',
  },
  {
    key: 'checkin',
    title: 'Check-in tiến độ',
    where: 'Trang chi tiết OKR → mỗi KR → "Check-in / cập nhật"',
    help: 'Cập nhật giá trị KR hàng tuần + mức độ tự tin (xanh/vàng/đỏ) + ghi chú diễn biến.',
    detail:
      'Check-in định kỳ (khuyến nghị hàng tuần) ghi lại giá trị mới, độ tự tin và ghi chú. Lịch sử check-in lưu ở cuối trang chi tiết OKR để theo dõi xu hướng. QUYỀN sửa/xoá: quản lý (CEO/CFO hoặc lead quản OKR) sửa + xoá bất kỳ lúc nào; người dùng thường chỉ được SỬA của mình trong 3 giờ kể từ lúc đăng và KHÔNG được xoá. Bình luận (Thảo luận) áp cùng quy tắc này.',
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
    key: 'tasks',
    title: 'Công việc (toàn hệ thống)',
    where: 'Menu "Công việc"',
    help: 'Liệt kê MỌI dự án/tiểu dự án/công việc từ tất cả OKR & dự án, đầy đủ bộ lọc + sắp xếp theo cột + header đóng băng khi cuộn. Chỉ hiện việc bạn được phép xem.',
    detail: [
      'Một bảng duy nhất gom toàn bộ công việc (dự án → tiểu dự án → công việc) từ mọi OKR, Key Result và Dự án.',
      'Tổng quan đầu trang: cơ cấu trạng thái + số việc quá hạn.',
      'Đầy đủ bộ lọc: tìm kiếm (tên/mã/OKR/dự án), Phụ trách, Đơn vị, OKR, Dự án, Trạng thái, Ưu tiên, Loại, Kỳ, "⚠ Quá hạn" và "👤 Việc của tôi".',
      'Bấm tiêu đề cột để sắp xếp (bấm lại đổi chiều); header cột đóng băng khi cuộn cả trang. Mỗi dòng liên kết thẳng tới OKR/dự án gốc.',
      'Bấm vào một dòng để mở cửa sổ cập nhật / sửa / xoá công việc (theo phân quyền của bạn).',
      'Phân quyền XEM (need-to-know): cây OKR vẫn minh bạch cho mọi người, nhưng bảng công việc chỉ hiện việc bạn CÓ LIÊN QUAN — bạn được giao, bạn giao/tạo, bạn chủ trì OKR chứa việc, bạn là thành viên dự án (chủ trì hoặc có việc trong dự án đó), hoặc việc thuộc phạm vi đơn vị bạn quản (Giám đốc khối/Trưởng phòng thấy toàn bộ đơn vị mình + cấp dưới).',
      'CEO/CFO và nhóm có năng lực "Toàn phạm vi" (chỉnh ở Phân quyền) xem tất cả.',
    ],
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
  {
    key: 'dashboard',
    title: 'Bảng điều khiển',
    where: 'Menu "Bảng điều khiển"',
    help: 'Tổng quan trực quan: tiến độ vs nhịp độ, phân bố KR, trạng thái việc, tiến độ theo khối.',
    detail:
      'Trang chủ tóm tắt sức khỏe OKR toàn công ty theo kỳ hiện tại bằng BIỂU ĐỒ để nắm insight nhanh: (1) donut Tiến độ công ty kèm "nhịp độ" — so tiến độ với % thời gian kỳ đã trôi để biết đang DẪN hay CHẬM nhịp; (2) donut phân bố tiến độ KR (đạt/đúng hướng/cần chú ý/chưa khởi động); (3) donut trạng thái công việc + số việc quá hạn; (4) thanh xếp hạng tiến độ theo Khối. Trong trang chi tiết OKR, mỗi KR có đường "xu hướng tiến độ" (sparkline) theo các lần check-in; trang Dự án có thanh tổng quan trạng thái việc.',
  },
  {
    key: 'codes',
    title: 'Mã tự sinh (O / KR / H / Dự án)',
    where: 'Mọi Objective/Key Result/Công việc/Dự án',
    help: 'Mã tự sinh theo thứ tự, tự gán, unique và KHÔNG BAO GIỜ dùng lại (kể cả sau khi xoá).',
    detail:
      'Mỗi mục có mã unique tự sinh: Objective <KHỐI>-O<n>, Key Result <obj>.KR<m>, Công việc <obj>.H<kk>, Dự án PRJ-<nn>. Mã cấp theo BỘ ĐẾM BỀN (sequence) cho từng phạm vi, tăng đơn điệu và KHÔNG tái sử dụng số đã cấp — kể cả khi bạn xoá một mục (tránh trùng nghĩa trong báo cáo/Excel đã gửi). Nhờ vậy một mã luôn trỏ về đúng một mục duy nhất theo thời gian. Mã dùng để import/export Excel khớp theo cột Mã.',
  },
  {
    key: 'comment',
    title: 'Thảo luận & @nhắc tên',
    where: 'Mỗi Objective / Key Result / Công việc → "💬 Thảo luận"',
    help: 'Bình luận, trả lời, @gắn thẻ đồng nghiệp. Người được nhắc nhận thông báo + email (tuỳ chọn).',
    detail:
      'Mỗi Objective, Key Result và Công việc đều có khu thảo luận: viết bình luận, trả lời theo luồng, sửa/xoá bình luận của mình. Gõ tên vào ô "Gắn thẻ" để @nhắc đồng nghiệp — người được nhắc (và người có bình luận được trả lời) sẽ nhận thông báo trong chuông 🔔 và email (nếu bật). Giúp trao đổi bám sát ngay tại mục tiêu/việc, không tản mát qua chat.',
  },
  {
    key: 'notifications',
    title: 'Thông báo (chuông 🔔)',
    where: 'Biểu tượng 🔔 góc phải · trang "Thông báo"',
    help: 'Số chưa đọc ở chuông; bấm xem danh sách, mở tới đúng mục. Bật/tắt email khi được nhắc.',
    detail:
      'Chuông 🔔 cạnh tên bạn hiện số thông báo chưa đọc (tự làm mới). Trang Thông báo liệt kê ai đã nhắc/trả lời bạn, bấm vào để mở đúng Objective/KR/Công việc và tự đánh dấu đã đọc. Có nút "Đánh dấu tất cả đã đọc" và tuỳ chọn "Nhận email khi có người nhắc/trả lời" (mỗi người tự bật/tắt).',
  },
  {
    key: 'admin',
    title: 'Quản trị hệ thống',
    where: 'Menu "Quản trị" (chỉ CEO/CFO)',
    help: 'Cây tổ chức, người dùng & phân quyền, kỳ OKR, đồng bộ KPI, import/export, nhắc check-in.',
    detail:
      'Khu vực dành cho CEO/CFO: quản lý cây tổ chức (Khối/Phòng), người dùng & vai trò, kỳ OKR (khung thời gian nhiều cấp), đồng bộ KPI từ BigQuery, Import/Export Excel và cấu hình nhắc check-in. Các thao tác thay đổi cấu trúc hệ thống đều nằm ở đây.',
  },
  {
    key: 'okr-perms',
    title: 'Phân quyền: Nhóm quyền × Năng lực',
    where: 'Quản trị → "Phân quyền"; gán nhóm cho user ở "Người dùng"',
    help: 'Mỗi Nhóm quyền gồm một bộ Năng lực; gán nhóm cho từng người. Danh sách năng lực tự mở rộng khi thêm tính năng.',
    detail:
      'Hai tầng: (A) VAI TRÒ tổ chức (CEO/CFO · GĐ khối · Trưởng phòng · Nhân viên) quyết định PHẠM VI (đụng OKR đơn vị nào). (B) NHÓM QUYỀN quyết định NĂNG LỰC (được làm gì). 5 nhóm mặc định: 🛡️ Quản trị hệ thống (toàn quyền) · ⭐ Quản trị OKR (mọi OKR, toàn phạm vi) · 👔 Quản lý (tạo/sửa OKR trong phạm vi) · ✍️ Cộng tác (check-in/bình luận của mình, sửa trong 3h; tự quản OKR cá nhân) · 👁️ Người xem. CEO/CFO LUÔN toàn quyền. Năng lực OKR (Tạo/Sửa/Xoá) áp trong phạm vi tổ chức, trừ khi có năng lực "Toàn phạm vi". "Sổ năng lực" là nguồn duy nhất — thêm tính năng cần phân quyền chỉ cần thêm 1 năng lực, trang Phân quyền TỰ hiện toggle cho mọi nhóm. Chỉ người có năng lực "Phân quyền người dùng" (CEO/CFO + Quản trị hệ thống) mới gán được nhóm cho người khác. Phân quyền áp cả ở giao diện lẫn máy chủ.',
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
    date: '03/08/2026 (Trang Chiến lược: chuỗi & 4 viễn cảnh bấm được)',
    items: [
      'Sơ đồ chuỗi trên trang Chiến lược nay BẤM ĐƯỢC từng bước: Chiến lược→#Trụ cột · BSC→Sơ đồ BSC · OKR→Sơ đồ flow · KRA/KR→OKR · KPI/Dự án/Công việc→trang tương ứng.',
      '4 box viễn cảnh BSC bấm để nhảy tới đúng tầng trên Sơ đồ chiến lược BSC (/map?v=strategy#smap-<viễn cảnh>).',
    ],
  },
  {
    date: '02/08/2026 (Tinh chỉnh mũi tên sơ đồ flow)',
    items: [
      'Sửa đầu mũi tên bị lệch: cố định chiều cao node (120px) để mũi tên khớp đúng TÂM cạnh trái node; màu mũi tên khớp màu đường nối.',
    ],
  },
  {
    date: '02/08/2026 (Kéo–thả BSC + box apex bao trùm trên sơ đồ)',
    items: [
      'Sơ đồ chiến lược BSC nay KÉO–THẢ được: kéo tay nắm ⠿ để chuyển OKR sang tầng viễn cảnh khác (Tài chính/Khách hàng/Quy trình/Học hỏi).',
      'Sơ đồ liên kết (flow) hiện OKR CHA khác kỳ (trụ cột chiến lược) làm node APEX bao trùm — vd "Thương hiệu vàng Quốc dân" (CTY-O11) đứng trên 5 OKR Công ty 2026 đã cascade lên nó. Cột bố trí "hybrid" để cha luôn nằm trái con dù cùng cấp.',
    ],
  },
  {
    date: '02/08/2026 (Tầm nhìn/Sứ mệnh mới + Lộ trình 2026–2030 + OKR "Thương hiệu vàng Quốc dân")',
    items: [
      'Cập nhật Tầm nhìn ("Thương hiệu vàng Quốc dân" — doanh thu lớn nhất VN, dẫn dắt vàng 24K) và Sứ mệnh theo bộ nhận diện BTMH.',
      'Trang Chiến lược thêm "Lộ trình chiến lược 2026–2030": cột mốc từng năm (vị thế · khách hàng · vốn hoá · số cửa hàng — số CH lấy theo Financial Model v52.1: 80·159·208·241·261).',
      'Thêm Objective cấp Công ty đến 2030 "Thương hiệu vàng Quốc dân" (CTY-O11) + 4 KR: khách hàng 6,5tr · vốn hoá ~2,2 tỷ USD · Top 1 thị phần 24K · công nhận thương hiệu quốc dân.',
    ],
  },
  {
    date: '02/08/2026 (Sơ đồ liên kết — layout cây gọn + bộ lọc)',
    items: [
      'Bố cục lại kiểu "tidy-tree": node cha canh giữa các con, cột theo cấp (Công ty→Khối→Phòng) → gọn & chuyên nghiệp kể cả khi nhiều OKR.',
      'Thêm bộ lọc: chọn LỚP hiển thị (Công ty · +Khối · +Phòng · Tất cả), "Xem nhánh" để chỉ hiện 1 nhánh OKR, "Mở tất cả/Thu gọn tất cả" và nút ± gập/mở nhánh con trên từng node. Tự "vừa khung" khi đổi bộ lọc.',
    ],
  },
  {
    date: '02/08/2026 (Sơ đồ liên kết dạng flow-chart)',
    items: [
      'Bản đồ chiến lược thêm view "🕸️ Sơ đồ liên kết (flow)": các OKR là node xếp theo cột cấp (Công ty → Khối → Phòng → Cá nhân), đường nối cha→con thể hiện cascade — kiểu mindmap/flow-chart.',
      'Tương tác: kéo NỀN để di chuyển, lăn chuột/nút để zoom & "Vừa khung", kéo tay nắm ⠿ để dời node (nhớ vị trí ở trình duyệt), KÉO chấm ● từ node cha thả vào node con để NỐI cascade, bấm đường nối để gỡ — chỉ với OKR mình được sửa (chống tạo vòng).',
    ],
  },
  {
    date: '02/08/2026 (Menu gọn + trace-back cảnh báo)',
    items: [
      'Menu desktop gom thành CỤM DROPDOWN (Tổng quan · Chiến lược & Đo lường · Thực thi · Cá nhân · Quản trị) — thanh menu gọn 1 hàng, chuyên nghiệp; mobile giữ menu hamburger phân nhóm.',
      'Cảnh báo "Toàn vẹn alignment" nay BẤM ĐƯỢC → trang chi tiết /integrity liệt kê ĐÍCH DANH từng OKR/KR/KPI/Dự án còn lỗ hổng + link tới trang chi tiết (trace-back). Nguyên tắc: mọi con số cảnh báo/tổng hợp đều truy vết được về danh sách gốc.',
    ],
  },
  {
    date: '02/08/2026 (Chiến lược công ty — điểm khởi đầu của chuỗi)',
    items: [
      'Trang mới "Chiến lược": khai báo Tầm nhìn · Sứ mệnh · Giá trị cốt lõi · Khát vọng · chân trời chiến lược (CEO/CFO) — TRƯỚC khi cascade OKR, đúng phương pháp luận.',
      'Hiện sơ đồ chuỗi (Chiến lược → BSC → OKR → KRA → KPI/Thực thi) + 4 viễn cảnh BSC + Trụ cột chiến lược (OKR nhiều năm) kèm tiến độ. Menu "Chiến lược".',
    ],
  },
  {
    date: '02/08/2026 (Sửa tràn ngang trên mobile)',
    items: [
      'Chặn tràn ngang cấp trang (body overflow-x:clip) + cho chuỗi kỹ thuật dài trong Hướng dẫn tự xuống dòng → trang luôn vừa bề rộng máy, banner phủ đủ chiều ngang.',
    ],
  },
  {
    date: '02/08/2026 (Sơ đồ chiến lược BSC + Xuất Scorecard Excel)',
    items: [
      'Bản đồ có thêm tab "Sơ đồ chiến lược BSC" (Strategy Map): 4 tầng nhân-quả Học hỏi → Quy trình → Khách hàng → Tài chính, mỗi tầng liệt kê OKR + tiến độ.',
      'Nút "Xuất Excel" ở Scorecard KPI: tải bảng KPI (mục tiêu/thực hiện/% đạt/trạng thái) theo kỳ & đơn vị đang lọc.',
    ],
  },
  {
    date: '02/08/2026 (Bản tin điều hành tuần + cảnh báo KPI qua email)',
    items: [
      'Bản tin điều hành tuần: email tóm tắt (nhịp độ · Nhận định & Khuyến nghị · KPI cảnh báo/khẩn · việc quá hạn · sức khỏe OKR) gửi Ban lãnh đạo; nút "Gửi bản tin ngay" ở Quản trị + cron n8n hằng tuần.',
    ],
  },
  {
    date: '02/08/2026 (Họp điều hành + Nhận định/Khuyến nghị + Sức khỏe OKR)',
    items: [
      'Trang mới "Họp điều hành" (WBR/MBR): tổng hợp nhịp độ, tiến độ Khối, viễn cảnh BSC, KPI cảnh báo, OKR cần chú ý, việc quá hạn — mở ra là họp được (in đẹp).',
      'Panel "Nhận định & Khuyến nghị" tự sinh (Quan sát → Hàm ý → Khuyến nghị) trên Bảng điều khiển & Họp điều hành.',
      '"Điểm sức khỏe OKR": chấm mỗi OKR theo 7 tiêu chí best-practice + hiện điểm TB/phân bố/hạng mục còn thiếu.',
    ],
  },
  {
    date: '02/08/2026 (Auto-fill Nhóm A: 6 KPI vận hành từ BigQuery)',
    items: [
      'Thêm 6 KPI vận hành (BAU, trọng số 0) tự lấy số THỰC HIỆN từ BigQuery theo công thức đã kiểm chứng: Doanh thu · Số hóa đơn · Sản lượng mua vào (chỉ) · Giá trị mua vào · Tồn kho (giá trị) · Tồn kho (chỉ).',
      'Chạy theo cron đồng bộ KPI hằng giờ; cấp Công ty, kỳ hiện tại. Không xáo trộn 16 KPI scorecard trọng số 100.',
    ],
  },
  {
    date: '02/08/2026 (Sắp xếp lại menu + gọn giao diện desktop)',
    items: [
      'Menu sắp theo dòng chảy hợp lý: Tổng quan → Chiến lược & Đo lường (Bản đồ · OKR · KPI) → Thực thi (Dự án · Công việc) → Cá nhân → Trợ giúp, có vạch ngăn nhóm (desktop) & nhãn nhóm (mobile).',
      'Thanh tiến độ (Viễn cảnh BSC / theo Khối) không còn kéo dài quá khổ trên màn hình rộng: giới hạn bề rộng + đặt 2 thẻ cạnh nhau → gọn, dễ đọc.',
      'Lược bỏ các câu chú thích kỹ thuật/nội bộ khỏi giao diện người dùng cho sạch.',
    ],
  },
  {
    date: '02/08/2026 (Bản đồ: sửa cắt chữ trên mobile + tự cuộn khi kéo)',
    items: [
      'Sửa lỗi thẻ mục tiêu bị CẮT CHỮ ở màn hẹp (tiêu đề/đơn vị/cascade/KR nay tự XUỐNG DÒNG, hiện đầy đủ — không còn tràn mép).',
      'Khi KÉO thẻ tới sát mép trên/dưới màn hình, trang TỰ CUỘN để thả vào làn ở xa (thuận tiện trên điện thoại khi cuộn tay bị khoá lúc kéo).',
    ],
  },
  {
    date: '01/08/2026 (Bản đồ liên kết chiến lược — kéo–thả BSC→OKR→KR→KPI)',
    items: [
      'Trang mới "Bản đồ": toàn cảnh chuỗi BSC → Mục tiêu → Kết quả then chốt → KPI, xếp theo 5 làn viễn cảnh.',
      'KÉO–THẢ (chuột & cảm ứng) thẻ mục tiêu sang làn khác để gắn viễn cảnh BSC ngay trên bản đồ.',
      'Mở ⚙ trên mỗi thẻ để đặt OKR cấp trên (cascade, tự chặn vòng lặp) và gắn KPI cho từng KR — thiết lập liên kết trực quan, thân thiện.',
      'Chỉ mục tiêu bạn có quyền sửa mới kéo/chỉnh được; mọi người đều xem được bức tranh tổng thể.',
    ],
  },
  {
    date: '01/08/2026 (Trải nghiệm: header tự ẩn + thanh tải + cả dòng bấm được + mã ở mọi nơi)',
    items: [
      'MOBILE: thanh menu TỰ ẨN khi cuộn xuống, hiện lại khi cuộn lên → xem được nhiều nội dung hơn (desktop luôn hiện).',
      'Thanh TIẾN TRÌNH mảnh trên đỉnh khi điều hướng — bấm link phản hồi ngay, hết cảm giác "bấm mà không mở".',
      'Cả DÒNG OKR ở Bảng điều khiển / Của tôi đều bấm mở được (không chỉ mỗi tiêu đề) — vùng chạm lớn, dễ bấm trên điện thoại.',
      'Hiện MÃ (code) cho Objective/KR/Công việc ở Bảng điều khiển & trang Của tôi — đồng nhất với trang OKR.',
    ],
  },
  {
    date: '01/08/2026 (Cử chỉ cảm ứng: kéo–làm mới + vuốt chuyển tab)',
    items: [
      'Trên điện thoại/máy tính bảng (cảm ứng): KÉO XUỐNG từ đỉnh trang → làm mới dữ liệu (pull-to-refresh) kiểu web iPhone, có con quay iOS.',
      'VUỐT TRÁI/PHẢI để chuyển sang tab kế/trước trong thanh điều hướng (Bảng điều khiển ↔ OKR ↔ Dự án ↔ Công việc ↔ KPI ↔ Của tôi ↔ Hướng dẫn), có nhãn tab gợi ý.',
      'Tự bỏ qua khi đang cuộn ngang trong bảng/Kanban/ô nhập và khi vuốt sát mép (nhường back-swipe iOS). Máy tính (chuột) không bị ảnh hưởng.',
    ],
  },
  {
    date: '01/08/2026 (KPI: seed 30 + chủ sở hữu + ngưỡng mặc định + auto-fill)',
    items: [
      'Nạp 30 KPI vào Thư viện (16 chỉ số scorecard 3 tầng trọng số 40/36/24 + 14 KPI vận hành), gán đơn vị chủ (Khối) + chủ sở hữu (chủ trì OKR Khối) + người đo.',
      'Trạng thái W/A/E có MẶC ĐỊNH theo % đạt so target (Ổn ≥90% · Theo dõi ≥70% · Cảnh báo ≥50% · Khẩn <50%) khi chưa đặt ngưỡng tuyệt đối — vẫn override được bằng ngưỡng riêng.',
      'Auto-fill số THỰC HIỆN (actual) cấp Công ty từ BigQuery cho KPI ánh xạ sạch (Lợi nhuận gộp TM, Sản lượng) theo cron đồng bộ KPI; target/kế hoạch đặt tay.',
    ],
  },
  {
    date: '01/08/2026 (KR↔KPI + cảnh báo toàn vẹn)',
    items: [
      'Gắn Key Result với KPI thư viện: KR tự KÉO SỐ (mục tiêu/thực hiện) từ giá trị KPI ở đúng kỳ + đơn vị của OKR — "đo" và "làm" là một, khỏi nhập trùng.',
      'Bảng điều khiển thêm "⚠ Cảnh báo toàn vẹn alignment": tự soi lỗ hổng chuỗi chiến lược→thực thi (OKR chưa chủ trì/chưa cascade, KR chưa có việc, KPI thiếu chủ/chưa có số, dự án rỗng).',
    ],
  },
  {
    date: '01/08/2026 (Scorecard KPI đa cấp)',
    items: [
      'Thêm menu "KPI" — Scorecard đo target vs thực hiện theo Công ty → Khối → Phòng, ngưỡng Watch/Alert/Escalate tự tính, chấm điểm theo trọng số 3 tầng (vd 72/100).',
      'Nhập số theo phân quyền: năng lực "Nhập số KPI" (kpi.input) nhập trong phạm vi đơn vị mình; còn lại chỉ xem.',
    ],
  },
  {
    date: '01/08/2026 (Thư viện KPI)',
    items: [
      'Thêm "Thư viện KPI" (Quản trị): khai báo chỉ số đo dùng lại — viễn cảnh BSC, module (KRA), tầng & trọng số, nguồn tự động/nhập tay, ngưỡng Watch/Alert/Escalate, business & measurement owner.',
      'Hai năng lực mới tự vào trang Phân quyền: "Quản lý Thư viện KPI" (kpi.manage) và "Nhập số KPI" (kpi.input).',
    ],
  },
  {
    date: '01/08/2026 (BSC — viễn cảnh trên OKR)',
    items: [
      'Mỗi OKR (nhất là Công ty/Khối) gắn được 1 viễn cảnh BSC: Tài chính · Khách hàng · Quy trình nội bộ · Học hỏi & Phát triển — chọn khi tạo hoặc đặt nhanh ở đầu trang chi tiết OKR.',
      'Bảng điều khiển thêm "Tiến độ theo Viễn cảnh BSC" — đọc chiến lược có cân bằng cả 4 mặt hay không.',
    ],
  },
  {
    date: '01/08/2026 (phương pháp luận: chuỗi liên kết chuẩn)',
    items: [
      'Hướng dẫn bổ sung mục "Khung liên kết chuẩn: Chiến lược → Thực thi" — chuỗi 6 lớp BSC → Mục tiêu chiến lược → KRA → OKR → { KPI · Dự án→Kế hoạch→Công việc }, cùng nguyên tắc đo 2 chiều (target xuống / actual lên) và phân biệt KR (kết quả) vs KPI (sức khỏe vận hành).',
    ],
  },
  {
    date: '01/08/2026 (Công việc: sửa nhanh + tinh chỉnh UI)',
    items: [
      'Bấm một dòng trong bảng Công việc để mở cửa sổ CẬP NHẬT / SỬA / XOÁ (theo phân quyền): quản lý OKR sửa mọi trường + xoá (có xác nhận); người được giao cập nhật trạng thái & tiến độ; người khác chỉ xem.',
      'Header bảng nay dính theo TRANG (cuộn cả trang lên/xuống, không kẹt trong khung); cột hẹp (trạng thái/ưu tiên/dự án…) gọn 1 dòng, cột "Công việc" cho xuống nhiều dòng.',
      'Popup hướng dẫn (ⓘ) trình bày lại: bỏ in đậm nguyên khối, dùng gạch đầu dòng dễ đọc.',
    ],
  },
  {
    date: '01/08/2026 (Công việc: sắp xếp cột + header đóng băng)',
    items: [
      'Bảng "Công việc": bấm tiêu đề cột để sắp xếp (bấm lại đổi chiều tăng/giảm) — mã, tên, trạng thái, ưu tiên, tiến độ, phụ trách, đơn vị, OKR, dự án, hạn.',
      'Header cột ĐÓNG BĂNG (floating) khi cuộn danh sách dài — luôn thấy tên cột.',
    ],
  },
  {
    date: '01/08/2026 (trang "Công việc" toàn hệ thống + phân quyền xem)',
    items: [
      'Thêm menu "Công việc": một bảng gom TẤT CẢ dự án/tiểu dự án/công việc từ mọi OKR, KR và dự án; có tổng quan trạng thái + việc quá hạn và đầy đủ bộ lọc (tìm kiếm, Phụ trách, Đơn vị, OKR, Dự án, Trạng thái, Ưu tiên, Loại, Kỳ, Quá hạn, Việc của tôi).',
      'Phân quyền XEM công việc theo nguyên tắc "cần-mới-biết": chỉ hiện việc bạn được giao / bạn giao / OKR bạn chủ trì / dự án bạn tham gia / phạm vi đơn vị bạn quản. Năng lực "Toàn phạm vi" (Phân quyền) cho phép xem toàn bộ — CEO/CFO mặc định thấy tất cả.',
    ],
  },
  {
    date: '01/08/2026 (bộ lọc công việc & dự án)',
    items: [
      'Các view công việc (Danh sách/Kanban/Dòng thời gian) thêm thanh lọc chung: tìm kiếm (tên/mã/người) + lọc theo Phụ trách, Đơn vị, Trạng thái, Ưu tiên và tùy chọn "⚠ Quá hạn". Lọc áp cho cả 3 view, có nút xoá lọc kèm số kết quả.',
      'Trang Dự án thêm thanh lọc: tìm kiếm + lọc theo Trạng thái và Đơn vị chủ trì.',
    ],
  },
  {
    date: '01/08/2026 (hiển thị dự án/việc gắn từng KR)',
    items: [
      'Mỗi KR hiện ngay "🗂 Dự án & công việc gắn KR" (nếu có): tên, mã, trạng thái, tiến độ, người phụ trách, hạn, số việc con — gọn, tách bạch rõ giữa các KR.',
    ],
  },
  {
    date: '01/08/2026 (bộ lọc trang OKR)',
    items: [
      'Trang OKR thêm thanh lọc: tìm kiếm + lọc theo Khối/Phòng, Cấp, Trạng thái, Loại OKR. Khi lọc hiện danh sách kết quả khớp; bỏ lọc về lại cây.',
    ],
  },
  {
    date: '01/08/2026 (biểu đồ & trực quan hoá insight)',
    items: [
      'Bảng điều khiển thêm biểu đồ: donut Tiến độ vs Nhịp độ (dẫn/chậm so với thời gian kỳ), phân bố tiến độ KR, trạng thái công việc + việc quá hạn, xếp hạng tiến độ theo Khối.',
      'Trang chi tiết OKR: mỗi KR có đường "xu hướng tiến độ" (sparkline) qua các lần check-in.',
      'Trang Dự án: thanh tổng quan trạng thái công việc + số việc quá hạn.',
      'Biểu đồ SVG nhẹ, render sẵn ở máy chủ (không thêm thư viện), khớp theme.',
    ],
  },
  {
    date: '01/08/2026 (rà soát & vá lỗ hổng phân quyền)',
    items: [
      'Sửa/giao/kéo-thả công việc & quản lý Dự án nay theo đúng Nhóm quyền × Năng lực (trước còn dùng logic vai trò cũ ở máy chủ — đã đồng bộ, chặn cả request thủ công).',
      'Check-in tay KHÔNG còn ghi đè giá trị KR gắn KPI tự động (chỉ lưu độ tự tin/ghi chú).',
      'Dọn mã cũ & cảnh báo giao diện nhỏ; kiểm thử lại toàn hệ thống (build + DB + HTTP) đều đạt.',
    ],
  },
  {
    date: '01/08/2026 (tiêu đề bỏ tên Khối/Phòng — lấy từ ô Đơn vị)',
    items: [
      'Tiêu đề Objective không cần ghi tên Khối/Phòng nữa (đã có ở ô "Đơn vị phụ trách"). Đã dọn tiền tố "Khối …:"/"Phòng …:" khỏi tiêu đề seed.',
    ],
  },
  {
    date: '01/08/2026 (Nhóm quyền × Năng lực — phân quyền nâng cao)',
    items: [
      'Thêm hệ thống Nhóm quyền: 🛡️ Quản trị hệ thống · ⭐ Quản trị OKR · 👔 Quản lý · ✍️ Cộng tác · 👁️ Người xem — mỗi nhóm gồm bộ Năng lực (capability) cấu hình được.',
      'Có thể cấp quyền quản trị hệ thống / phân quyền cho người ngoài CEO/CFO (không còn cứng chỉ CEO/CFO).',
      'Gán Nhóm quyền cho từng người ở trang Người dùng; vai trò tổ chức vẫn quyết định phạm vi.',
      '"Sổ năng lực" tự cập nhật: thêm tính năng cần phân quyền → trang Phân quyền tự hiện toggle mới cho mọi nhóm.',
    ],
  },
  {
    date: '01/08/2026 (tối ưu giao diện mobile trang chi tiết OKR)',
    items: [
      'Trên điện thoại: header OKR và mỗi KR xếp dọc gọn — thanh tiến độ + % + nút "Sửa" nằm gọn 1 dòng dưới tiêu đề, không còn nút trôi giữa màn hình.',
    ],
  },
  {
    date: '01/08/2026 (thống nhất mã tự sinh — tiêu đề chỉ còn text)',
    items: [
      'Mọi mã O/KR/H do hệ thống TỰ SINH và hiển thị dạng badge (vd CU-01.KR4) — người dùng chỉ viết nội dung (text), không cần gõ mã/tiền tố.',
      'Đã dọn các tiền tố cũ nhúng trong tiêu đề dữ liệu seed: "2026 —"/"2026:" ở Objective, "M-xx:" ở KR, "H-xx:" ở công việc.',
    ],
  },
  {
    date: '01/08/2026 (cảnh báo hạn công việc + icon riêng cho Khối)',
    items: [
      'Công việc quá hạn / đến hạn hôm nay / sắp đến hạn (≤3 ngày) được cảnh báo rõ ở CẢ 3 view: Danh sách (badge), Kanban (vạch màu + badge), Dòng thời gian (viền thanh + badge). Việc Xong/Huỷ không cảnh báo.',
      'Mỗi Khối có icon nhận diện riêng (Tài chính 💰, Bán lẻ 🏬, Marketing 📣, Sản xuất 🏭…) — hiện ở bảng điều khiển, cây OKR và trang chi tiết.',
    ],
  },
  {
    date: '01/08/2026 (làm mới giao diện trang Hướng dẫn)',
    items: [
      'Trang Hướng dẫn thiết kế lại: hero + mục lục dính bên trái, tính năng dạng lưới thẻ, thuật ngữ dạng thẻ, nhật ký dạng dòng thời gian — dễ theo dõi, dễ đọc.',
      'Giãn cách dòng check-in (giá trị · độ tự tin · ghi chú) cho thoáng, không còn dính nhau.',
    ],
  },
  {
    date: '01/08/2026 (hiển thị trọng số KR)',
    items: [
      'Mỗi KR hiển thị chip "⚖ Trọng số N" ngay trên danh sách KR, kèm % tỷ trọng đóng góp khi tính tiến độ Objective (di chuột xem chi tiết).',
    ],
  },
  {
    date: '01/08/2026 (sửa/xoá Key Result ngay trên màn hình)',
    items: [
      'Thêm nút "✏️ Sửa KR" cạnh mỗi Key Result → popup sửa tiêu đề/loại/hướng/đơn vị/mốc/trọng số/chỉ số/nguồn KPI + "🗑 Xoá KR" (có xác nhận).',
      'Quyền sửa/xoá KR theo cùng phân quyền OKR (ai sửa được OKR thì quản được KR trong đó).',
      'KR gắn KPI tự động: khoá các trường do BigQuery đồng bộ, tránh sửa nhầm.',
    ],
  },
  {
    date: '01/08/2026 (phân quyền OKR + sửa/xoá OKR ngay trên màn hình)',
    items: [
      'Thêm nút "✏️ Sửa OKR" ngay trên mỗi trang OKR (popup sửa tiêu đề/loại/trạng thái/chủ trì/đơn vị/mô tả), hiện theo quyền.',
      'Xoá OKR (Objective) — mặc định chỉ CEO/CFO + Quản trị OKR; có popup xác nhận.',
      'Trang Quản trị → "Phân quyền OKR": cấu hình vai trò nào được Sửa/Xoá/Tạo (theo phạm vi) + danh sách "Quản trị OKR" toàn quyền.',
      'Phân quyền áp cả ở giao diện (ẩn nút) lẫn máy chủ (chặn thật) — không ai lách được qua URL/API.',
    ],
  },
  {
    date: '01/08/2026 (quy tắc sửa/xoá bình luận & check-in)',
    items: [
      'Chỉ quản lý (CEO/CFO hoặc lead quản OKR) mới được XOÁ bình luận/check-in.',
      'Người dùng thường chỉ được SỬA bình luận/check-in của mình trong vòng 3 giờ kể từ lúc đăng; quá hạn phải nhờ quản lý.',
      'Quản lý được sửa/xoá bất kỳ lúc nào; áp dụng cả ở giao diện (ẩn nút) lẫn máy chủ (chặn thật).',
    ],
  },
  {
    date: '01/08/2026 (tinh chỉnh giao diện thảo luận)',
    items: [
      'Ô soạn bình luận tự dọn sạch sau khi gửi/lưu thành công (không giữ lại nội dung đã gửi).',
      'Hiển thị đúng avatar Google của người dùng ở mọi bình luận (tự cập nhật, không cần đăng nhập lại).',
      'Mục "📈 Check-in / cập nhật" và "💬 Thảo luận" dưới mỗi KR được thụt lề + gắn icon, gom nhóm gọn gàng.',
    ],
  },
  {
    date: '01/08/2026 (an toàn khi xoá + phản hồi khi lưu)',
    items: [
      'Mọi thao tác XOÁ (check-in, KR, công việc/dự án, đơn vị, người dùng, bình luận) đều mở popup xác nhận trước khi xoá — tránh xoá nhầm.',
      'Sửa check-in: bấm "Lưu thay đổi" xong hiện note "✓ Đã lưu" và tự đóng ô sửa.',
    ],
  },
  {
    date: '01/08/2026 (rà soát & sửa lỗi toàn diện)',
    items: [
      'Nhập số kiểu VN: "1.000.000" hiểu đúng là 1.000.000 (trước bị thành 0). Giữ đúng số thập phân (12,5).',
      'Check-in bỏ trống "Giá trị mới" = chỉ ghi confidence/ghi chú, KHÔNG đưa KR về 0.',
      'Sửa/xoá check-in KHÔNG làm sai KR gắn nguồn KPI tự động (giá trị do cron quản lý).',
      'Tiến độ Objective luôn trong 0–100% (kể cả khi có KR trọng số 0).',
      'Tiến độ % của Dự án/Tiểu dự án (có mục con) tự cuộn — ô nhập được khoá để tránh sửa nhầm.',
      'Lỗi tạo thông báo không còn làm hỏng việc lưu bình luận.',
    ],
  },
  {
    date: '01/08/2026 (sửa lỗi sửa check-in)',
    items: [
      'Form sửa check-in mở thành khối riêng dưới mỗi dòng (trước đây chèn lộn xộn vào dòng meta gây khó bấm/không lưu được).',
    ],
  },
  {
    date: '01/08/2026 (avatar Google)',
    items: [
      'Tự lấy avatar từ tài khoản Google khi đăng nhập, hiển thị ở bình luận, thông báo, gợi ý @mention và góc phải header (thiếu thì dùng chữ cái đầu).',
    ],
  },
  {
    date: '31/07/2026 (comment: @tag inline + xoá hẳn)',
    items: [
      'Gõ @ NGAY trong ô bình luận để gắn thẻ người (gợi ý inline) — bỏ ô "Gắn thẻ" riêng.',
      'Xoá bình luận là bỏ hẳn (không còn dòng "Bình luận đã xoá").',
    ],
  },
  {
    date: '31/07/2026 (bình luận @nhắc + trung tâm thông báo)',
    items: [
      'Mỗi Objective/KR/Công việc có khu "💬 Thảo luận": bình luận, trả lời theo luồng, sửa/xoá của mình, @gắn thẻ đồng nghiệp.',
      'Được @nhắc hoặc bị trả lời → thông báo ở chuông 🔔 (số chưa đọc, tự làm mới) + email (tuỳ chọn bật/tắt mỗi người).',
      'Trang "Thông báo": xem, bấm mở đúng mục & tự đánh dấu đã đọc, "đánh dấu tất cả đã đọc".',
    ],
  },
  {
    date: '31/07/2026 (check-in theo KR + link dự án mở tab mới)',
    items: [
      'Mỗi KR hiện LỊCH SỬ CHECK-IN ngay tại KR (timeline gọn) — tác giả/quản lý sửa/xoá được, tự đồng bộ lại giá trị KR.',
      'Trong popup sửa việc: nút "↗ Mở" dự án ở tab mới (không ảnh hưởng việc đang sửa).',
      'Thẻ Kanban: tên dự án dài tự xuống dòng, không tràn thẻ; bấm chip mở ở tab mới.',
    ],
  },
  {
    date: '31/07/2026 (tooltip bấm mở popup + mã không tái dùng)',
    items: [
      'Chấm ⓘ mọi màn hình: bấm mở popup hướng dẫn chi tiết (nội dung quy hoạch ở trang Hướng dẫn).',
      'Mã O/KR/H/Dự án chuyển sang BỘ ĐẾM BỀN: tự sinh theo thứ tự, atomic, KHÔNG tái dùng số đã cấp (kể cả sau khi xoá).',
    ],
  },
  {
    date: '31/07/2026 (thêm việc từ dự án + chip dự án xuống dòng meta)',
    items: [
      'Trong trang dự án: nút "＋ Thêm việc vào dự án" — chọn OKR (+ KR) của bộ phận; việc hiện cả ở action plan của bộ phận đó VÀ trong dự án.',
      'Trong OKR (Danh sách): chip Dự án/KR chuyển xuống DÒNG META (cùng PIC + hạn) cho gọn.',
    ],
  },
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
      'Trang Hướng dẫn sử dụng + tooltip trợ giúp ở từng tính năng.',
    ],
  },
];

const HELP = new Map(FEATURES.map((f) => [f.key, f]));
export function helpFor(key: string): Feature | undefined {
  return HELP.get(key);
}
