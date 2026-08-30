// ============================================================================
// NGUỒN DUY NHẤT cho Hướng dẫn sử dụng + tooltip trợ giúp.
// Trang /guide và component HelpTip đều đọc từ đây. Phần cấu trúc (vai trò, cấp,
// KPI metric, kỳ, số đơn vị) được trang /guide render ĐỘNG từ code/DB → tự cập
// nhật khi hệ thống thay đổi. Khi THÊM tính năng: thêm 1 mục vào FEATURES +
// 1 dòng vào CHANGELOG (xem CLAUDE.md "Quy tắc cập nhật tài liệu").
// ============================================================================

export const GUIDE_VERSION = '2026-08-30.108';

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
    key: 'page-guide',
    title: 'Hướng dẫn từng bước (walkthrough) theo trang',
    where: 'Mỗi trang — tự chạy lần đầu; mở lại từ nút "Hướng dẫn" trên thanh trên cùng',
    help: 'Mỗi trang có một tour pop-up nhiều bước, dẫn bạn đi qua các tính năng của chính trang đó — nhìn là dùng được ngay; tự chạy lần đầu, mở lại bất cứ lúc nào.',
    detail: [
      'Khi bạn vào một trang lần đầu, một hộp hướng dẫn (pop-up) tự hiện và dẫn bạn đi TỪNG BƯỚC qua các tính năng chính của CHÍNH trang đó — mỗi bước KHOÉT SÁNG đúng nút/khu vực TẠI VỊ TRÍ THẬT trên trang (như tour Trang chủ), có "Bước 1/…", nút Tiếp → / Quay lại / Bỏ qua và chấm tiến độ. Tối đa 10 bước mỗi trang, mục tiêu để người mới tự dùng được mà không cần đào tạo. Đã xem xong thì lần sau trang đó không tự bật lại (nhớ riêng từng trang). Muốn xem lại bất cứ lúc nào: bấm nút "Hướng dẫn" (biểu tượng ?) trên thanh trên cùng — chỉ hiện ở trang có hướng dẫn. Nội dung tất cả các tour được quản lý tập trung ở một nơi và TỰ mở rộng: thêm trang mới hoặc tính năng mới ⇒ chỉ khai báo thêm là tour cập nhật, không phải sửa từng trang.',
    ],
  },
  {
    key: 'report-levels',
    title: 'Báo cáo theo cấp (kết quả tổng có trọng số)',
    where: 'Menu "Tổng quan" → "Báo cáo theo cấp"',
    help: 'Xem kết quả OKR theo Công ty → Khối → Phòng → Cá nhân; mỗi nhóm có tổng tính THEO TRỌNG SỐ từng OKR — chỉnh trọng số ngay tại đây.',
    detail: [
      'Trang "Báo cáo theo cấp" tổng hợp OKR của một kỳ theo bốn cấp: Công ty, Khối, Phòng ban, Cá nhân. Mỗi nhóm hiện KẾT QUẢ TỔNG = bình quân CÓ TRỌNG SỐ tiến độ các OKR trong nhóm (Σ tiến độ×trọng số ÷ Σ trọng số). Mặc định mọi OKR trọng số 1 (cân nhau); đặt trọng số cao hơn cho OKR quan trọng hơn để kết quả nhóm phản ánh đúng mức ưu tiên. CEO/CFO chỉnh trọng số NGAY tại báo cáo: mở một nhóm → bấm nút bút chì cạnh "trọng số" của OKR → nhập số (có mức gợi ý nhanh 0,5–3) → Lưu, kết quả nhóm cập nhật liền. Giám đốc khối/trưởng phòng đặt trọng số OKR của mình ở ô "Trọng số" trong cửa sổ Sửa OKR. Mở từng nhóm để xem danh sách OKR cấu thành, bấm vào là tới chi tiết OKR (trace-back).',
    ],
  },
  {
    key: 'okr-cascade',
    title: 'OKR & liên kết (cascade)',
    where: 'Menu "OKR"',
    help: 'Cây mục tiêu Công ty → Khối → Phòng → Cá nhân, thu gọn/mở rộng + BỘ LỌC (khối/phòng, cấp, trạng thái, loại, tìm kiếm).',
    detail: [
      'Trang OKR hiển thị toàn bộ mục tiêu trong kỳ dạng cây theo alignment. Có THANH LỌC: tìm theo tên/mã/người chủ trì + lọc theo Khối/Phòng, Cấp, Trạng thái, Loại OKR — khi lọc sẽ hiện danh sách kết quả khớp (kèm số lượng), bỏ lọc để về lại cây. Mỗi nút CÓ cấp con hiện mũi tên ▸ để thu gọn/mở rộng (kèm số OKR con); có nút "Mở rộng tất cả / Thu gọn tất cả". Mặc định mở tới cấp Khối, thu gọn từ Phòng trở xuống. Khi tạo OKR, chọn cấp, đơn vị, người chủ trì và "Liên kết lên" một OKR cấp trên để tạo dòng chảy chiến lược.',
      'TẠO OKR CON NGAY TRONG OKR CHA: mở một OKR (vd cấp Khối) → khối "OKR con (alignment xuống)" có nút "+ Tạo OKR con" ở góc phải-trên (luôn hiện, kể cả khi đã có OKR con). Bấm mở cửa sổ tạo nhanh: chọn cấp con hợp lệ (thấp hơn cha), đơn vị (giới hạn trong nhánh của cha), người chủ trì, loại OKR và Key Result — OKR con tự kế thừa kỳ + viễn cảnh BSC của cha, lưu xong đóng cửa sổ và hiện ngay. Chỉ hiện với người có quyền tạo OKR trong phạm vi đó.',
    ],
  },
  {
    key: 'okr-import',
    title: 'Form mẫu & Nhập OKR hàng loạt (Excel)',
    where: 'Trang OKR → "⬇ Form mẫu" + "Nhập OKR hàng loạt từ Excel"',
    help: 'Tải form Excel mẫu (có sheet Hướng dẫn + ví dụ), điền nhiều OKR/KR/công việc rồi nhập lại để tạo nhanh — không cần khai từng cái.',
    detail: [
      'Bấm "⬇ Form mẫu" để tải file Excel mẫu gồm 4 sheet: Hướng dẫn (giá trị hợp lệ cho từng cột) + Objectives + KeyResults + Initiatives, mỗi sheet có dòng ví dụ "(VD)" để tham chiếu.',
      'Điền nhiều mục tiêu cùng lúc: ĐỂ TRỐNG cột "Mã" ở dòng nào thì dòng đó TẠO MỚI. Muốn nối KR/công việc vào một Objective mới, đặt "MÃ TẠM" (vd T1, T2) ở cột Mã của sheet Objectives rồi ghi lại mã tạm đó ở cột "Mã Objective" của KeyResults/Initiatives.',
      'Nếu điền MÃ THẬT đã có (lấy từ nút "Xuất Excel") thì hệ thống CẬP NHẬT mục đó thay vì tạo mới — dùng để sửa hàng loạt.',
      'Bấm "⬆ Nhập Excel" để nạp file. Kết quả báo rõ số mục TẠO MỚI và CẬP NHẬT cho OKR·KR·công việc, kèm danh sách dòng lỗi (nếu có) để sửa lại. Chỉ người có quyền nhập dữ liệu mới thấy mục này.',
    ],
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
      'Nhập/xuất HÀNG LOẠT: nút "Tải mẫu Excel" (file mẫu có sheet Tham chiếu + Hướng dẫn) → điền → "Nhập Excel"; hoặc "Xuất Excel" (có sẵn số) → sửa → nhập lại. Khớp theo cột Mã: có Mã → cập nhật, để trống Mã → tạo mới KPI.',
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
      'Một Objective/KR có thể được thực thi bằng công việc đơn HOẶC cả một dự án có cấu trúc. Cấu trúc 3 tầng: Dự án → Tiểu dự án → Công việc. Mỗi nút KHAI BÁO & LIÊN KẾT với Đơn vị phụ trách (Khối/Phòng ban) và người phụ trách (cá nhân), kèm hạn, ưu tiên, trạng thái (Chưa làm/Đang làm/Vướng/Xong/Huỷ), % hoàn thành và ngân sách. Mỗi việc còn ghi được "Kết quả đầu ra" (Definition of Done — xong là ra cái gì) để nghiệm thu minh bạch, đi kèm Link minh chứng. Tiến độ công việc TỰ CUỘN lên tiểu dự án → dự án. Phân quyền: người quản OKR (trưởng phòng trở lên trong phạm vi) tạo/giao/sửa/xoá; người ĐƯỢC GIAO tự cập nhật trạng thái + tiến độ việc của mình. Đây là tiến độ THỰC THI (output), tách khỏi tiến độ KẾT QUẢ đo bằng Key Result (outcome). Có 3 chế độ xem (nhớ lựa chọn): DANH SÁCH (cây phân cấp, thêm/sửa/giao), KANBAN (BẤM thẻ để mở popup sửa nhanh; kéo–thả thẻ giữa các cột trạng thái — chỉ sửa/kéo được việc bạn quản lý hoặc được giao), DÒNG THỜI GIAN (Gantt: thanh bắt đầu→hạn, vạch hôm nay, màu theo trạng thái; bấm để sửa).',
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
    help: 'Mỗi Mục tiêu/Thước đo/Công việc có mã. Xuất/nhập Excel bằng nhãn Tiếng Việt theo mã.',
    detail:
      'Mọi mục có mã unique gắn mã khối: Mục tiêu = <KHỐI>-O<n>, Thước đo = <mục tiêu>.KR<m>, Công việc = <mục tiêu>.H<kk>. Bấm "Xuất Excel" (trang OKR hoặc Quản trị) để tải file .xlsx gồm 3 sheet Tiếng Việt: "Mục tiêu" · "Thước đo" · "Công việc". Các cột danh mục (Cấp, Loại OKR, Trạng thái, Viễn cảnh, Loại đo, Hướng, Chỉ số, Loại, Ưu tiên) ghi bằng NHÃN Tiếng Việt đúng như trên Portal (vd Cấp = Công ty/Khối/Phòng/Cá nhân; Trạng thái = Đang chạy/Nháp/Hoàn thành/Lưu trữ) — form mẫu có sẵn sheet "Hướng dẫn" liệt kê các giá trị hợp lệ. Sửa trực tiếp trên Excel/Google Sheets rồi CEO/CFO "Nhập Excel" ở Quản trị: hệ thống khớp theo cột Mã để cập nhật (tiêu đề, trạng thái, TRỌNG SỐ OKR, tiến độ, giá trị Thước đo, ngày, ngân sách…); Công việc để trống Mã (kèm Mã Mục tiêu) sẽ được tạo mới. Nhập chấp nhận cả nhãn Tiếng Việt lẫn file cũ (mã tiếng Anh) — không phân biệt hoa/thường/dấu, không dòng nào bị xoá khi nhập. Form mẫu còn có sheet "masterdata_Tổ chức" (Mã đơn vị · Tên đơn vị · Họ tên · Vai trò · Email) — tra nhanh mã đơn vị & email khi điền.',
  },
  {
    key: 'tasks',
    title: 'Công việc (toàn hệ thống)',
    where: 'Menu "Công việc"',
    help: 'Liệt kê MỌI dự án/tiểu dự án/công việc từ tất cả OKR & dự án, đầy đủ bộ lọc + sắp xếp theo cột + header đóng băng khi cuộn. Chỉ hiện việc bạn được phép xem.',
    detail: [
      'Một bảng duy nhất gom toàn bộ công việc (dự án → tiểu dự án → công việc) từ mọi OKR, Key Result và Dự án.',
      'BÁO CÁO TỔNG QUAN (đầu trang, thu gọn được): 4 ô chỉ số (Tổng · Đang làm · Quá hạn · Hoàn thành %); biểu đồ tròn cơ cấu trạng thái; và biểu đồ phân bổ theo chiều CHỌN được — Bộ phận · Dự án · Người phụ trách · Ưu tiên (thanh xếp chồng Xong/Đang mở/Quá hạn). BẤM một ô chỉ số / một nhánh trạng thái / một thanh → tự LỌC danh sách bên dưới đúng nhóm đó (drill-down, truy vết tận từng việc).',
      'Đầy đủ bộ lọc: tìm kiếm (tên/mã/OKR/dự án), Phụ trách, Đơn vị, OKR, Dự án, Trạng thái, Ưu tiên, Loại, Kỳ, "⚠ Quá hạn" và "👤 Việc của tôi".',
      'Bấm tiêu đề cột để sắp xếp (bấm lại đổi chiều); header cột đóng băng khi cuộn cả trang. Mỗi dòng liên kết thẳng tới OKR/dự án gốc.',
      'Bấm vào một dòng để mở cửa sổ cập nhật / sửa / xoá công việc (theo phân quyền của bạn).',
      'TẠO CÔNG VIỆC: nút "+ Tạo công việc" (góc phải trên) hiện cho MỌI người. Quản lý (Trưởng phòng trở lên) dùng form đầy đủ: đặt tên, giao cho ai, gắn OKR / dự án bạn quản, đơn vị, ngân sách. NHÂN VIÊN dùng form gọn để tạo VIỆC CÁ NHÂN của mình (tên, mô tả, trạng thái, ưu tiên, ngày bắt đầu/hạn) — tự giao cho chính bạn; xem & cập nhật ở trang "Của tôi" và "Công việc". Việc cá nhân toàn quyền tự sửa/xoá.',
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
    help: 'Bấm chuông → danh sách thông báo, mỗi cái mở tới đúng mục. Tuỳ chọn loại thông báo ở Cài đặt cá nhân.',
    detail:
      'Chuông 🔔 cạnh tên bạn hiện số chưa đọc (tự làm mới). Bấm chuông mở trang Thông báo — DANH SÁCH mọi thông báo, bấm từng cái để tới đúng Objective/KR/Công việc và tự đánh dấu đã đọc; có "Đánh dấu tất cả đã đọc". Bạn nhận thông báo khi: được @nhắc tên · có người trả lời bình luận của bạn · có bình luận trên OKR/việc bạn phụ trách · được giao việc. Bật/tắt từng loại + email ở Cài đặt cá nhân (bấm tên bạn ở góc phải).',
  },
  {
    key: 'settings',
    title: 'Cài đặt cá nhân',
    where: 'Bấm TÊN bạn ở góc phải header → trang "Cài đặt cá nhân"',
    help: 'Hồ sơ của bạn + bật/tắt từng loại thông báo và email.',
    detail:
      'Bấm vào tên bạn ở góc phải để mở Cài đặt cá nhân: xem hồ sơ (họ tên · vai trò · đơn vị — do quản trị viên quản lý) và tuỳ chọn thông báo. Mỗi loại (được nhắc @ · trả lời bình luận · bình luận ở mục bạn phụ trách · được giao việc) có công tắc riêng, thêm công tắc gửi email tổng. Lưu là áp dụng ngay.',
  },
  {
    key: 'calendar',
    title: 'Lịch',
    where: 'Menu "Tổng quan" → "Lịch"',
    help: 'Lịch kiểu Google/Apple, xem theo Ngày/Tuần/Tháng: công việc (hạn), cuộc họp, check-in; bấm ngày để xem chi tiết & thêm nhanh.',
    detail:
      'Lịch gom mọi mốc thời gian: công việc theo HẠN (đỏ), cuộc họp theo giờ họp (xanh dương), check-in KR theo ngày (xanh lá). BA CHẾ ĐỘ XEM (nút Ngày · Tuần · Tháng, mặc định Tháng): Tháng = lưới ô đều, sự kiện cắt gọn "…"; Tuần = 7 cột Thứ 2→Chủ nhật, ô cao hơn để xem nhiều sự kiện; Ngày = danh sách chi tiết trong ngày. Trên điện thoại, ô Tháng/Tuần hiện sự kiện dạng CHẤM MÀU cho gọn. BẤM VÀO MỘT NGÀY (ở Tháng/Tuần) để mở chi tiết: danh sách sự kiện (mỗi mục bấm mở trang gốc) và THÊM NHANH cuộc họp / công việc ngay trong ngày đó (điền sẵn ngày). PHẠM VI HIỂN THỊ: "Của tôi" (mặc định — chỉ việc/cuộc họp/check-in mình phụ trách hoặc tham gia) hay "Tất cả" (chỉ CEO/CFO — toàn cảnh mọi khối/phòng). Điều hướng ← / → (lùi/tiến theo ngày/tuần/tháng tuỳ chế độ) hoặc về "Hôm nay".',
  },
  {
    key: 'meetings',
    title: 'Cuộc họp (biên bản + hành động)',
    where: 'Menu "Tổng quan" → "Cuộc họp"',
    help: 'Tổ chức cuộc họp, ghi biên bản, theo dõi hành động; nội dung bảo mật theo người tham gia.',
    detail:
      'Tạo cuộc họp theo loại (Check-in dự án · Điều hành tuần/tháng · Cấp khối/phòng · IBP…), chọn chủ trì/thư ký, người tham gia và phạm vi xem. LIÊN QUAN NHIỀU KHỐI/PHÒNG & NHIỀU DỰ ÁN: ô "Khối/Phòng liên quan" và "Dự án liên quan" cho chọn NHIỀU mục (gõ để tìm, hiện dạng thẻ) — một cuộc họp có thể gắn nhiều bộ phận & nhiều dự án; quyền xem "Cả đơn vị" áp cho MỌI khối/phòng đã gắn. Sau họp: chủ trì/thư ký ghi Biên bản & Quyết định; các công việc gắn cuộc họp hiện ở mục "Hành động". GẮN VIỆC VÀO CUỘC HỌP: khi sửa một công việc (ở trang OKR hoặc Dự án), tick "🗓 Thuộc cuộc họp" rồi chọn cuộc họp → công việc đó trở thành một "hành động" của cuộc họp và hiện chip 🗓 để truy vết ngược. CHUỖI CUỘC HỌP: mỗi cuộc họp có thể chọn "Cuộc họp trước" để nối chuỗi (vd chuỗi check-in dự án hàng tuần) — trang chi tiết hiện link "← Trước" và "Tiếp →" để đi lại giữa các kỳ họp. BẢO MẬT: chỉ người tham gia / được thêm (hoặc CEO/CFO) mới xem được nội dung; người ngoài có thể gửi "yêu cầu xem" → chủ trì/thư ký duyệt (có thông báo hai chiều). GHI BIÊN BẢN: ô soạn Biên bản & Quyết định TỰ LƯU nháp liên tục khi bạn gõ (chỉ báo "Đã lưu nháp lúc…") — không lo mất nội dung; nút "Lưu & đóng" để chốt và đóng cửa sổ.',
  },
  {
    key: 'activity-log',
    title: 'Nhật ký thay đổi theo từng mục',
    where: 'Nút hình đồng hồ ở góc phải-trên OKR · Dự án · Cuộc họp',
    help: 'Xem ai đã tạo/sửa/xoá gì và khi nào cho đúng mục đang xem.',
    detail:
      'Ở trang chi tiết OKR, Dự án và Cuộc họp có một nút nhỏ hình đồng hồ — bấm để mở "Nhật ký thay đổi" của đúng mục đó: danh sách thao tác theo thời gian (mới nhất trên cùng) kèm tên người thực hiện và thời điểm. Ghi nhận: tạo/sửa/xoá OKR, thêm/sửa/xoá Key Result, check-in tiến độ, thêm/sửa/xoá & đổi trạng thái công việc, sửa cuộc họp và cập nhật biên bản. Nhật ký ghi TỰ ĐỘNG mỗi khi có thao tác (từ 11/08/2026) — phục vụ truy vết trách nhiệm & minh bạch quản trị.',
  },
  {
    key: 'user-invite',
    title: 'Mời người dùng qua email + Duyệt người dùng',
    where: 'Nút "Mời người dùng" trên thanh header (mọi trang) · Quản trị → "Lời mời"',
    help: 'Đề xuất thêm người mới bằng email khi họ chưa có trong hệ thống; cần người có quyền "Duyệt người dùng" duyệt.',
    detail:
      'Khi cần gắn một người CHƯA có trong hệ thống, bấm "Mời người dùng" (có ở mọi màn hình, trên thanh trên cùng): nhập email + tên + vai trò đề xuất + đơn vị + ghi chú. Lời mời KHÔNG tạo tài khoản ngay — nó chuyển tới người có quyền "Duyệt người dùng" (thông báo ở chuông và email). Người duyệt mở Quản trị → "Lời mời" để DUYỆT hoặc TỪ CHỐI: khi duyệt, hệ thống tạo & kích hoạt người dùng, gửi email mời họ đăng nhập bằng Google; người đề xuất nhận thông báo kết quả. Quyền "Duyệt người dùng" mặc định thuộc nhóm Quản trị hệ thống & Quản trị OKR, CEO/CFO có thể cấp thêm cho vai trò khác ở trang Phân quyền.',
  },
  {
    key: 'user-profile',
    title: 'Hồ sơ 360° người dùng',
    where: 'Bấm tên người dùng (vd ở Quản trị → Người dùng)',
    help: 'Xem toàn cảnh 1 người: đơn vị, số OKR/dự án/việc, và (chỉ quản trị) chi tiết + đăng nhập.',
    detail:
      'Bấm vào tên một người để mở hồ sơ 360°. QUẢN TRỊ (CEO/CFO) xem ĐẦY ĐỦ: định danh (đơn vị, chức danh, email, ngày tham gia, số lần & lần đăng nhập gần nhất), số liệu (OKR chủ trì · Key Result · dự án · công việc được giao — kèm đang mở/quá hạn/đã xong · check-in · cuộc họp), và CHI TIẾT danh sách OKR/dự án/việc/check-in/cuộc họp + hoạt động gần đây (đều bấm mở được). Người KHÔNG phải quản trị chỉ xem định danh + SỐ LƯỢNG (không xem chi tiết nhiệm vụ/đăng nhập) để bảo vệ quyền riêng tư.',
  },
  {
    key: 'meeting-tasks',
    title: 'Việc (hành động) của cuộc họp',
    where: 'Trang chi tiết Cuộc họp · thẻ "Hành động (next actions)"',
    help: 'Thêm việc cho cuộc họp và xem theo Danh sách/Kanban/Gantt như trang Dự án.',
    detail:
      'Mỗi cuộc họp có thể THÊM công việc (next action) ngay tại thẻ "Hành động": bấm "＋ Thêm việc", đặt tên, giao người, hạn, ưu tiên; gắn OKR là TUỲ CHỌN (gắn thì việc hiện cả ở action plan của OKR đó, không gắn thì là hành động thuần của cuộc họp). Các việc hiển thị theo 3 kiểu như trang Dự án: Danh sách · Kanban (kéo–thả đổi trạng thái) · Dòng thời gian (Gantt), có bộ lọc (phụ trách/đơn vị/trạng thái/quá hạn/việc của tôi/ẩn việc xong). Chủ trì/thư ký/điều hành quản lý mọi việc; người được giao cập nhật việc của mình.',
  },
  {
    key: 'project-charter',
    title: 'Điều lệ dự án (Project Charter)',
    where: 'Trang chi tiết Dự án · thẻ "Điều lệ dự án"',
    help: 'Khai báo điều lệ chuẩn PM: mục tiêu · phạm vi · bàn giao · cột mốc · bên liên quan · rủi ro.',
    detail:
      'Mỗi dự án có Điều lệ (Charter) theo best-practice quản trị dự án: Bối cảnh & lý do · Mục tiêu · Trong/Ngoài phạm vi · Sản phẩm bàn giao · Cột mốc chính · Các bên liên quan · Nhà tài trợ · Rủi ro & giả định · Tiêu chí thành công. Người quản lý dự án bấm "Khai báo/Sửa điều lệ" ở góc phải-trên thẻ; nội dung đã điền hiển thị gọn theo lưới ngay khi mở dự án. Giúp thống nhất mục tiêu & phạm vi trước khi thực thi.',
  },
  {
    key: 'budget',
    title: 'Quản trị ngân sách',
    where: 'Menu "Thực thi" → "Ngân sách" (chỉ CEO/CFO)',
    help: 'Ngân sách kế hoạch vs đã chi theo dự án & khối; sổ chi tiết theo hạng mục, template CSV.',
    detail:
      'Tổng hợp ngân sách theo KỲ (mặc định kỳ hiện tại) với bộ lọc trạng thái dự án (mặc định "Đang chạy"): Kế hoạch · Đã chi · Còn lại · % đã dùng; bảng theo dự án và theo khối/đơn vị. SỔ CHI TIẾT (hạng mục): mỗi dự án có thể tách ngân sách thành nhiều dòng theo hạng mục — khi đã tách, Kế hoạch/Đã chi lấy theo tổng các dòng; chưa tách thì Kế hoạch = ngân sách dự án + Đã chi = gom thực chi từ công việc. Bấm "Chi tiết" ở mỗi khối/đơn vị để xem popup cơ cấu chi phí (dự án + hạng mục). TEMPLATE CSV: nút "Xuất template" tải CSV (mở Excel sửa) → "Import CSV" nạp lại (khớp theo mã dự án + hạng mục; hàng "(tổng)" ghi thẳng ngân sách dự án). "Đồng bộ BigQuery" là đường nạp thực chi tự động (đang chờ BI chốt nguồn chi phí gắn mã dự án). Chỉ CEO/CFO. (Lệch giữa sổ chi tiết và ngân sách khai báo tự hiện ở trang Toàn vẹn.)',
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
      'Hai tầng: (A) VAI TRÒ tổ chức (CEO/CFO · GĐ khối · Trưởng phòng · Nhân viên) quyết định PHẠM VI (đụng OKR đơn vị nào). (B) NHÓM QUYỀN quyết định NĂNG LỰC (được làm gì). 5 nhóm mặc định: 🛡️ Quản trị hệ thống (toàn quyền) · ⭐ Quản trị OKR (mọi OKR, toàn phạm vi) · 👔 Quản lý (tạo/sửa OKR trong phạm vi) · ✍️ Cộng tác (check-in/bình luận của mình, sửa trong 3h; tự quản OKR cá nhân) · 👁️ Người xem. CEO/CFO LUÔN toàn quyền. Năng lực OKR (Tạo/Sửa/Xoá) áp trong phạm vi tổ chức, trừ khi có năng lực "Toàn phạm vi". "Sổ năng lực" là nguồn duy nhất — thêm tính năng cần phân quyền chỉ cần thêm 1 năng lực, trang Phân quyền TỰ hiện toggle cho mọi nhóm. Nhóm năng lực gồm: Hệ thống · Chiến lược công ty · OKR & Key Result · Thực thi, Dự án & Họp · Ngân sách & Tài chính · KPI & Chỉ số · Dữ liệu. Ngoài OKR/KPI/Dự án, nay phân quyền được cả "Quản lý Chiến lược công ty", "Quản lý mọi cuộc họp" và "Quản lý Ngân sách" (trước khoá cứng cho CEO/CFO); ai cũng vẫn tự tạo cuộc họp của mình, "Quản lý mọi cuộc họp" chỉ là quyền quản trị họp toàn công ty. Chỉ người có năng lực "Phân quyền người dùng" (CEO/CFO + Quản trị hệ thống) mới gán được nhóm cho người khác. Phân quyền áp cả ở giao diện lẫn máy chủ.',
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
    date: '30/08/2026 (Cảnh báo tạo trùng tên)',
    items: [
      'Khi tạo Cuộc họp / Dự án / KPI / OKR mà TÊN trùng một mục đã có (không phân biệt hoa-thường & dấu), hệ thống hỏi xác nhận "có thể đang tạo trùng — chắc chưa?" trước khi tạo — giảm tình trạng tạo trùng do nhập tay.',
    ],
  },
  {
    date: '30/08/2026 (Sửa lại được email đăng nhập của người dùng)',
    items: [
      'Quản trị viên sửa lại được EMAIL đăng nhập khi nhập sai (trước đây bị khoá): mở "Sửa" người dùng → sửa ô "Email đăng nhập (Google)" → xác nhận.',
      'Khi đổi email, hệ thống TỰ chuyển toàn bộ dữ liệu & lịch sử (OKR, việc, dự án, cuộc họp, thông báo, nhật ký…) sang email mới trong một thao tác an toàn; người dùng đăng nhập lại bằng email mới. (Không đổi được email của chính mình để tránh mất phiên.)',
    ],
  },
  {
    date: '29/08/2026 (Hướng dẫn từng bước — walkthrough theo trang)',
    items: [
      'Mỗi trang có tour pop-up dẫn TỪNG BƯỚC qua các tính năng của chính trang đó, KHOÉT SÁNG đúng nút/khu vực tại vị trí thật (giống tour Trang chủ): "Bước 1/…", nút Tiếp/Quay lại/Bỏ qua, tối đa 10 bước — tự chạy lần đầu, người mới nhìn là dùng được ngay.',
      'Mở lại bất cứ lúc nào bằng nút "Hướng dẫn" (biểu tượng ?) trên thanh trên cùng (chỉ hiện ở trang có hướng dẫn). Nội dung quản lý tập trung, TỰ mở rộng khi thêm trang/tính năng mới.',
    ],
  },
  {
    date: '29/08/2026 (Cuộc họp: bộ lọc & tìm kiếm)',
    items: [
      'Trang Cuộc họp có thanh lọc/tìm: ô tìm theo mã/tên/đơn vị/chủ trì (không dấu) + lọc theo Loại họp, Trạng thái, Chủ trì — lọc ngay tại chỗ, không tải lại trang; có nút "Xoá lọc" và số lượng hiển thị.',
    ],
  },
  {
    date: '29/08/2026 (Sửa được Hạn công việc sau khi tạo)',
    items: [
      'Hạn (deadline) công việc nay SỬA LẠI ĐƯỢC bởi người quản việc: chủ trì / thư ký cuộc họp, người quản OKR, quản trị — trước đây bị khoá cứng sau khi tạo.',
      'Người ĐƯỢC GIAO việc vẫn chỉ xem hạn (không tự dời hạn của mình) để giữ đánh giá đúng/trễ hạn khách quan.',
    ],
  },
  {
    date: '29/08/2026 (Bàn giao công việc khi nhân sự nghỉ)',
    items: [
      'Quản trị → Người dùng: mỗi người có nút "Bàn giao" → chuyển toàn bộ việc/OKR/dự án/cuộc họp đang phụ trách sang một người thay thế khi nghỉ/luân chuyển.',
      'Chọn phạm vi: chỉ việc CHƯA hoàn thành (mặc định) / tất cả việc / không chuyển; kèm tuỳ chọn chuyển OKR, dự án, vai trò họp; và tuỳ chọn khoá tài khoản người nghỉ sau khi bàn giao. Lịch sử "người tạo" giữ nguyên, chỉ đổi người phụ trách.',
    ],
  },
  {
    date: '25/08/2026 (Phân quyền: bổ sung Chiến lược · Họp · Ngân sách vào ma trận quyền)',
    items: [
      'Rà soát & bổ sung 3 hạng mục quyền còn thiếu ở trang Phân quyền: "Quản lý Chiến lược công ty", "Quản lý mọi cuộc họp", "Quản lý Ngân sách" — trước đây bị khoá cứng cho CEO/CFO, nay giao/thu quyền được cho từng Nhóm.',
      'Thêm 2 nhóm hạng mục quyền: "Chiến lược công ty" và "Ngân sách & Tài chính".',
      'Mặc định: Quản trị hệ thống & Quản trị OKR có đủ 3 quyền mới; các nhóm khác không (Quản lý/Cộng tác/Người xem giữ nguyên). Ai cũng vẫn tự tạo được cuộc họp của mình — "Quản lý mọi cuộc họp" chỉ là quyền quản trị họp toàn công ty.',
    ],
  },
  {
    date: '25/08/2026 (Biên bản họp ↔ Hành động: đồng bộ tick/bỏ tick/xoá đầy đủ)',
    items: [
      'Tick việc trong biên bản → việc sang cột "Xong"; bỏ tick → về "Đang làm"; XOÁ dòng "[]" trong biên bản → xoá luôn việc ở mục Hành động.',
      'Ngược lại, đổi trạng thái việc ở Hành động (Xong / chưa Xong) cũng phản ánh dấu tick trong biên bản.',
    ],
  },
  {
    date: '25/08/2026 (Biên bản họp: giữ đúng xuống dòng/dòng trống — WYSIWYG)',
    items: [
      'Sửa lỗi mất dòng trống/xuống dòng: nội dung soạn thế nào thì lưu & hiển thị bên ngoài GIỐNG HỆT như vậy (giữ đúng các dòng trống, không dồn dòng).',
    ],
  },
  {
    date: '25/08/2026 (Biên bản họp: việc hiện ngay + hiển thị đẹp + icon trên dòng)',
    items: [
      'Việc "[]" nay TỰ HIỆN xuống mục "Hành động" NGAY khi tự lưu (không cần bấm "Lưu & đóng"); sửa lại cùng dòng thì cập nhật đúng việc, không tạo trùng.',
      'Khối "Biên bản & Quyết định" hiển thị dòng việc dạng Ô TICK + chip người + chip hạn (thay vì chữ thô "[ ] … @… ngày"); việc xong gạch ngang.',
      'Trong ô soạn, mỗi dòng việc có thanh icon nổi: 👤 giao người · 📅 đặt hạn (không phải chỉ nút trên thanh công cụ).',
    ],
  },
  {
    date: '25/08/2026 (Giờ Hà Nội + tên người bấm được xem hồ sơ)',
    items: [
      'Mọi thời gian hiển thị trong hệ thống nay theo đúng GIỜ HÀ NỘI (Asia/Ho_Chi_Minh), không lệch theo máy chủ/trình duyệt.',
      'Tên người ở các trang (người tham gia họp, chủ trì/thư ký, người lưu biên bản, phụ trách OKR/việc/dự án…) đều BẤM ĐƯỢC để mở hồ sơ 360° của người đó.',
    ],
  },
  {
    date: '25/08/2026 (Biên bản họp: ô soạn tương tác kiểu Lark)',
    items: [
      'Gõ "[]" trong biên bản → tự thành Ô TICK công việc (bấm để đánh dấu hoàn thành, gạch ngang khi xong). Gõ "@" → hiện DANH SÁCH NGƯỜI để chọn phụ trách (chip xanh). Nút 📅 trên thanh công cụ (hoặc gõ ngày 25/08) → chip HẠN màu vàng. Trực quan như Lark.',
    ],
  },
  {
    date: '25/08/2026 (Biên bản họp: tạo việc nhanh kiểu "[]" + đồng bộ Hành động)',
    items: [
      'Trong biên bản họp, gõ "[]" đầu dòng để TẠO CÔNG VIỆC; "@Tên người" giao phụ trách (người đầu tiên; các @còn lại ghi "cùng tham gia"); ngày "25/08" đặt hạn. Bấm "Lưu & đóng" → việc TỰ hiện ở mục "Hành động (next actions)" cùng trang.',
      'Sửa dòng "[]" trong biên bản (tên/người/hạn) sẽ cập nhật ĐÚNG việc bên dưới (mỗi dòng được gắn thẻ #Tn để liên kết). Đánh "[x]" = đã xong — đồng bộ 2 chiều với trạng thái việc.',
    ],
  },
  {
    date: '25/08/2026 (Biên bản họp: hiển thị AI lưu & thời điểm lưu lần cuối)',
    items: [
      'Ô ghi biên bản + khối "Biên bản & Quyết định" nay hiển thị "Lưu lần cuối bởi <tên> · <thời gian>" (tính cả các lần tự lưu nháp) để biết ai cập nhật và khi nào.',
    ],
  },
  {
    date: '25/08/2026 (Sửa lỗi MẤT CHỮ + giữ NHÁP biên bản cuộc họp khi đóng/mở lại)',
    items: [
      'Sửa lỗi ô soạn Biên bản / Quyết định cuộc họp: nội dung đang gõ (hoặc vừa dán) bị XOÁ/xáo trộn khi trình tự tự lưu nháp chạy — do vùng soạn bị vẽ lại đè lên chữ. Nay giữ nguyên chữ khi gõ và khi dán.',
      'Tự lưu nháp nay HIỂN THỊ đúng khi ĐÓNG rồi MỞ LẠI: nội dung đang viết dở còn nguyên để viết tiếp (trước đây mở lại thấy trống dù đã lưu). Đóng nhanh trước khi kịp tự lưu vẫn giữ được nốt phần vừa gõ.',
      'Dán nội dung nay chèn dạng VĂN BẢN THUẦN (giữ xuống dòng) — sạch, không kéo theo định dạng rác từ Word/web.',
    ],
  },
  {
    date: '20/08/2026 (Công việc: chọn nhiều & xoá / đổi trạng thái hàng loạt)',
    items: [
      'Trang Công việc: người có quyền quản lý có thể TICK CHỌN NHIỀU việc (ô vuông đầu mỗi dòng, ô ở tiêu đề = chọn tất cả theo bộ lọc hiện tại) rồi thao tác HÀNG LOẠT: Xoá vĩnh viễn · Hoàn thành · Huỷ/Dừng · đổi sang trạng thái bất kỳ.',
      'Chỉ chọn được việc BẠN quản lý (đúng phân quyền); việc ngoài quyền hiển thị dấu "–" không tick được. Xoá có xác nhận, không thể hoàn tác (việc con bị xoá theo).',
      'Cách dọn nhanh task cũ: mở Công việc → bỏ tick "Ẩn việc đã xong" (và lọc theo ý muốn) → tick ô ở tiêu đề để chọn tất cả → Xoá.',
    ],
  },
  {
    date: '20/08/2026 (Sửa lỗi trọng số số thập phân >2 chữ số biến thành số nguyên)',
    items: [
      'Sửa lỗi nhập/đặt trọng số có phần thập phân bắt đầu bằng 0 (vd 0.006, 0.06) bị hiểu nhầm là "nhóm nghìn" và biến thành số nguyên (0.006 → 6). Nay trọng số 0.006 giữ đúng 0.006 cả khi NHẬP EXCEL lẫn SỬA TRỰC TIẾP trên portal.',
      'Lưu ý: trọng số OKR nhận tối đa 4 chữ số thập phân; trọng số KR giới hạn 2 chữ số thập phân (theo kiểu cột dữ liệu).',
    ],
  },
  {
    date: '14/08/2026 (Người dùng: lọc theo Vai trò/Khối-Phòng/Nhóm quyền + Mã đơn vị)',
    items: [
      'Màn "Người dùng & phân quyền" thêm bộ LỌC: Vai trò · Khối/Phòng · Nhóm quyền (kết hợp cả ô tìm tên/email/chức danh). Lọc theo một Khối cũng hiện luôn người ở các Phòng thuộc khối đó.',
      'Bảng thêm cột "Mã đơn vị" (badge, cạnh cột Đơn vị) để nhìn nhanh mã Khối/Phòng.',
    ],
  },
  {
    date: '14/08/2026 (Sửa lỗi nhập Excel trọng số + menu Thư viện KPI)',
    items: [
      'Nhập Excel: sửa lỗi trọng số KR nhập HÀNG LOẠT bị về 1 — nay đọc đúng cột "Trọng số" kể cả header dính khoảng trắng, ô trọng số trống thì GIỮ NGUYÊN trọng số cũ (không ép về 1).',
      'Trọng số OKR giữ được NHIỀU số lẻ (tối đa 4, vd 0,3118) khi nhập Excel & khi sửa tay — không còn tự làm tròn/về số nguyên.',
      '"Thư viện KPI" hiện trong menu cho MỌI người có quyền quản KPI (kể cả Quản trị hệ thống) — không phải vào hub Quản trị mới thấy.',
    ],
  },
  {
    date: '14/08/2026 (Phân quyền: thêm nhóm "Quản trị KPI")',
    items: [
      'Thêm Nhóm quyền "📊 Quản trị KPI": quản lý Thư viện KPI + nhập số KPI + đồng bộ KPI cho TOÀN CÔNG TY, nhưng KHÔNG tạo/sửa/xoá OKR — hợp cho bộ phận Nhân sự / đầu mối KPI. Gán ở Quản trị → Người dùng; chỉnh chi tiết ở Quản trị → Phân quyền.',
      'Người thuộc nhóm này có thêm menu "Thư viện KPI" (nhóm Chiến lược & Đo lường) để vào khai báo KPI mà không cần quyền quản trị hệ thống.',
    ],
  },
  {
    date: '14/08/2026 (Thư viện KPI: bấm tên xem chi tiết đầy đủ)',
    items: [
      'Bấm vào TÊN KPI ở Thư viện → mở box xem đầy đủ mọi thông tin KPI + danh sách "đang dùng bởi" thước đo (KR) nào (bấm mở OKR gốc).',
      'KPI chưa gắn thước đo nào → Sửa/Xoá ngay trong box; KPI đang được KR dùng → khoá Xoá (gỡ liên kết ở KR trước), tránh làm mồ côi liên kết.',
    ],
  },
  {
    date: '14/08/2026 (OKR: đủ 5 trạng thái vòng đời + lọc được)',
    items: [
      'OKR nay có 5 trạng thái: Nháp · Chưa thực hiện · Đang chạy · Hoàn thành · Hủy/Dừng (badge màu riêng). Chọn khi Tạo/Sửa OKR.',
      'Bộ lọc "Trạng thái" ở trang OKR luôn hiện đủ 5 trạng thái (kể cả khi chưa có OKR nào ở trạng thái đó) → lọc được OKR "Hoàn thành", "Hủy/Dừng"… bất cứ lúc nào.',
    ],
  },
  {
    date: '14/08/2026 (Báo cáo theo cấp: xuất Excel + In/Lưu PDF)',
    items: [
      'Trang "Báo cáo theo cấp" thêm nút "Xuất Excel" (báo cáo đánh giá OKR theo kỳ/tháng: sheet Tổng hợp theo cấp + sheet Chi tiết từng OKR) và "In / Lưu PDF" (mở hết nhóm rồi in — lưu thành PDF).',
    ],
  },
  {
    date: '14/08/2026 (Thư viện KPI: nhập/xuất Excel hàng loạt)',
    items: [
      'Trang "Thư viện KPI" thêm 3 nút: "Tải mẫu Excel" (file mẫu có sheet Tham chiếu + Hướng dẫn), "Xuất Excel" (toàn bộ KPI kèm số), "Nhập Excel" (nhập/cập nhật hàng loạt). Khớp theo cột Mã: có Mã → cập nhật, để trống Mã → tạo mới. Không còn phải nhập tay từng KPI.',
    ],
  },
  {
    date: '14/08/2026 (Scorecard KPI: lọc theo Đơn vị)',
    items: [
      'Trang "KPI" (Scorecard) nay LỌC được theo Đơn vị: chọn 1 Khối/Phòng chỉ hiện KPI do đơn vị đó (và cấp dưới) phụ trách + các KPI dùng chung; chọn Công ty vẫn hiện toàn bộ. Điểm scorecard & Xuất Excel cũng theo đúng phạm vi đơn vị đang lọc.',
    ],
  },
  {
    date: '14/08/2026 (Menu điện thoại: cuộn được toàn bộ)',
    items: [
      'Mở menu ☰ trên điện thoại (cả dọc lẫn ngang): danh sách dài nay CUỘN được trong khung menu → xem & bấm tới mọi mục (kể cả "Đăng xuất" ở cuối), không còn bị khuất phần dưới.',
    ],
  },
  {
    date: '14/08/2026 (Header trên mobile & tablet: gọn gàng, đầy đủ)',
    items: [
      'Thanh menu/tiêu đề trên đầu trang hiển thị đầy đủ & đẹp ở MỌI bề rộng — điện thoại (cả dọc lẫn NGANG) và tablet dùng nút menu ☰ gọn, không còn bị cắt mất nút menu ở mép phải.',
      'Máy tính để bàn: header tự co theo cửa sổ (laptop 1280–1366 hiện logo + menu + tên gọn; màn rộng ≥1400 hiện thêm phụ đề thương hiệu) — tên người dùng & nút Đăng xuất luôn nằm gọn 1 hàng.',
    ],
  },
  {
    date: '14/08/2026 (Trang Hướng dẫn: thêm tài liệu BCQT & Nhịp điều hành)',
    items: [
      'Trang "Hướng dẫn sử dụng" thêm nút mở tài liệu slide "BCQT & Nhịp điều hành" (Báo cáo Quản trị & Nhịp điều hành — mở tab mới), cùng hàng với các tài liệu slide khác.',
    ],
  },
  {
    date: '12/08/2026 (Trang Hướng dẫn: thêm tài liệu Chiến lược → Thực thi)',
    items: [
      'Trang "Hướng dẫn sử dụng" thêm nút mở tài liệu slide "Quản trị Chiến lược tới Thực thi" (mở tab mới), bên cạnh "Tài liệu giới thiệu hệ thống".',
    ],
  },
  {
    date: '12/08/2026 (Kết quả đầu ra cho công việc + nhập số rõ định dạng)',
    items: [
      'Mỗi công việc nay có trường "Kết quả đầu ra" (Definition of Done) — ghi rõ "xong là ra cái gì" để nghiệm thu minh bạch, tránh làm cho có. Điền/sửa ở MỌI nơi tạo & cập nhật việc (trang Công việc, chi tiết OKR, dự án, cuộc họp, lịch); hiển thị nổi bật (khối viền vàng 🎯) ở phần xem chi tiết việc, cạnh Link minh chứng. File Excel OKR (sheet "Công việc") thêm cột "Kết quả đầu ra" để nhập/xuất hàng loạt.',
      'Ô "Trọng số" khi tạo/sửa OKR nay cho phép nhập tới 2 chữ số sau dấu phẩy (VD 1,25) thay vì chỉ 1 — chấm điểm quan trọng OKR mịn hơn.',
      'MỌI ô nhập số trong hệ thống nay ghi rõ định dạng ngay cạnh nhãn (VD: %, đồng, số, điểm, đơn vị đo của KPI) để điền đúng ngay từ đầu — kể cả ô Giá trị check-in Key Result hiển thị đúng đơn vị của KR đó.',
    ],
  },
  {
    date: '11/08/2026 (Form mẫu OKR: thêm cột Trọng số cho Mục tiêu)',
    items: [
      'Sheet "Mục tiêu" trong file xuất/nhập Excel thêm cột "Trọng số" — đặt/sửa được trọng số OKR bằng bulk upload (dùng cho kết quả tổng có trọng số ở Báo cáo theo cấp). Để trống khi cập nhật = giữ nguyên; tạo mới để trống = mặc định 1.',
    ],
  },
  {
    date: '11/08/2026 (Form mẫu OKR: thêm sheet "masterdata_Tổ chức")',
    items: [
      'File form mẫu (nút "Xuất Excel" / tải form) nay có thêm sheet "masterdata_Tổ chức" liệt kê danh bạ tổ chức thật: Mã đơn vị · Tên đơn vị · Họ tên · Vai trò · Email (mỗi đơn vị đều hiện, kể cả đơn vị chưa có người). Người điền tra ngay mã đơn vị (cho cột Khối/Phòng) và email (cho Người chủ trì/phụ trách) — điền nhanh & đúng, khỏi nhớ.',
    ],
  },
  {
    date: '11/08/2026 (Công việc: thêm Link minh chứng khi cập nhật)',
    items: [
      'Cửa sổ cập nhật công việc (ở màn Công việc và trong chi tiết OKR) thêm ô "Link minh chứng" (tuỳ chọn) — đính URL tài liệu/hình ảnh chứng minh kết quả, giống phần cập nhật Key Result. Người được giao cũng đính được minh chứng. Xem chi tiết việc hiện nút "🔗 Mở minh chứng".',
    ],
  },
  {
    date: '11/08/2026 (TOÀN HỆ THỐNG: hiện Tên + Chức danh khi chọn/giao người)',
    items: [
      'Áp cho MỌI ô chọn/giao người trên toàn hệ thống: nay hiện TÊN kèm CHỨC DANH (vai trò · đơn vị) để phân biệt người trùng tên và chọn đúng. Gồm: giao việc (Công việc, chi tiết OKR, dự án, cuộc họp), chủ trì OKR & OKR con, chủ dự án, chủ trì/đồng chủ trì/thư ký/người tham gia cuộc họp, người phụ trách & người đo KPI, tạo việc trên lịch, và gắn thẻ @ trong bình luận. Ô tìm nhanh gõ được cả theo vai trò/đơn vị.',
      'Các nơi HIỂN THỊ tên cũng kèm chức danh: cột "Phụ trách" & chi tiết việc, danh sách người tham gia cuộc họp — nhìn là biết ai, thuộc đơn vị nào.',
    ],
  },
  {
    date: '11/08/2026 (Báo cáo theo cấp: chỉnh trọng số OKR ngay tại chỗ)',
    items: [
      'CEO/CFO đặt TRỌNG SỐ cho từng OKR ngay trên trang "Báo cáo theo cấp": mở một nhóm, bấm nút bút chì cạnh "trọng số", nhập số (có mức gợi ý nhanh 0,5–3) → Lưu. Kết quả tổng của Khối/Phòng/Công ty tính lại theo bình quân CÓ TRỌNG SỐ, phản ánh đúng mức quan trọng của mỗi OKR thay vì cào bằng.',
    ],
  },
  {
    date: '11/08/2026 (Xuất/Nhập Excel: đồng nhất Tiếng Việt)',
    items: [
      'File Excel OKR nay MỘT ngôn ngữ Tiếng Việt, đồng nhất cách gọi trên Portal: 3 sheet đổi tên "Mục tiêu" · "Thước đo" · "Công việc"; các cột danh mục (Cấp, Loại OKR, Trạng thái, Viễn cảnh, Loại đo, Hướng, Chỉ số, Loại, Ưu tiên) ghi bằng nhãn Tiếng Việt (vd Công ty/Khối/Phòng, Đang chạy/Hoàn thành, Cam kết/Khát vọng, Cao/Trung bình/Thấp) thay cho mã tiếng Anh.',
      'Form mẫu (template) & sheet "Hướng dẫn" viết lại toàn bộ Tiếng Việt, liệt kê rõ các giá trị hợp lệ cho từng cột.',
      'Nhập (import) khớp linh hoạt: chấp nhận CẢ nhãn Tiếng Việt lẫn file cũ (mã tiếng Anh, tên sheet cũ), không phân biệt hoa/thường/dấu → xuất rồi nhập lại luôn khớp, file cũ vẫn dùng được.',
    ],
  },
  {
    date: '11/08/2026 (Công việc: Xóa ở chi tiết & gắn OKR khi sửa)',
    items: [
      'Màn Công việc: thêm nút "Xoá công việc" ngay ở khung xem chi tiết (trước phải mở Sửa mới thấy). Cửa sổ Sửa việc thêm ô "Thuộc OKR" (gắn/đổi/bỏ OKR) bên cạnh "Thuộc dự án".',
    ],
  },
  {
    date: '11/08/2026 (Nhật ký thay đổi theo từng mục)',
    items: [
      'Mỗi OKR, Dự án và Cuộc họp nay có nút nhỏ hình đồng hồ ở góc phải-trên → mở popup "Nhật ký thay đổi": ai làm gì, khi nào (tạo/sửa/xoá OKR · thêm/sửa/xoá Key Result · check-in · thêm/sửa/xoá/đổi trạng thái công việc · sửa cuộc họp · cập nhật biên bản…).',
      'Nhật ký ghi tự động từ nay trở đi khi có thao tác — giúp truy vết trách nhiệm rõ ràng, minh bạch.',
    ],
  },
  {
    date: '11/08/2026 (Mời người dùng qua email + quyền Duyệt người dùng)',
    items: [
      'Ở MỌI màn hình (nút "Mời người dùng" trên thanh trên cùng), bất kỳ ai cũng có thể đề xuất thêm một người mới bằng email khi người đó chưa có trong hệ thống — kèm tên, vai trò đề xuất, đơn vị và ghi chú.',
      'Lời mời KHÔNG tạo người dùng ngay: người có quyền "Duyệt người dùng" nhận thông báo (chuông + email) và duyệt/từ chối ở trang Quản trị → "Lời mời". Duyệt xong hệ thống mới kích hoạt người dùng và gửi email mời họ đăng nhập; người đề xuất được báo kết quả.',
      'Thêm quyền mới "Duyệt người dùng" (Phân quyền): mặc định thuộc nhóm Quản trị hệ thống & Quản trị OKR — CEO/CFO có thể cấp cho vai trò khác.',
    ],
  },
  {
    date: '11/08/2026 (Biên bản họp: tự lưu nháp liên tục)',
    items: [
      'Khi ghi Biên bản & Quyết định của cuộc họp, hệ thống TỰ LƯU nháp liên tục trong lúc bạn gõ (khoảng 1 giây sau khi ngừng) — không lo mất thông tin nếu lỡ đóng tab hay mất mạng. Có chỉ báo trạng thái ngay trên ô soạn: "Sẽ tự lưu…" → "Đang lưu nháp…" → "Đã lưu nháp lúc HH:MM:SS" (đỏ nếu lỗi, sẽ tự thử lại).',
      'Nút "Lưu & đóng" vẫn dùng để lưu chính thức và đóng cửa sổ như trước.',
    ],
  },
  {
    date: '11/08/2026 (Cuộc họp: gắn nhiều Khối/Phòng & nhiều Dự án)',
    items: [
      'Form tạo/sửa cuộc họp: ô "Khối/Phòng liên quan" và "Dự án liên quan" nay CHỌN NHIỀU mục (gõ để tìm, hiện dạng thẻ) — một cuộc họp có thể liên quan nhiều bộ phận và nhiều dự án cùng lúc.',
      'Danh sách & chi tiết cuộc họp hiển thị đầy đủ các khối/phòng + dự án đã gắn. Quyền xem "Cả đơn vị (khối/phòng)" áp cho MỌI khối/phòng đã gắn (không chỉ 1).',
      'Sửa lỗi mobile: các cặp ô nhập cạnh nhau (trên mọi form) nay TỰ xếp DỌC full-width ở màn hình hẹp (≤760px) — trước đây bị ép 2 cột chật khiến chữ chen chúc.',
    ],
  },
  {
    date: '11/08/2026 (Báo cáo theo cấp — tổng có trọng số)',
    items: [
      'Thêm trang "Báo cáo theo cấp" (menu Tổng quan): xem kết quả OKR theo Công ty → Khối → Phòng → Cá nhân, mỗi nhóm có KẾT QUẢ TỔNG tính theo TRỌNG SỐ từng OKR. Đặt trọng số ở ô "Trọng số" trong cửa sổ Sửa OKR (mặc định 1).',
    ],
  },
  {
    date: '11/08/2026 (Sửa "Tiến độ theo Khối" ở Tổng quan)',
    items: [
      'Bảng "Tiến độ theo Khối" nay liệt kê ĐỦ mọi khối theo cây tổ chức (khối chưa có OKR hiện 0%), và LUÔN hiện tên khối — không còn hiện nhầm tên một OKR thành "khối" (do OKR cấp khối chưa gán đơn vị). OKR cấp khối thiếu đơn vị được nhắc riêng ở trang Toàn vẹn dữ liệu.',
    ],
  },
  {
    date: '11/08/2026 (Xem & xuất OKR theo kỳ con)',
    items: [
      'Khi chọn kỳ Năm hoặc Quý ở trang OKR, phần "OKR theo kỳ con" hiện thêm bên dưới: mỗi Quý/Tháng có OKR sẽ mở ra được để xem cây OKR + tiến độ riêng của kỳ đó.',
      'Khi Xuất Excel một kỳ Năm/Quý, file tự gộp đầy đủ cả OKR của các kỳ con (Quý/Tháng) — cột "Kỳ" phân biệt từng kỳ, nên nhập lại (import) vẫn đúng kỳ theo đúng mẫu.',
    ],
  },
  {
    date: '11/08/2026 (Xác nhận thao tác — toast "Đã lưu / Đã xoá")',
    items: [
      'Mỗi khi Lưu / Sửa / Xoá xong ở mọi màn hình, một thông báo nhỏ (toast) hiện ở góc trên bên phải — biết ngay hệ thống đã xử lý xong ("Đã lưu", "Đã xoá", "Đã cập nhật…"); nếu lỗi thì hiện thông báo đỏ nêu lý do. Tự tắt sau vài giây, bấm ✕ để đóng ngay.',
    ],
  },
  {
    date: '11/08/2026 (Thông báo khi được giao việc)',
    items: [
      'Khi bạn được giao một công việc MỚI bởi người khác (tạo mới hoặc giao lại), bạn nhận ngay thông báo ở chuông 🔔 VÀ email (nếu bật) — kèm tên người giao, tên việc, hạn và liên kết mở thẳng tới việc. Không tự nhắc khi bạn tự tạo việc cho mình.',
      'Bật/tắt riêng loại "Được giao việc" (và email) ở Cài đặt cá nhân (bấm tên bạn ở góc phải).',
    ],
  },
  {
    date: '10/08/2026 (Rà soát & củng cố toàn hệ thống)',
    items: [
      'Nhân viên nay TỰ cập nhật & check-in OKR CÁ NHÂN của chính mình (tiêu đề, mô tả, Key Result, tiến độ) — trước đây tạo xong không sửa được. Vẫn chỉ xem OKR đơn vị/công ty; không đổi được cấp/đơn vị/liên kết cha của OKR cá nhân.',
      '"Hạn" của công việc được khoá chắc ở máy chủ (không sửa lén được) để đánh giá đúng/trễ hạn công bằng.',
      'Củng cố an toàn: chống vòng lặp khi sắp xếp Cây tổ chức; chống chèn OKR trái phép vào cây đơn vị khác; xuất Excel OKR gộp đủ cả công việc gắn theo Key Result.',
    ],
  },
  {
    date: '10/08/2026 (Cây tổ chức: sửa đơn vị + lịch sử theo thời gian)',
    items: [
      'Cây tổ chức (Quản trị) nay có nút "Sửa" từng đơn vị — đổi tên, mã, thứ tự, đơn vị trực thuộc và ẩn/hiện — không phải xoá rồi tạo lại. Quyền dành cho vai trò Quản trị hệ thống trở lên.',
      'Mỗi thay đổi cơ cấu có "Áp dụng từ ngày" (đặt lịch tương lai được, tự có hiệu lực đúng ngày) và được lưu vào LỊCH SỬ. Có ô "Xem cơ cấu tại ngày" để xem lại sơ đồ tổ chức ở bất kỳ thời điểm nào.',
    ],
  },
  {
    date: '10/08/2026 (Xuất OKR nhiều kỳ · nhiều đơn vị)',
    items: [
      'Nút "Xuất Excel" ở trang OKR nay mở cửa sổ chọn NHIỀU kỳ (tháng/quý/năm) và NHIỀU khối/phòng cùng lúc rồi tải một file — để trống = xuất toàn bộ. Trước đây chỉ xuất được 1 kỳ đang xem.',
    ],
  },
  {
    date: '10/08/2026 (Scorecard KPI: xuất đủ + tạo KPI)',
    items: [
      'Xuất Excel Scorecard nay ra TOÀN BỘ KPI trong phạm vi lọc (kỳ · đơn vị · viễn cảnh) — kể cả KPI chưa nhập số Thực hiện (trước đây chỉ ra KPI đã có số).',
      'Thêm nút "+ Tạo KPI" ngay trên Scorecard (cho người có quyền quản lý Thư viện KPI): mở cửa sổ khai báo chỉ tiêu mới (tên, viễn cảnh, tầng, đơn vị đo, hướng tốt, trọng số, ngưỡng cảnh báo), lưu xong hiện ngay trong bảng.',
    ],
  },
  {
    date: '10/08/2026 (Công việc: hoàn thành đúng hạn + tự điền đơn vị)',
    items: [
      'Cửa sổ tạo công việc: chọn "Giao cho" một người thì "Đơn vị phụ trách" TỰ nhảy theo đơn vị của người đó (vẫn sửa lại được).',
      'Cửa sổ cập nhật công việc: thêm trường "Hoàn thành" (ngày hoàn thành thực tế, tự điền khi chuyển "Xong"), và "Hạn" nay CỐ ĐỊNH (không sửa) để đánh giá đúng hạn khách quan. Hệ thống tự hiện huy hiệu "Đúng hạn" hoặc "Trễ N ngày".',
    ],
  },
  {
    date: '10/08/2026 (Sửa OKR: đổi Cấp & Liên kết cấp trên)',
    items: [
      'Cửa sổ "Sửa OKR" nay có thêm trường "Cấp OKR" và "Liên kết lên OKR cấp trên" — gắn/đổi mục tiêu cha (alignment) ngay khi sửa, không phải xoá rồi tạo lại. Hệ thống tự chặn liên kết sai cấp và vòng lặp.',
    ],
  },
  {
    date: '10/08/2026 (Tạo OKR bằng cửa sổ pop-up)',
    items: [
      'Nút "+ Tạo OKR" ở trang OKR nay mở CỬA SỔ pop-up ngay tại chỗ (thay vì chuyển sang trang riêng); tạo xong tự đóng cửa sổ và làm mới cây OKR để thấy mục tiêu mới — đồng bộ với cách tạo Công việc / Dự án / OKR cá nhân.',
    ],
  },
  {
    date: '10/08/2026 (Tạo OKR con ngay trong OKR cha)',
    items: [
      'Màn hình chi tiết OKR: khối "OKR con (alignment xuống)" có nút "+ Tạo OKR con" ở góc phải-trên, LUÔN hiện (trước đây chỉ hiện khi chưa có OKR con nào).',
      'Bấm mở cửa sổ tạo nhanh OKR con: chọn cấp con hợp lệ + đơn vị trong nhánh của cha + người chủ trì + Key Result; tự kế thừa kỳ & viễn cảnh BSC của cha; lưu xong đóng + hiện ngay tại chỗ.',
    ],
  },
  {
    date: '10/08/2026 (Mọi người tự tạo công việc cá nhân)',
    items: [
      'Nút "+ Tạo công việc" ở trang Công việc nay hiện cho MỌI người. Nhân viên tạo được VIỆC CÁ NHÂN của mình bằng một form gọn (tên, mô tả, trạng thái, ưu tiên, ngày) — tự giao cho chính mình, không cần gắn OKR/dự án.',
      'Việc cá nhân hiện ngay ở trang "Của tôi" và "Công việc"; chính chủ toàn quyền cập nhật, sửa, xoá. Quản lý vẫn dùng form đầy đủ (giao cho người khác, gắn OKR/dự án/ngân sách).',
    ],
  },
  {
    date: '06/08/2026 (Bấm công việc: xem chi tiết trước, sửa sau)',
    items: [
      'Bấm vào một công việc nay mở CHI TIẾT (chỉ xem) gọn gàng — tiêu đề, trạng thái, phụ trách, đơn vị, hạn, ngân sách, phụ thuộc. Muốn chỉnh thì bấm nút "✏️ Sửa" mới vào form chỉnh sửa; ai không có quyền sửa chỉ thấy phần xem.',
      'Cách hiển thị "xem trước, sửa sau" nay áp dụng NHẤT QUÁN ở MỌI nơi mở công việc: trang Công việc, "Của tôi", và cả thẻ việc trong trang Dự án · Cuộc họp · chi tiết OKR.',
    ],
  },
  {
    date: '06/08/2026 (Phân quyền xem OKR theo đơn vị cho Nhân viên)',
    items: [
      'Nhân viên (staff) nay chỉ XEM OKR trong phạm vi ĐƠN VỊ MÌNH (đơn vị + cấp trên align lên: Khối/Công ty), KHÔNG thấy OKR các khối khác. Điều hành & Giám đốc khối/Trưởng phòng vẫn xem toàn bộ (minh bạch quản lý).',
      'Chế độ CHỈ XEM cho nhân viên — không có nút sửa. Mở nhầm OKR khối khác qua link trực tiếp → báo "Ngoài phạm vi xem".',
    ],
  },
  {
    date: '06/08/2026 (Của tôi: tổng quan công việc + mở chi tiết việc)',
    items: [
      'Trang "Của tôi" thêm 4 ô tổng quan công việc cá nhân: Tổng công việc · Đang làm · Quá hạn · Đã hoàn thành. Bấm mỗi ô → mở trang Công việc đã lọc sẵn (truy vết).',
      'Bấm một công việc ở "Của tôi" nay MỞ THẲNG chi tiết việc đó (popup) thay vì nhảy ra OKR chung; link "Mở OKR" vẫn giữ ở cột cuối.',
    ],
  },
  {
    date: '06/08/2026 (Hồ sơ 360° người dùng — bấm vào tên để mở)',
    items: [
      'Bấm vào TÊN người (chủ trì OKR ở "Toàn bộ OKR"/chi tiết OKR, người phụ trách ở trang Công việc, danh sách Người dùng) → mở HỒ SƠ 360°: định danh, đơn vị, số liệu tổng quan (OKR/KR/dự án/việc/quá hạn/họp).',
      'Phân quyền: quản trị (CEO/CFO) xem ĐẦY ĐỦ (chi tiết OKR/dự án/việc/check-in/đăng nhập/nhật ký); người thường xem bản CƠ BẢN (định danh + số lượng).',
      'Sửa lỗi 500 khi mở hồ sơ (truy vấn tiến độ dự án sai cột) — nay tính đúng theo bình quân việc con.',
    ],
  },
  {
    date: '06/08/2026 (Đồng bộ TOÀN HỆ THỐNG: dropdown đơn vị theo cây + tìm kiếm)',
    items: [
      'MỌI ô chọn/lọc đơn vị trong app nay đi THEO CÂY tổ chức: mỗi Phòng nằm ngay dưới Khối của nó (thụt cấp, dấu ↳) thay vì gom phẳng tất cả Phòng xuống cuối — dễ tìm đúng đơn vị theo tuyến báo cáo.',
      'Thêm ô TÌM KIẾM (gõ tên, không phân biệt dấu) vào các dropdown đơn vị: Scorecard KPI, bộ lọc "Toàn bộ OKR", bộ lọc trang Công việc, và mọi form gán đơn vị phụ trách (việc, dự án, cuộc họp, OKR, người dùng).',
    ],
  },
  {
    date: '05/08/2026 (Ràng buộc waterfall giữa công việc)',
    items: [
      'Công việc nay có thể PHỤ THUỘC vào việc khác cùng OKR (waterfall): mở việc ở trang Công việc → mục "⏳ Phụ thuộc vào (việc phải xong trước)" chọn nhiều việc tiên quyết. Chống vòng lặp tự động.',
      'Việc nào còn chờ việc trước chưa xong sẽ hiện nhãn tím "⏳ Chờ N việc" (di chuột xem danh sách) — cảnh báo mềm, không khoá thao tác. Hiện ở CẢ 3 chế độ: Danh sách · Kanban · Gantt.',
      'Tự audit: trang Toàn vẹn (/integrity) thêm cảnh báo "Việc phụ thuộc vào việc khác OKR" — bắt ràng buộc gắn nhầm vắt qua 2 OKR (truy vết đích danh từng việc).',
    ],
  },
  {
    date: '05/08/2026 (Cuộc họp: nhiều đồng chủ trì & thư ký)',
    items: [
      'Cuộc họp nay cho phép NHIỀU đồng chủ trì và NHIỀU thư ký (ô chọn nhiều người). Tất cả — chủ trì chính, đồng chủ trì, mọi thư ký — đều có quyền sửa TOÀN BỘ nội dung cuộc họp (thông tin, biên bản, quyết định, thêm việc).',
    ],
  },
  {
    date: '05/08/2026 (Ô chọn OKR/người/dự án có TÌM KIẾM)',
    items: [
      'Mọi danh sách dài (OKR, người phụ trách, dự án, đơn vị) khi tạo/sửa việc, cuộc họp, OKR, dự án nay là ô chọn CÓ TÌM KIẾM: bấm vào gõ vài chữ để lọc nhanh (không phân biệt dấu — "doanh thu" khớp cả có dấu), thay vì cuộn cả danh sách.',
      'Áp dụng cho: Thêm/sửa việc (cuộc họp · dự án · Kanban/Danh sách · Lịch), tạo/sửa OKR, tạo/sửa dự án — chọn OKR, Key Result, người, đơn vị, dự án đều gõ để tìm.',
    ],
  },
  {
    date: '05/08/2026 (Lịch tháng đẹp & chuyên nghiệp hơn)',
    items: [
      'Lịch xem Tháng nay lấp đầy ngày "tràn" của tháng trước/sau (hiển thị mờ) như Google/Apple — hết ô trống trơ và hàng cuối chỉ có 1 ngày lẻ loi; lưới gọn, đều, dễ đọc trên máy tính.',
      'Thêm nền ấm nhẹ cho cột cuối tuần (T7/CN) + tiêu đề thứ đậm hơn, ô "hôm nay" viền nổi rõ — nhìn cân đối, chuyên nghiệp hơn.',
    ],
  },
  {
    date: '04/08/2026 (Form mẫu & Nhập OKR hàng loạt qua Excel)',
    items: [
      'Trang OKR thêm nút "⬇ Form mẫu": tải file Excel mẫu (4 sheet Hướng dẫn/Objectives/KeyResults/Initiatives + dòng ví dụ + bảng giá trị hợp lệ) để điền rồi nhập lại — khai nhiều OKR/KR/công việc một lượt cho nhanh.',
      'Nhập Excel nay TẠO MỚI được cả Objective và Key Result (trước chỉ tạo mới công việc): để trống cột "Mã" = tạo mới; đặt "mã tạm" (vd T1) ở Objective để nối KR/việc vào OKR mới; điền mã thật đã có = cập nhật. Kết quả báo rõ số tạo mới & cập nhật cho từng loại.',
    ],
  },
  {
    date: '04/08/2026 (Form tạo OKR làm lại theo cascade)',
    items: [
      'Form tạo OKR đi theo đúng chuỗi: Cấp OKR → (Đơn vị nếu Khối/Phòng) → Viễn cảnh BSC → Liên kết lên OKR CHA (chỉ hiện cấp TRÊN hợp lệ: Công ty→Trụ cột chiến lược 5 năm; Khối→OKR Công ty; Phòng→OKR Khối — lọc theo thẻ BSC, có nút xem tất cả) → Mục tiêu → Key Results (nhập ngay tại form, không giới hạn) → Loại OKR → Mô tả → Chủ trì.',
      'Ẩn ô Đơn vị khi cấp Công ty/Cá nhân; chỉ hiện Cấp OKR mà bạn có quyền tạo; chủ trì mặc định thông minh (Công ty→CEO, Khối→GĐ khối, Phòng→TP, Cá nhân→mình) nhưng vẫn assign được; bỏ ô Trạng thái (mặc định Đang chạy).',
    ],
  },
  {
    date: '04/08/2026 (Sửa lỗi tạo OKR + Nhật ký lỗi hệ thống)',
    items: [
      'SỬA lỗi không tạo được OKR (nhất là cấp Công ty): bộ đếm mã bị lệch so với mã đã seed → sinh trùng mã (lỗi 23505). Nay sinh mã TỰ CHỐNG LỆCH (ép qua số lớn nhất đang tồn tại) cho OKR/KR/Việc/Dự án.',
      'Thêm NHẬT KÝ LỖI hệ thống: lỗi server/render tự ghi lại (qua error boundary → /api/errlog) kèm digest; xem ở Quản trị → "Nhật ký lỗi hệ thống" (đếm lỗi mới), đánh dấu đã xử lý. Người dùng gặp lỗi thấy thông báo thân thiện + nút thử lại thay vì trang lỗi trơ.',
    ],
  },
  {
    date: '04/08/2026 (Sắp xếp trụ cột chiến lược)',
    items: [
      'Trang Chiến lược: CEO/CFO sắp xếp lại thứ tự các trụ cột (OKR 5 năm cấp Công ty) theo logic — KÉO–THẢ tay cầm ⠿ trên máy tính hoặc bấm ▲/▼ (chạy tốt trên điện thoại). Thứ tự lưu tự động (cột sort).',
    ],
  },
  {
    date: '04/08/2026 (Menu mobile gọn hơn)',
    items: [
      'Ẩn nút "lên đầu trang" khi đang mở menu trên điện thoại để không che các mục cuối (Quản trị / Đăng xuất). Menu mobile hiện đủ 5 nhóm theo phân quyền.',
    ],
  },
  {
    date: '04/08/2026 (Tìm người dùng ở Phân quyền)',
    items: [
      'Quản trị → Người dùng: thêm ô TÌM theo tên/email/chức danh (không phân biệt dấu) ngay trên bảng — lọc tức thì, hiện số kết quả.',
    ],
  },
  {
    date: '04/08/2026 (Droplist có tìm kiếm)',
    items: [
      'Form cuộc họp: các ô chọn danh sách dài (Chủ trì · Thư ký · Khối/Phòng · Dự án · Cuộc họp trước) nay CÓ Ô TÌM KIẾM — gõ vài chữ (không cần dấu) để lọc nhanh thay vì cuộn cả danh sách.',
    ],
  },
  {
    date: '04/08/2026 (Ngân sách: bấm đơn vị xem chi tiết)',
    items: [
      'Bảng "Ngân sách theo khối/đơn vị": bấm vào TÊN ĐƠN VỊ để mở popup liệt kê các dự án của đơn vị đó + hạng mục ngân sách (kế hoạch/đã chi/%) — thay cho nút "Chi tiết" ở cột cuối hay bị khuất trên điện thoại.',
    ],
  },
  {
    date: '04/08/2026 (Cuộc họp: trạng thái "Đã diễn ra")',
    items: [
      'Cuộc họp còn "Đã lên lịch" nhưng giờ họp đã QUA sẽ tự hiển thị "Đã diễn ra" (không đổi dữ liệu — chủ trì vẫn có thể đánh dấu "Đã họp" khi ghi biên bản).',
    ],
  },
  {
    date: '04/08/2026 (Nhãn ô nhập dễ đọc hơn)',
    items: [
      'Toàn hệ thống: nhãn (đầu đề) các ô nhập trong biểu mẫu đổi sang màu maroon dịu, TÁCH RÕ với chữ nhập (màu đậm) để dễ đọc, chuyên nghiệp hơn.',
    ],
  },
  {
    date: '04/08/2026 (Lịch xem Ngày/Tuần/Tháng)',
    items: [
      'Trang Lịch thêm 3 chế độ xem: Ngày (danh sách chi tiết) · Tuần (7 cột) · Tháng (lưới, mặc định). Điều hướng ← / → lùi–tiến theo đúng chế độ đang xem.',
    ],
  },
  {
    date: '04/08/2026 (Chọn người tham gia họp nhanh)',
    items: [
      'Ô "Người tham gia" của cuộc họp: gõ tên/email → GỢI Ý từ danh sách người dùng để chọn nhanh (hiển thị dạng thẻ). Người chưa có trong hệ thống thì tự nhập; nếu thiếu "@" sẽ tự điền đuôi @baotinmanhhai.vn.',
    ],
  },
  {
    date: '04/08/2026 (Báo cáo tổng quan Công việc)',
    items: [
      'Trang Công việc thêm BÁO CÁO TỔNG QUAN: 4 ô chỉ số + biểu đồ tròn trạng thái + biểu đồ phân bổ theo Bộ phận/Dự án/Người/Ưu tiên. Bấm ô/nhánh/thanh để LỌC nhanh danh sách (drill-down truy vết).',
    ],
  },
  {
    date: '04/08/2026 (Lịch nâng cấp kiểu Google/Apple)',
    items: [
      'Trang Lịch làm lại: ô ngày ĐỀU kích thước, sự kiện cắt gọn "…" (điện thoại hiện chấm màu). BẤM VÀO NGÀY mở chi tiết + THÊM NHANH cuộc họp/công việc (điền sẵn ngày). Bộ lọc phạm vi "Của tôi" (mặc định) / "Tất cả bộ phận" (chỉ CEO/CFO).',
    ],
  },
  {
    date: '04/08/2026 (Hồ sơ 360° người dùng)',
    items: [
      'Bấm tên người dùng (Quản trị → Người dùng) mở hồ sơ 360°: định danh + số OKR/dự án/việc/họp. QUẢN TRỊ xem thêm CHI TIẾT (danh sách + hoạt động) và ĐĂNG NHẬP (số lần, gần nhất — theo dõi từ nay). Người thường chỉ xem số lượng.',
    ],
  },
  {
    date: '04/08/2026 (Trang Công việc: Kanban + Gantt · bình luận · rõ nhãn Dự án)',
    items: [
      'Trang Công việc (/tasks) thêm 2 chế độ xem: Kanban (kéo–thả đổi trạng thái) và Dòng thời gian (Gantt) — như trang Dự án/OKR. Nhớ lựa chọn ở máy.',
      'Mỗi công việc nay có khung BÌNH LUẬN ngay trong popup sửa (ở mọi màn hình việc).',
      'Nhãn loại chỉ hiện khi nút THỰC SỰ có việc con ("Dự án"/"Tiểu dự án"); việc lẻ KHÔNG hiện nhãn "Công việc" (thừa) — tiêu đề chảy inline, không xuống dòng lệch. Áp ở trang Công việc + list/kanban/gantt + popup.',
    ],
  },
  {
    date: '04/08/2026 (Gắn/đổi OKR cho công việc ngay trong popup sửa)',
    items: [
      'Popup sửa công việc (trang OKR/Dự án/Cuộc họp) thêm mục "🎯 Thuộc OKR": chọn OKR (và Key Result tuỳ chọn) để map việc vào đúng OKR — kể cả việc thuần cuộc họp/dự án chưa gắn OKR. Có kiểm quyền: chỉ gắn được vào OKR bạn có quyền sửa; việc luôn còn ít nhất một điểm neo (OKR/dự án/cuộc họp).',
    ],
  },
  {
    date: '04/08/2026 (Sửa lỗi bố cục popup Sửa cuộc họp + link Cuộc họp ở chuỗi chiến lược)',
    items: [
      'Sửa lỗi popup "Sửa cuộc họp" bị vỡ bố cục (các trường dồn thành cột dọc, tràn phải) — do form trong popup thừa kế style từ ".row-actions"; đã cô lập lại. Áp cho MỌI popup đặt cạnh nút hành động.',
      'Trang Chiến lược: thêm "🗓 Cuộc họp" vào chuỗi thực thi (KPI · Dự án · Công việc · Cuộc họp).',
    ],
  },
  {
    date: '04/08/2026 (Biên bản cuộc họp: soạn thảo có định dạng WYSIWYG)',
    items: [
      'Ô "Biên bản" và "Quyết định chính" nay là trình soạn thảo WYSIWYG: đậm/nghiêng/gạch chân/tiêu đề/danh sách/trích dẫn/liên kết. Nội dung lưu dạng HTML đã được LÀM SẠCH (chống XSS) và hiển thị đúng định dạng.',
    ],
  },
  {
    date: '04/08/2026 (Cuộc họp: thêm việc + view list/kanban/gantt + nối chuỗi)',
    items: [
      'Mỗi cuộc họp thêm được CÔNG VIỆC (next action) ngay tại thẻ "Hành động" (gắn OKR tuỳ chọn); xem theo Danh sách/Kanban/Gantt như trang Dự án (kéo–thả, bộ lọc đầy đủ).',
      'Nối CHUỖI cuộc họp: chọn "Cuộc họp trước" khi tạo/sửa → link "← Trước / Tiếp →" đi lại giữa các kỳ họp.',
      'Việc thuần của cuộc họp (không gắn OKR) nay lưu được (nới ràng buộc) và hiện chip 🗓 truy vết ở trang Công việc.',
      'Nút "🗑 Xoá công việc" nay có ở MỌI màn hình việc (OKR · Dự án · Cuộc họp · trang Công việc) cho người có quyền quản lý (tách khỏi thao tác thêm mục con).',
    ],
  },
  {
    date: '04/08/2026 (Ngân sách: sổ chi tiết + template CSV + popup theo khối)',
    items: [
      'Sổ CHI TIẾT ngân sách theo hạng mục (okr_budget_lines): dự án tách được nhiều dòng hạng mục kế hoạch/thực chi.',
      'Popup "Chi tiết" ở mỗi khối/đơn vị: xem cơ cấu chi phí (dự án + hạng mục) — trace-back.',
      'Template CSV: "Xuất template" tải CSV (sửa Excel) · "Import CSV" nạp lại theo mã dự án + hạng mục.',
      'Nút "Đồng bộ BigQuery" cho thực chi (plumbing sẵn, chờ BI chốt nguồn chi phí gắn mã dự án).',
      'Trang Toàn vẹn: thêm cảnh báo "Ngân sách chi tiết lệch với ngân sách dự án" (>5%).',
    ],
  },
  {
    date: '04/08/2026 (Gắn công việc vào cuộc họp)',
    items: [
      'Sửa công việc (trang OKR / Dự án) có thêm mục "🗓 Thuộc cuộc họp" → chọn cuộc họp để biến công việc thành một "hành động" của cuộc họp; hiện ở mục "Hành động" của cuộc họp + chip 🗓 truy vết ngược trên thẻ việc.',
    ],
  },
  {
    date: '03/08/2026 (Ngân sách: chọn kỳ + lọc trạng thái dự án)',
    items: [
      'Trang Ngân sách: thêm bộ chọn KỲ (mặc định kỳ hiện tại) và bộ lọc trạng thái dự án (Đang chạy/Tạm dừng/Hoàn thành/Lưu trữ/Tất cả) — mặc định "Đang chạy" cho gọn.',
    ],
  },
  {
    date: '03/08/2026 (Bổ sung layer dưới "Thương hiệu vàng Quốc dân")',
    items: [
      'Thêm 3 OKR con dưới CTY-011 "Thương hiệu vàng Quốc dân": Khách hàng (CTY-012) · Cửa hàng (CTY-013) · Doanh thu (CTY-014), mỗi cái 1 KR mốc theo Financial Model 2026 (CFO chỉnh mục tiêu năm nếu cần).',
    ],
  },
  {
    date: '03/08/2026 (Trang Quản trị gọn gàng theo nhóm + hướng dẫn bắt đầu)',
    items: [
      'Sắp xếp lại trang Quản trị theo 4 nhóm (Nền tảng tổ chức · Đo lường & thiết lập · Tự động hoá & dữ liệu · Bắt đầu nhanh) + thẻ có icon.',
      '"Bắt đầu nhanh": trình tự thiết lập từng bước có LINK tới đúng nơi + nút chạy hướng dẫn trên màn hình + mở hướng dẫn đầy đủ.',
    ],
  },
  {
    date: '03/08/2026 (Lịch tháng — công việc · cuộc họp · check-in)',
    items: [
      'Thêm trang "Lịch" (menu Tổng quan): lịch tháng gom công việc theo hạn, cuộc họp, check-in OKR; bấm sự kiện mở chi tiết; chuyển tháng / về Hôm nay.',
    ],
  },
  {
    date: '03/08/2026 (Module Cuộc họp — biên bản + hành động + phân quyền xem)',
    items: [
      'Thêm "Cuộc họp" (menu Tổng quan): tạo cuộc họp theo loại, ghi biên bản & quyết định, theo dõi hành động; danh sách + chi tiết chuyên nghiệp.',
      'Bảo mật nội dung theo người tham gia/được thêm (hoặc toàn đơn vị/công ty). Người ngoài gửi "yêu cầu xem" → chủ trì/thư ký duyệt; có thông báo cho cả hai chiều.',
    ],
  },
  {
    date: '03/08/2026 (Lọc việc của tôi ở mọi màn · link minh chứng check-in)',
    items: [
      'Khu Dự án/Công việc trong OKR (và trang Công việc) đều có tick "👤 Việc của tôi" để lọc nhanh việc mình phụ trách.',
      'Check-in KR: thêm ô "Link minh chứng" (tùy chọn) — nếu điền sẽ kiểm URL hợp lệ; hiển thị nút 🔗 Minh chứng ở dòng check-in.',
    ],
  },
  {
    date: '03/08/2026 (Điều lệ dự án — Project Charter)',
    items: [
      'Mỗi dự án có thẻ "Điều lệ dự án (Project Charter)" theo best-practice: Bối cảnh · Mục tiêu · Trong/Ngoài phạm vi · Sản phẩm bàn giao · Cột mốc · Các bên liên quan · Nhà tài trợ · Rủi ro & giả định · Tiêu chí thành công. Khai báo/sửa bằng popup ở góc phải-trên; hiển thị gọn khi mở dự án.',
    ],
  },
  {
    date: '03/08/2026 (Trang Quản trị ngân sách)',
    items: [
      'Thêm trang "Ngân sách" (menu Thực thi, chỉ CEO/CFO): tổng hợp Kế hoạch · Đã chi · Còn lại · % đã dùng; bảng theo dự án (bấm vào chi tiết) và theo khối. "Đã chi" gom từ ngân sách công việc.',
    ],
  },
  {
    date: '03/08/2026 (Ẩn việc đã xong cho danh sách gọn)',
    items: [
      'Trang Công việc và khu Dự án/Công việc của OKR: thêm bộ lọc "Ẩn việc đã xong" — BẬT sẵn để danh sách gọn, bỏ chọn khi cần xem lại việc đã hoàn thành.',
    ],
  },
  {
    date: '03/08/2026 (Hướng dẫn nhanh trên màn hình cho người mới)',
    items: [
      'Thêm "Hướng dẫn nhanh" (product tour): tự chạy lần đầu đăng nhập, chỉ từng bước ngay trên giao diện (spotlight + bong bóng), có Tiếp/Quay lại/Bỏ qua + phím mũi tên.',
      'Bật lại bất cứ lúc nào: nút "🧭 Hướng dẫn nhanh" ở Bảng điều khiển, hoặc trong trang Hướng dẫn.',
    ],
  },
  {
    date: '03/08/2026 (Trang Cài đặt cá nhân · thông báo chi tiết theo loại)',
    items: [
      'Thêm trang "Cài đặt cá nhân" (bấm TÊN bạn ở góc phải header): hồ sơ + bật/tắt TỪNG loại thông báo và email.',
      'Chuông 🔔 nay mở thẳng DANH SÁCH thông báo (tuỳ chọn dời sang Cài đặt cá nhân).',
      'Thêm loại thông báo: "bình luận trên OKR/việc bạn phụ trách" (ngoài @nhắc & trả lời). Mỗi loại tôn trọng tuỳ chọn của người nhận.',
    ],
  },
  {
    date: '03/08/2026 (Tạo dự án bằng popup góc phải-trên)',
    items: [
      'Trang Dự án: bỏ form "Dự án mới" ở cuối trang → nút "Dự án mới" ở góc phải-trên mở popup (tạo xong tự đóng + hiện ngay). Chỉ người có quyền tạo mới thấy nút.',
    ],
  },
  {
    date: '03/08/2026 (Trace-back: bảng/danh sách bấm được vào chi tiết)',
    items: [
      'Trang Họp điều hành: các bảng "OKR cần chú ý", "Việc quá hạn", "KPI cần can thiệp", "Điểm hở" → bấm mỗi hàng vào đúng trang chi tiết.',
      '"Việc đang mở của tôi" (Của tôi) + thanh Viễn cảnh BSC ở Bảng điều khiển → bấm vào OKR/bản đồ tương ứng.',
    ],
  },
  {
    date: '03/08/2026 (Sửa icon dropdown · rõ nghĩa cột "Thuộc dự án" · tự-audit chính xác dữ liệu)',
    items: [
      'Sửa lỗi icon trong menu dropdown (trước render ra chữ tên icon) → nay hiện icon line maroon đúng chuẩn.',
      'Trang Công việc: đổi tên cột "Dự án" → "Thuộc dự án" (dự án xuyên-OKR mã PRJ) để KHÔNG lẫn với nhãn "Loại: Dự án" (kiểu nút trong cây thực thi). Thêm chú thích cột.',
      'Tự-audit độ chính xác: /integrity thêm rule "Việc gắn dự án khác kỳ với OKR gốc" — tự lộ việc gắn nhầm dự án khác kỳ.',
    ],
  },
  {
    date: '03/08/2026 (Icon menu đơn sắc chuyên nghiệp · nút thao tác gọn 1 dòng)',
    items: [
      'Thay icon emoji ở menu bằng ICON LINE đơn sắc theo tông thương hiệu: vàng BTMH trên nền maroon (thanh menu), maroon trên nền trắng (dropdown/mobile) — sắc nét, đồng bộ, nổi bật.',
      'Thư viện KPI: cụm nút thao tác mỗi hàng gom thành 3 nút icon vuông gọn (Sửa · Ẩn/Bật · Xoá) trên MỘT dòng — hết cảnh nút Xoá bị rớt xuống dòng.',
    ],
  },
  {
    date: '03/08/2026 (Sửa gọn bằng popup ở góc phải-trên · Thư viện KPI đẹp hơn)',
    items: [
      'Chuẩn hoá thao tác Sửa/Khai báo: nút gọn đặt ở GÓC PHẢI-TRÊN của đúng box, bấm mở popup — thay cho khối form dài ở cuối trang. Áp cho trang Chiến lược (nút "Sửa chiến lược") và sẽ nhân rộng toàn hệ thống. Nút Sửa/Xoá/Thêm chỉ hiện với người có quyền.',
      'Thư viện KPI: bỏ form bung dài trong bảng; mỗi hàng có cụm nút gọn Sửa (popup) · Ẩn · Xoá; nút "Thêm KPI" ở góc phải-trên. Gọn gàng, chuyên nghiệp hơn.',
    ],
  },
  {
    date: '03/08/2026 (Tách CEO/CFO · icon menu · kết quả KPI tại chỗ)',
    items: [
      'Tách vai trò gộp "CEO/CFO" thành 2 vai trò RIÊNG: CEO và CFO (cùng cấp điều hành, toàn quyền). Dữ liệu cũ (exec) tự chuyển sang CFO; chỉnh lại từng người ở Người dùng → Sửa.',
      'Menu (thanh trên + dropdown + panel mobile) có ICON nhận diện cho từng mục & từng cụm — dễ quét nhanh.',
      'Thư viện KPI: thêm cột "Kết quả" hiện SỐ THỰC (cấp Công ty, kỳ hiện tại) ngay tại chỗ, tô màu theo Watch/Alert/Escalate; bấm mở popup chi tiết (thực hiện · mục tiêu · % đạt · trạng thái · nguồn · ngưỡng · ghi chú) kèm biểu đồ XU HƯỚNG qua các kỳ.',
    ],
  },
  {
    date: '03/08/2026 (Sửa quyền người dùng ngay tại bảng)',
    items: [
      'Màn hình "Người dùng & phân quyền": mỗi dòng thêm nút "Sửa" mở popup chỉnh Vai trò · Đơn vị · Nhóm quyền · Họ tên · Chức danh (dùng lại saveUserAction; Nhóm quyền chỉ người có quyền phân quyền đổi được).',
      'Sửa thông tin KHÔNG còn tự mở khoá tài khoản đang bị khoá (trạng thái do nút Khoá/Mở quyết định).',
    ],
  },
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
