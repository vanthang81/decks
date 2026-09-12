# okr-portal — Hệ thống OKR/KPI/Action plan/Ngân sách BTMH · Ngữ cảnh cho Claude

App điều hành OKR nội bộ của **Bảo Tín Mạnh Hải (BTMH)**. Chủ dự án: **Thắng Nguyễn (CFO)**.
Phân quyền theo cây tổ chức **CEO/CFO → Giám đốc khối → Trưởng phòng → Nhân viên**, đăng nhập Google.
Dự kiến live tại `okr.consultx.vn`.

## Chiến lược công ty (đỉnh chuỗi) — trang `/strategy` + số liệu chuẩn từ FM
- `src/lib/strategy.ts` (get/setCompanyStrategy → okr_settings key `company_strategy`; listStrategicPillars = OKR
  multiyear cấp Công ty). Trang `/strategy` hiện Tầm nhìn/Sứ mệnh/Giá trị/Khát vọng + sơ đồ chuỗi + trụ cột + BSC;
  exec sửa qua form. Đã điền sẵn từ KB (Outline "Chiến lược ESG 2030") — `db/280_seed_company_strategy.sql`.
- **SỐ LIỆU CHUẨN = Financial Model "Project Imperial v52.1"** (đơn vị **VNDm — triệu đồng**). Cột năm 2023–2030.
  Cửa hàng (Total Cumulative) **2030 = 261** (2026→30: 80·159·208·241·261). Doanh thu thuần: 2025 **27.891 tỷ** →
  2026 73.841 tỷ → **2030 ~180.346 tỷ**. LNST: 2025 **774 tỷ** → 2026 1.562 tỷ → **2030 ~5.015 tỷ**. Mix vàng đầu tư
  24K giảm 96%→79%, Trang sức 24K + quà tặng + bạc tăng dần. ⚠️ Khi trích số chiến lược/kế hoạch, LẤY THEO FM này
  (số cũ >300 CH / KB ESG có thể lỗi thời). PDF "Chiến lược KD 2026–2030 (bản đẹp)" là ảnh/CID font — KHÔNG OCR
  được trong sandbox (no poppler; pypdf panic) → narrative lấy từ KB, số lấy từ FM.

## ⭐ YÊU CẦU THƯỜNG TRỰC VỀ UI/UX (CFO nhấn mạnh — áp cho MỌI thay đổi, KHÔNG cần nhắc lại)
Mọi tính năng/màn hình phải **đẹp, chuyên nghiệp, gọn gàng (neat), user-friendly** — **CẢ trên
DESKTOP LẪN MOBILE (responsive)**. Cụ thể: thông tin quan trọng hiển thị ngay tại chỗ (không bắt mở
popup mới thấy); dữ liệu trình bày kèm **ý nghĩa/insight** (vd trọng số KR kèm % đóng góp roll-up);
thao tác có phản hồi rõ (toast "đã lưu", tự đóng form); xoá luôn có popup xác nhận; canh lề/thụt
cấp/icon nhất quán; mỗi thao tác sửa mở popup gọn, nhãn căn trái.
- **MOBILE (bắt buộc)**: mỗi khi thêm/sửa layout PHẢI kiểm bố cục ở màn hẹp (~390px): tránh cột cố
  định `width:150/200px` cạnh nhau (dùng class + media query để xếp DỌC hoặc gộp 1 dòng, KHÔNG để nút
  trôi giữa màn); breakpoint dùng `@media (max-width:640px)` (và 760px cho lưới/row đã có sẵn);
  `.row > *` tự full-width ≤760px; bảng bọc `.table-scroll`; nút đủ lớn để bấm; header thu gọn hamburger.
- **Tự chủ động rà UI/UX (desktop + mobile) mỗi lần đụng màn hình** — CFO không phải nhắc lại.
- **PHẢN HỒI THÀNH CÔNG cho MỌI nút/form (BẮT BUỘC — CFO 12/09, "không bao giờ để bấm mà im lặng")**:
  mọi thao tác lưu/xoá/cập nhật PHẢI hiện toast ("Đã lưu / Đã xoá / Đã cập nhật…") khi xong. Hạ tầng dùng
  chung: (1) **`ToastForm`** (`src/components/ToastForm.tsx`) thay `<form action={serverAction}>` cho FORM
  INLINE (ở lại trang, revalidate) — tự toast `done` khi xong / toast lỗi khi ném; (2) action ĐIỀU HƯỚNG
  (redirect) → thêm flash param vào URL rồi để **`FlashToaster`** (`src/components/FlashToaster.tsx`, MAP:
  saved/ok/err/deleted/kpi/digest/test/chk/pruned/cleared…) bắt & toast; (3) client component gọi action
  imperative (modal, kéo–thả, bulk) → gọi **`useToast().toast(...)`** ngay sau khi action thành công (mẫu:
  `EditModal` toast sẵn `toastMsg` → mọi modal bọc EditModal tự có toast). **TUYỆT ĐỐI KHÔNG dùng `alert()`
  cho kết quả** (dùng toast). Thêm nút/form/tab mới ⇒ tự gắn 1 trong 3 cơ chế trên; đừng để `<form action=>`
  trơ hay handler client không toast.
- **DROPDOWN/Ô CHỌN PHẢI LUÔN ĐỌC ĐƯỢC (BẮT BUỘC — CFO 12/09, "không bao giờ nhắc lại")**: mọi ô chọn
  dùng `SearchSelect` (`src/components/SearchSelect.tsx`) — danh sách xổ TỰ RỘNG theo nội dung (panel
  `min-width:100%` → `max-width:min(560px,92vw)`) và mỗi mục **XUỐNG DÒNG, KHÔNG cắt cụt "..."**
  (`.ss-opt-main/.ss-opt-sub` white-space:normal, globals.css) → tên dài (OKR, đơn vị) đọc đủ. Với thực
  thể có MÃ/đơn vị (OKR, KR, dự án…): đặt **TÊN làm dòng chính (`label`)** + **`mã · đơn vị` làm dòng phụ
  mờ (`sub`)** thay vì nhồi hết vào 1 chuỗi — SearchSelect render 2 dòng sẵn. Tra cứu tìm được cả `label`
  lẫn `sub`. Thêm ô chọn mới ⇒ theo mẫu này (đừng nhồi mã+đơn vị+tên vào 1 `label` dài rồi để bị cắt).
- **CÔNG VIỆC: LUÔN hiện CẢ "Phụ trách" (assignee) LẪN "Người giao" (assigner) — CFO 12/09**: mọi màn hình
  liệt kê công việc phải cho thấy người được giao VÀ người giao việc. Nguồn = `owner_email`→`owner_name`
  (phụ trách) và `created_by`→`creator_name`/`creator_avatar` (người giao) — đã có sẵn trong `TaskRow`
  & `Initiative` (JOIN `okr_users cu` trong `src/lib/initiatives.ts`). Bảng (TaskExplorer) = cột riêng
  "Người giao"; layout gọn (Kanban/cây/Của tôi/popup) = dòng "giao bởi …"; khi `created_by == owner_email`
  hiện nhãn "tự giao" thay vì lặp tên. Thêm màn hình/việc mới ⇒ giữ đúng cặp cột này.
- **TƯƠNG PHẢN MÀU CHỮ — CHUẨN WCAG AA (CFO 11/09, "không bao giờ để chữ khó đọc")**: mọi chữ phải đạt
  tương phản ≥ 4.5:1 (chữ thường) / ≥ 3:1 (chữ lớn ≥18.66px đậm hoặc ≥24px, và biểu tượng/thanh/chấm đồ
  hoạ). TUYỆT ĐỐI KHÔNG: chữ trắng trên nền sáng (chỉ dùng trắng trên nền maroon `--primary`/đỏ/tối);
  chữ **vàng `--accent` (#C8A951) làm CHỮ trên nền sáng** (vàng chỉ dùng trên nền maroon, hoặc làm
  icon/chấm/viền — không làm chữ đọc trên trắng); màu xanh "hoàn thành" khi làm CHỮ/SỐ phải dùng
  `#15803d` (green-700, đạt AA) — KHÔNG dùng `#16a34a` (green-600) cho chữ thường (chỉ hợp làm chấm/
  thanh/số lớn). Nút ghost/link trên popup nền sáng của header phải override lại `.btn.ghost` (mặc định
  là trắng cho thanh maroon). Khi thêm/sửa màu chữ ⇒ tự nhẩm tương phản trước khi giao.
- **Desktop và mobile KHÔNG bắt buộc giống hệt** (CFO 01/08): được phép bố trí KHÁC nhau cho mỗi
  kích thước, miễn MỖI bên đều đẹp/chuyên nghiệp/tối ưu. Vd bảng/bar nhiều cột: desktop xếp 1 dòng
  (nhãn · thanh · số); mobile tách nhãn xuống dòng riêng đầy đủ + thanh/số dòng dưới (không cắt cụt).
  → Ưu tiên "đẹp & dễ đọc theo từng kích thước" hơn là ép cùng một layout co giãn.
- **TRACE-BACK BẮT BUỘC (CFO 02/08 — áp cho MỌI báo cáo/cảnh báo/tổng hợp, KHÔNG cần nhắc lại)**: mọi
  CON SỐ đếm/tổng hợp (cảnh báo, health, KPI W/A/E, đếm "chưa cascade/chưa có việc"…) PHẢI **bấm được
  → dẫn tới danh sách ĐÍCH DANH** các mục cấu thành, mỗi mục có link tới trang chi tiết gốc (OKR→
  `/objectives/[id]`, KPI→`/kpi`, Dự án→`/projects/[id]`). Không để "số trơ" không truy vết được.
  Mẫu chuẩn = **trang `/integrity`** (`src/app/integrity/page.tsx` + `integrityGroups()` trong
  `src/lib/integrity.ts`): card cảnh báo Dashboard → mỗi hàng `.intg-row` link `/integrity#<key>` →
  liệt kê từng mục + link. Khi thêm bảng tổng hợp/cảnh báo mới ⇒ tự làm luôn lớp trace-back tương tự.
- **MENU = CỤM DROPDOWN (SiteHeader)**: desktop gom `links` theo `group` → 5 cụm (Tổng quan · Chiến
  lược & Đo lường · Thực thi · Cá nhân · Quản trị), cụm ≥2 mục = dropdown (hover/focus), cụm 1 mục =
  link thẳng; mobile giữ hamburger `<details>` phân nhóm. Thêm trang mới ⇒ thêm vào `links` với `group`
  phù hợp (KHÔNG nhồi thêm mục cấp 1 làm dài thanh menu). CSS `.nav-top/.nav-group/.nav-menu` ở globals.css.
- **ICON = LINE ĐƠN SẮC, KHÔNG DÙNG EMOJI ở nav/nút (CFO 03/08)**: dùng `src/components/NavIcon.tsx`
  (stroke=currentColor) → icon SẮC NÉT, đồng bộ, NỔI BẬT & hợp tông thương hiệu: **vàng `--accent` trên
  nền maroon** (thanh menu), **maroon `--primary` trên nền trắng** (dropdown/mobile). Emoji đa sắc bị
  chìm/thiếu chuyên nghiệp → tránh. Thêm icon mới ⇒ thêm path vào `NavIcon`, ĐỪNG truyền chuỗi tên vào
  chỗ render text. CSS `.nav-ic` (SVG) + `.icon-btn` (nút icon vuông) ở globals.css.
- **THAO TÁC SỬA/THÊM/XOÁ = nút GỌN ở GÓC PHẢI-TRÊN của đúng box → mở POPUP (CFO 03/08)**: dùng chung
  `src/components/EditModal.tsx` (submit xong tự đóng + refresh; icon ReactNode; hỗ trợ nút chỉ-icon).
  KHÔNG để khối form dài ở cuối trang / `<details>` bung trong bảng. Nhiều nút/hàng ⇒ gom `.row-actions`
  (nowrap, KHÔNG để nút rớt xuống dòng) bằng `.icon-btn` (Sửa/Ẩn/Xoá). MỌI nút Sửa/Thêm/Xoá/Update
  CHỈ render khi user CÓ QUYỀN (gác UI ở nơi gọi, ngoài guard server-side).
- **THANH LỌC & NÚT "XOÁ LỌC" (CFO 30/08 — áp cho MỌI thanh lọc, KHÔNG cần nhắc lại)**: container thanh lọc
  luôn là `display:flex; flex-wrap:wrap; gap:8px; align-items:center` (class `.filterbar`/`.usr-filterbar`/`.mtf`).
  Nút "Xoá lọc" PHẢI dùng chung **`src/components/ClearFiltersButton.tsx`** (`btn ghost sm .fb-clear`, in-flow,
  đặt CUỐI thanh lọc, chỉ hiện khi ĐANG lọc) — **TUYỆT ĐỐI KHÔNG `position:absolute`/`float`/tái dùng
  `.usr-search-x`** (class đó chỉ dành cho nút ✕ TRONG ô tìm `.usr-search-box` position:relative; đặt ngoài
  sẽ lọt ra mép phải màn — đúng lỗi CFO gặp 30/08 ở /admin/users). Thêm thanh lọc mới ⇒ dùng `ClearFiltersButton`.
- **CẢNH BÁO TẠO TRÙNG TÊN (CFO 30/08 — áp cho MỌI thực thể tạo theo TÊN, KHÔNG cần nhắc lại)**: khi TẠO
  MỚI mà tên trùng một mục đã có (chuẩn hoá: bỏ dấu + đ→d + thường hoá + gộp khoảng trắng) ⇒ **window.confirm**
  "có thể đang tạo trùng — chắc chưa?" trước khi gọi action. Với modal dùng `EditModal`: truyền props
  **`dupField`** (tên ô, vd 'title'/'name') + **`dupValues`** (danh sách tên đã có) + `dupLabel` (danh từ) →
  EditModal tự cảnh báo. Với form RIÊNG (không qua EditModal, vd `NewObjectiveForm`): tự thêm `window.confirm`
  trong `submit`. ĐÃ gắn: Cuộc họp (title) · Dự án (name) · KPI (name) · OKR (title, so trong kỳ qua
  `periodObjectives`). **Thêm luồng tạo-theo-tên mới ⇒ gắn cảnh báo trùng tương tự.** (Bối cảnh: 28-29/08 thư ký
  tạo trùng "Họp IBP tháng 8" — MTG-06 giữ (12 hành động), MTG-08 rỗng đã xoá 30/08; app trước không cảnh báo.)
- **BẤM TÊN THỰC THỂ = MỞ BOX CHI TIẾT ĐẦY ĐỦ (CFO 14/08 — áp cho MỌI thực thể, KHÔNG cần nhắc lại)**:
  bấm vào TÊN một bản ghi (KPI/OKR/Dự án/Công việc/…) ⇒ mở box (modal) xem **ĐẦY ĐỦ mọi trường** (không
  chỉ cột trọng yếu trên bảng), kèm **trace-back "đang dùng bởi"** (liên kết tới thực thể phụ thuộc). Trong
  box có nút **Sửa/Xoá gọn**; nhưng **XOÁ chỉ cho phép khi CHƯA bị ràng buộc** (không có KR/việc/liên kết nào
  trỏ tới — tránh làm mồ côi), CÓ ràng buộc thì ẩn nút Xoá + hiện danh sách "đang dùng bởi". Guard cả
  server-side (đếm usage trước khi DELETE). Mẫu chuẩn = `KpiDetailModal` + `listKpiKrLinks`/`kpiUsageCount`.
- **TÊN NGƯỜI = LUÔN LÀ LINK HỒ SƠ (CFO 25/08 — nhắc nhiều lần, áp cho MỌI chỗ, KHÔNG cần nhắc lại)**:
  bất kỳ chỗ nào hiển thị TÊN user (người tham gia họp, chủ trì/thư ký, người lưu biên bản, phụ trách
  OKR/việc/dự án, actor nhật ký…) ⇒ BỌC bằng `src/components/UserLink.tsx` (`<UserLink email={..} name={..} />`)
  → bấm mở `/users/<email>` (hồ sơ 360°). ĐỪNG để tên trơn `<b>{name}</b>`. Có email mới link được; thiếu email
  thì chỉ hiện text. Thêm render tên mới ⇒ dùng UserLink ngay.
- **THỜI GIAN = LUÔN GIỜ HÀ NỘI (CFO 25/08, áp cho MỌI app/màn hình)**: mọi format ngày/giờ PHẢI gắn
  `timeZone: 'Asia/Ho_Chi_Minh'` (server chạy UTC → nếu thiếu sẽ lệch 7h). Dùng `fmtDate`/`fmtDateTime`
  (`src/lib/format.ts`, đã gắn `VN_TZ`) cho server-render; client `toLocaleString('vi-VN', { timeZone:'Asia/Ho_Chi_Minh' })`.
  Thêm chỗ hiển thị thời gian mới ⇒ nhớ gắn timeZone.
- **TỰ QC BẮT BUỘC TRƯỚC KHI BÁO (CFO nhắc nhiều lần 03/08)**: mỗi lần đụng UI ⇒ `npm run build` +
  chụp Chromium (globals.css thật) CẢ desktop (~1300px) LẪN mobile (~390px); rà: nút không xuống dòng,
  icon nổi bật đúng nền, canh lề/khoảng cách đều. Khi đổi cách render icon/nút ⇒ **grep hết các chỗ
  render cũ** (vd `{it.icon}`/`{l.icon}` trong `<span>`) kẻo sót 1 chỗ render ra chuỗi tên. Harness QC
  phải phản ánh ĐÚNG JSX thật của component (đừng vẽ tay khác đi rồi tưởng OK). Chắc chắn OK mới báo CFO.
- **TỰ AUDIT ĐỘ CHÍNH XÁC DỮ LIỆU (CFO 03/08)**: khi thêm bất kỳ liên kết/tổng hợp xuyên thực thể mới
  (task↔project, KR↔KPI, OKR↔parent…) ⇒ thêm 1 rule kiểm tra tương ứng vào `src/lib/integrity.ts`
  (+ trace-back) để lỗi lệch/mồ côi/khác-kỳ TỰ lộ ở `/integrity` — không đợi CFO phát hiện. Cẩn thận
  nhãn trùng chữ gây hiểu nhầm (vd `kind='project'` "Dự án" ≠ cột "Thuộc dự án" = `project_id` PRJ).
- **GUIDE + TOUR TỰ CẬP NHẬT (CFO 03/08)**: mỗi tính năng mới ⇒ tự cập nhật `src/lib/guide.ts`
  (FEATURES/CHANGELOG + bump `GUIDE_VERSION`) VÀ bước hướng dẫn onboarding tour tương ứng — CFO không
  phải nhắc.

## ⭐ QUY TẮC XỬ LÝ YÊU CẦU (CFO 06/08 — luôn ghi nhớ)
- **Làm LẦN LƯỢT theo thứ tự nhận (FIFO)**: request sau chỉ bắt đầu khi request trước ĐÃ HOÀN THÀNH TRỌN VẸN.
- **Mỗi request đều có bước QC** trước khi coi là xong: `npm run build` xanh + chụp Chromium (globals.css thật)
  desktop ~1300px & mobile ~390px, rà kỹ; deck HTML thì QA 4 tầng Playwright theo SOP. Chắc chắn OK mới báo/đi tiếp.
- Yêu cầu mới đến giữa chừng ⇒ ghi vào hàng đợi (TaskCreate), làm sau khi xong việc đang chạy.

## Vị trí & lý do
- App Next.js **độc lập, self-contained** trong thư mục `okr-portal/` của repo `decks` (KHÔNG tạo
  được repo riêng do integration bị chặn quyền tạo repo). Có `package.json` / `Dockerfile` / DB schema
  RIÊNG. **Đã loại khỏi build của decks**: `decks/tsconfig.json` exclude + `decks/.dockerignore` (giống
  cách `mcp-server` bị loại). ĐỪNG bỏ exclude — glob `**/*.ts` của decks sẽ kéo `okr-portal/src` vào
  typecheck app decks → lỗi path alias/deps. Khi có repo riêng thì `git mv` sang là xong.

## Stack & quy ước
- **Next.js 14 (App Router, standalone)** + TypeScript, **Auth.js v5** (Google OAuth, 2 tầng
  `src/auth.config.ts` edge + `src/auth.ts` node — giống decks/price-engine), **node-postgres** (không
  ORM), **CSS thường** (`globals.css`, theme indigo `#4338ca`). Không Tailwind, không jose (chỉ dùng
  phiên Auth.js JWT). Typecheck: `npm run build` hoặc `npm run typecheck` (cd okr-portal).
- **Postgres `btmh_data` DÙNG CHUNG** với price-engine/decks, prefix bảng `okr_`. App runtime = user
  `btmh_app` (đã GRANT). DDL bằng superuser postgres. Đọc `pe_*` / `pe_cf_budget` để tự kéo KPI actual.
- Viết code/comment tiếng Việt theo phong cách hiện có.

## Mô hình dữ liệu (db/001_okr_core.sql — idempotent)
- `okr_units`: cây tổ chức company→division→department (đệ quy `parent_id`).
- `okr_users`: allowlist Google email + `role` (exec/division_lead/dept_lead/staff) + `unit_id`.
- `okr_periods`: kỳ, `is_current` (chỉ 1 kỳ hiện tại — partial unique index). **KHUNG THỜI GIAN
  NHIỀU CẤP (db/060 + seed 061)**: `parent_id` + `kind` ('multiyear'|'year'|'quarter'|'month') =
  Chiến lược 2026–2030 → Năm → Quý → Tháng (Tuần/Ngày ở cấp công việc: initiatives.start_on/due_on +
  check-in tuần). Seed 061 = 5 năm + Quý/Tháng 2026; mặc định `is_current`='Năm 2026'. `periods.ts`:
  `PERIOD_KIND_LABEL`, `orderPeriodsHierarchically` (dựng cây + depth cho dropdown/admin).
- `okr_objectives`: Objective, `level`, `unit_id`/`owner_email`, `parent_id` (alignment/cascade),
  `progress` (cache roll-up).
- `okr_key_results`: KR (start→current→target, `direction`, `metric_type`, `weight`, `kpi_source`, `progress`).
- `okr_initiatives`: kế hoạch hành động/thực thi gắn KR/Objective + `budget_planned`/`budget_actual`/
  `budget_source`. **CÂY PHÂN CẤP (db/050)**: `parent_id` (tự tham chiếu, ON DELETE CASCADE) +
  `kind` ('project'|'subproject'|'action') = Dự án → Tiểu dự án → Công việc. `owner_email` = người
  ĐƯỢC GIAO (cá nhân). **`unit_id` (db/120)** = Đơn vị phụ trách (Khối/Phòng), khai báo & liên kết dự án
  với khối/phòng ban độc lập cấp của Objective; con kế thừa unit của dự án cha. Mọi nút mang
  `objective_id` của OKR gốc (con kế thừa `key_result_id` của cha).
- **`okr_projects` (db/130) — DỰ ÁN độc lập, XUYÊN nhiều OKR**: thực thể riêng (code PRJ-nn, period_id,
  name, owner_email, unit_id, status active/done/paused/archived, dates, budget). Task trỏ vào dự án qua
  `okr_initiatives.project_id` (FK ON DELETE SET NULL) → 1 dự án gom việc từ NHIỀU OKR/khối. Lib
  `src/lib/projects.ts` (list/get/create/update/delete + listProjectTasks gom theo OKR + canManageProject/
  canCreateProject). Trang `/projects` (list + tạo) & `/projects/[id]` (chi tiết + sửa/xoá + việc gom theo
  OKR). Gắn việc: popup sửa việc (ExecutionTabs) → tick "Thuộc dự án" + chọn/"＋ Dự án mới" (action
  `createProjectForInitiativeAction` tạo & gắn). Chỉ hiện tag 🗂 khi việc CÓ project_id. Nav "Dự án".
  - **DỰ ÁN YÊU THÍCH ⭐ (CFO 08/09)**: `ProjectsList.tsx` — mỗi card có nút sao (`NavIcon star`, CSS `.pj-fav`
    góc phải-trên, card `.pj-card` position relative; nút ĐẶT NGOÀI `<Link>` để tránh lồng anchor). Bấm =
    đánh dấu yêu thích, **ghim lên đầu** (sort ổn định, favourite trước). Nhớ theo trình duyệt (localStorage
    `okr_proj_favs` = mảng project id). Thuần client, KHÔNG cần DB/migration. **Thứ tự ưu tiên (CFO 08/09)**:
    `rank = (fav?2:0) + (mình CHỦ TRÌ?1:0)` → yêu thích trước; trong mỗi nhóm, dự án mình chủ trì
    (`owner_email==currentEmail`) đứng đầu (sort ổn định giữ phần còn lại). Page truyền `currentEmail={user.email}`.
  - **Dự án hiển thị theo cửa sổ kỳ (CFO 03/09)**: `/projects` lọc dự án CÓ ngày bắt đầu/hạn theo GIAO
    [start_on,due_on]×[starts_on,ends_on] của kỳ chọn (`listProjectsInPeriodWindow`) → hiện ở MỌI tháng/quý/năm
    trong khoảng; dự án chưa đặt ngày giữ theo `period_id`. (`listProjectsByPeriod` cũ vẫn dùng cho `/budget`.)
  - **Quyền QUẢN dự án (`canManageProject`)**: cap `scope.all` · **vai trò điều hành `isExec` (exec/ceo/cfo)
    quản MỌI dự án — CFO 10/09** · chủ trì · người tạo · HOẶC có cap `project.manage` mà dự án thuộc phạm vi
    quản (manageScope, xuống) HOẶC thuộc đơn vị mình/đơn vị CHA trong nhánh (ancestorIds, trừ cấp 'company')
    — CFO 03/09, để Quản lý ở Phòng quản được dự án cấp Khối. **LƯU Ý (bug 10/09): trước đây chỉ cap
    `scope.all` mới quản được — tài khoản CFO thật (`nguyenvanthang@baotinmanhhai.vn`, role cfo, KHÔNG có cap
    admin) tạo việc gắn dự án bị chặn → modal báo lỗi "Server Components render" chung, không thêm được việc.
    Đã thêm `isExec(role) → true` ngay sau kiểm tra `scope.all` để điều hành luôn quản được dù thiếu cap.**
  - **Báo cáo tiến độ (CFO 03/09)**: `src/lib/project-report.ts` (`buildProjectReport`, thuần từ tasks:
    done_on/due_on/progress) + `ProjectReport.tsx` (2 tab: Tổng dự án · Theo thời gian) trên `/projects/[id]`.
  - **Thư viện tài liệu (CFO 04/09)**: `okr_project_docs` (db/580) = list LINK (chưa upload file);
    `src/lib/project-docs.ts` + `ProjectDocs.tsx`; add/del action gác `canManageProject`, ai xem được dự án đều thấy.
  - **THU GỌN mục tham chiếu (CFO 08/09)**: "Thư viện tài liệu" + "Thành viên dự án" bọc trong
    **`CollapsibleCard.tsx`** (client) — header (tiêu đề + số đếm) luôn hiện, nút chevron góc phải thu gọn/mở
    rộng thân, **mặc định thu gọn**, nhớ theo trình duyệt (localStorage `proj-docs-collapsed:<id>` /
    `proj-members-collapsed:<id>`). Icon `chevron` ở `NavIcon`, CSS `.cc-toggle`. Dùng lại cho MỌI mục tham
    chiếu không cần luôn hiển thị.
  - **LƯU CÔNG VIỆC NHANH (CFO 08/09)**: popup sửa việc (`ExecutionTabs` `run()`) + "Thêm việc vào dự án"
    (`AddTaskToProject`) nay **đóng popup NGAY sau khi server action trả về** rồi mới `router.refresh()` nền —
    KHÔNG chờ refetch cả trang dự án nặng mới đóng (trước đây nút "Đang lưu…" treo lâu). Mẫu: `await fn();
    onClose(); router.refresh();` (đóng trước, refresh sau).
  - **PHÂN QUYỀN XEM dự án (CFO 04/09)**: `okr_project_members` (db/590) = danh sách thành viên TƯỜNG MINH.
    `canViewProject` = `canManageProject` HOẶC thành viên HOẶC được giao việc (assignee). `/projects` LỌC theo
    canView (dùng `memberProjectIds`+`assigneeProjectIds`); `/projects/[id]` `redirect('/projects')` nếu không được
    xem. Quản lý thành viên ở card "Thành viên dự án" (`ProjectMembers.tsx`, actions gác canManageProject). Chủ
    trì/người tạo/CEO/CFO/Quản trị luôn xem được.
  - **OKR gắn ở CẤP DỰ ÁN, việc KHÔNG bắt buộc OKR (CFO 08/09)**: `okr_project_objectives` (db/600) =
    liên kết dự án↔nhiều objective; `src/lib/project-objectives.ts` + card "🎯 OKR liên quan"
    (`ProjectObjectivesCard.tsx`, action `setProjectObjectivesAction` gác canManageProject) đặt TRÊN điều lệ.
    Modal "Thêm việc vào dự án" (`AddTaskToProject`) nay OKR **tuỳ chọn** → dùng action `createProjectTaskAction`
    (gác canManageProject; có chọn OKR thì thêm canEditObjective; việc chỉ thuộc dự án là hợp lệ nhờ
    okr_init_attach_ck có project_id). `createInitiativeAction` (bắt buộc OKR) vẫn dùng cho action-plan của OKR.
  - **⭐ THÀNH VIÊN DỰ ÁN TỰ THÊM & SỬA VIỆC CỦA MÌNH (mức 2 — CFO 10/09)**: thành viên tường minh
    (`okr_project_members`) của dự án được **TỰ THÊM việc** (một/nhiều) vào dự án mình tham gia + **sửa đầy đủ
    + xoá việc DO MÌNH phụ trách/tạo** (owner HOẶC created_by), việc người khác vẫn chỉ xem (hoặc cập nhật
    trạng thái/tiến độ nếu là assignee). **Nguồn sự thật server**: `createProjectTaskAction`/
    `createProjectTasksBulkAction`/`createTaskAction` (nhánh dự án) cho thêm nếu `canManageProject || isProjectMember`;
    `canManageTaskLoose` (objectives/actions.ts) nhánh dự án trả true khi `isProjectMember && (owner|created_by===mình)`
    → mở khoá `editInitiativeAction` (sửa đầy đủ) + `deleteInitiativeAction`. **UI**: `/projects/[id]` truyền
    `canAddTask=canManage||isMember` (hiện nút "＋ Thêm việc") + `memberOwnFullEdit={isMember && !canManage}` xuống
    `ExecutionTabs` (per-row `canManageRow` = canManage HOẶC việc-của-mình → EditModal mở form sửa đầy đủ). `/tasks`
    thêm `memberProjectIds` vào `manageIds` (việc-của-mình trong dự án mình là thành viên) → `TaskExplorer`/`TaskEditModal`
    đồng bộ. Card ExecutionTabs bổ sung field `created_by`. Muốn đổi sang "cộng tác đầy đủ" (thành viên sửa MỌI việc
    trong dự án) thì bỏ điều kiện owner/created_by ở 2 chỗ trên.
  - **⭐ PHÂN HỆ BẢNG KIỂM TUÂN THỦ (Compliance — CFO 10/09, yêu cầu Phòng Pháp chế)**: module BẬT/TẮT theo
    từng dự án (`okr_projects.compliance_enabled`, action `setComplianceEnabledAction`, chỉ canManage). Mô hình
    **3 lớp** (db/620): **TIÊU CHÍ rà soát** (`okr_checklist_items`, nguồn gốc, KHÔNG phải Task, khoá tự nhiên
    `(project_id, lower(ma_tieu_chi))`) → **VẤN ĐỀ tuân thủ** (`okr_compliance_issues`, tự sinh khi kết luận
    `chua_tuan_thu|vi_pham`) → **HÀNH ĐỘNG khắc phục = Task** (`okr_initiatives.issue_id`). Lib `src/lib/compliance.ts`
    (server) + `compliance-shared.ts` (nhãn/màu CLIENT-SAFE — component KHÔNG import compliance.ts vì kéo xlsx/db
    vào client). Vòng đời issue: `no_plan → in_remediation → pending_review → kstt_passed → closed`.
    - **GIAI ĐOẠN 1 (ĐÃ LIVE 10/09)**: import Excel `POST /api/compliance/import` (gác canManage HOẶC vai trò
      `phap_che`/`qlda`) → `importChecklistWorkbook`: chọn sheet đầu có cột "Mã", **nhận diện cột linh hoạt**
      (`HEADER_ALIASES` chuẩn hoá bỏ dấu + khớp "chứa"), cột lạ → `extra jsonb` (không mất dữ liệu), **upsert theo
      mã** (không trùng). `syncIssueForItem` (idempotent): vi phạm → tạo issue; có KHKP trong bảng kiểm mà issue
      CHƯA có task → tự tạo 1 Task kế thừa (nội dung/PIC→owner qua `resolveEmail` email-hoặc-tên/hạn/kết quả đầu
      ra), KHÔNG đè khi đã có task (giữ chỉnh sửa đơn vị); kết luận về tuân thủ mà issue còn `no_plan` chưa task →
      xoá (báo động sai đã sửa). UI `ComplianceChecklist.tsx` (card TRÊN "Công việc thuộc dự án") + thống kê nhanh
      theo trạng thái tuân thủ + bộ lọc. Vai trò chức năng theo dự án ở `okr_project_functions` (phap_che/kstt/qlda).
    - **GIAI ĐOẠN 2 (ĐÃ LIVE 10/09) — workflow thẩm định 2 lớp**: vai trò chức năng gán ở
      `okr_project_functions` (UI `ComplianceFunctions.tsx`, actions `add/removeProjectFunctionAction`, gác canManage).
      Lib `submitIssue`/`reviewIssue` (compliance.ts) + `okr_compliance_reviews` (lịch sử). Luồng:
      `submitIssueAction` (PIC=owner 1 task HOẶC canManage/qlda; yêu cầu ≥1 task & tất cả done) → `pending_review`;
      `reviewIssueAction` step `kstt` (cần vai trò kstt HOẶC scope.all) Đạt→`kstt_passed` / Không đạt→`in_remediation`;
      step `phap_che` (cần vai trò phap_che HOẶC scope.all) Đạt→`closed` / Không đạt→`in_remediation`. Reject BẮT
      BUỘC lý do. UI `ComplianceIssues.tsx` (card dưới bảng tiêu chí) hiện nút theo đúng quyền + lịch sử. PIC/KH&QLDA
      KHÔNG sửa được kết luận chuyên môn (chỉ vai trò kstt/phap_che duyệt bước tương ứng).
    - **GIAI ĐOẠN 3 (ĐÃ LIVE 10/09) — dashboard tuân thủ + cảnh báo**: `ComplianceDashboard.tsx` (đầu khu Bảng
      kiểm) tính client từ items+issues+`listRemediationTasks`: chỉ số theo trạng thái tuân thủ (chờ rà soát/Pháp
      chế/KSTT suy từ cột đã điền · tuân thủ · chưa tuân thủ/vi phạm · no_plan · in_remediation · pending · sắp/quá
      hạn theo `han_ra_soat` + due_on task · closed) + khối “Vấn đề cần hành động ngay” (vi phạm chưa KHKP · quá hạn ·
      chờ thẩm định >3 ngày · sắp đến hạn ≤3 ngày). **Thêm hành động khắc phục thủ công** cho vấn đề chưa có KHKP:
      `addRemediationTask`/`addRemediationTaskAction` (gác canManage/thành viên/vai trò) → tạo Task gắn issue_id +
      chuyển issue no_plan→in_remediation. **Lưu ý kỹ thuật**: cột timestamp của issue phải cast `::text` (const
      `ISSUE_COLS`) — pg trả Date, tránh vỡ `.slice`/serialize; task_total loại `canceled`; import bóc theo DÒNG
      TIÊU ĐỀ tự dò (mảng-2-chiều, quét 15 dòng đầu) nên chịu được file có dòng tiêu đề/ghi chú phía trên bảng.
    - **FORM MẪU + SỬA/XOÁ/THÊM TAY tiêu chí (CFO 11/09)**: route `/api/compliance/template` (gác requireUser) sinh
      .xlsx form mẫu (sheet Bảng kiểm + Hướng dẫn) — nút "⬇ Tải form mẫu" cạnh Import. Lib
      `createChecklistItem`/`updateChecklistItem`/`deleteChecklistItem` + actions tương ứng (gác canManage/phap_che/qlda,
      `requireChecklistEdit`) — sửa/thêm gọi `syncIssueForItem` (đổi kết luận → tạo/dọn Vấn đề); xoá tiêu chí CASCADE
      xoá Vấn đề (task khắc phục giữ lại, issue_id→NULL). UI: `ComplianceChecklist` có nút Sửa/🗑 mỗi dòng + "＋ Thêm
      tiêu chí" + modal `ItemEditor` (đủ 15 trường). Prop đổi `canImport`→`canEdit` (= canManage||phap_che||qlda).
  - **KHUNG EMAIL THƯƠNG HIỆU DÙNG CHUNG + GỬI NỀN (CFO 11/09)**: `src/lib/mail-layout.ts` `brandedEmail({kicker,
    title, titleUrl, bodyHtml, button, footerNote, preheader})` = khung email BTMH (logo hosted `/icons/icon-192.png`
    vì Gmail chặn data-URI · header maroon + tiêu đề link tới đúng nội dung · bố cục TABLE căn trái · nút CTA + URL ·
    chân trang) + `emailSection()`. MỌI builder email dùng chung: `notifications.notify` (thông báo/mention),
    `reminders` (check-in), `task-reminders` (đến hạn/quá hạn/tổng hợp), `digest` (bản tin tuần), `meeting-mail`
    (biên bản). **GỬI NỀN**: `notify` fire-and-forget (`void Promise.allSettled` — KHÔNG await SMTP → đăng bình luận
    trả về ngay); `sendMail` transport bật `pool:true,maxConnections:4` → gửi nhiều email nhanh + song song
    (`sendMinutesEmail` gửi `Promise.all`). **Phím tắt**: Composer trong `CommentThread.tsx` nhận Ctrl/⌘+Enter = gửi.
  - **GỬI BIÊN BẢN HỌP QUA EMAIL (CFO 11/09)**: mục "Biên bản & Quyết định" ở `/meetings/[id]` có nút "✉ Gửi biên
    bản" (chỉ canManage + đã có biên bản/quyết định). `src/lib/meeting-mail.ts` `sendMinutesEmail` dựng HTML email
    chuyên nghiệp (tiêu đề + meta loại/thời gian/địa điểm/chủ trì + biên bản (sanitize, bỏ `#Tn`, đổi `[x]`→☑) +
    quyết định + bảng Hành động + nút mở cuộc họp) rồi `sendMail` (SMTP) tới **chủ trì + mọi thành viên** (dedup,
    email hợp lệ). Action `sendMinutesEmailAction` (gác `guardManage`, TRẢ VỀ kết quả cho UI). Component
    `SendMinutesButton.tsx`: popup xem trước người nhận + ô lời nhắn + báo đã gửi X/Y. Nhật ký `meeting.send_minutes`.
  - **⭐ ĐƠN VỊ CÔNG VIỆC = PHÒNG CỦA NGƯỜI ĐƯỢC GIAO (CFO 09/09 — mặc định VĨNH VIỄN, KHÔNG để trống,
    không cần nhắc lại)**: khi tạo/sửa việc mà `unit_id` để trống nhưng có `owner_email` → tự lấy `unit_id`
    của người đó. Điểm chốt DUY NHẤT = helper **`resolveTaskUnit(unitId, ownerEmail)`** trong `initiatives.ts`,
    áp trong `createInitiative` + `editInitiative` + `updateInitiative` (mọi luồng tạo/sửa việc). Backfill dữ
    liệu cũ: **`db/610_backfill_task_unit_from_owner.sql`** (idempotent, chỉ điền dòng unit_id NULL). ⇒ Thêm
    luồng tạo/sửa việc mới PHẢI đi qua các hàm này (đừng INSERT/UPDATE unit_id thẳng bỏ qua resolve).
  - **KẾ THỪA Đơn vị & OKR TỪ DỰ ÁN ở bảng Công việc (CFO 09/09)**: việc chỉ thuộc dự án (không gắn
    OKR/đơn vị riêng) hiển thị Đơn vị chủ trì + OKR liên quan LẤY TỪ DỰ ÁN (nhãn mờ "· dự án", class `.inh`)
    thay vì "—". `projectMetaForIds(ids)` (project-objectives.ts) trả `{unit_id,unit_name,okrs[]}` theo lô;
    `/tasks` page truyền `projectMeta` xuống `TaskExplorer` (list + `TasksKanban`). Nhiều OKR → hiện cái đầu + "+N".
  - **THÊM NHIỀU VIỆC CÙNG LÚC (CFO 09/09)**: modal `AddTaskToProject` có công tắc "Một việc / Nhiều việc"
    (`.seg`). Chế độ nhiều: OKR/KR khai 1 lần dùng chung + danh sách dòng-việc (tên · giao cho[ưu tiên thành
    viên] · ưu tiên · hạn), Enter/dán-nhiều-dòng để thêm nhanh, gửi JSON field `rows` → action
    `createProjectTasksBulkAction` (gác canManageProject 1 lần, lặp createInitiative, bỏ dòng trống). CSS
    `.seg`/`.bulk-*`. `SearchSelect` nay `name?` tuỳ chọn (controlled không cần input ẩn).
  - **ƯU TIÊN THÀNH VIÊN DỰ ÁN Ở DROPLIST "GIAO CHO" (CFO 08/09 — áp cho MỌI chỗ giao việc TRONG dự án,
    KHÔNG cần nhắc lại)**: khi thêm/sửa việc thuộc một dự án, ô "Giao cho (cá nhân)" xếp thành viên dự án
    (+ chủ trì) LÊN ĐẦU (nhóm "Thành viên dự án") rồi mới tới "Thành viên khác". Cơ chế chung:
    **`src/lib/person-options.ts` `personSelectOptions(users, priorityEmails?)`** trả `SSOption[]` có `group`
    (không truyền priorityEmails → phẳng như cũ) + **`SearchSelect` render tiêu đề nhóm** khi option có `group`
    (giữ nguyên thứ tự, CSS `.ss-group`). `/projects/[id]` tính `memberEmails` (thành viên + owner) truyền vào
    `ExecutionTabs priorityEmails` VÀ `AddTaskToProject memberEmails`. **Thêm droplist chọn người trong ngữ cảnh
    có nhóm ưu tiên (dự án/nhóm) ⇒ dùng `personSelectOptions` + truyền tập email ưu tiên.**
- `okr_checkins`: cập nhật tiến độ + `confidence`. `okr_audit_log`: nhật ký.
- **MÃ UNIQUE (db/110, import/export)**: cột `code` ở objectives/key_results/initiatives — định dạng
  `<KHỐI>-O<n>` / `<obj>.KR<m>` / `<obj>.H<kk>` (prefix = mã đơn vị hoặc 'CTY'). Sinh tự động khi tạo
  (`src/lib/codes.ts`: nextObjectiveCode/nextKrCode/nextInitCode); unique index. Hiển thị badge `.okr-code`.
  - **MÃ CÔNG VIỆC cho MỌI việc (CFO 09/09)**: `nextInitCode(opts)` nay LUÔN trả mã (không null). Parent theo
    ưu tiên **OKR → Dự án → Cuộc họp** → `<parentCode>.H<kk>`; việc RỜI (không parent) → `<PREFIX>-H<kk>`
    (PREFIX = mã đơn vị của việc/owner, hoặc CTY). `createInitiative` truyền `{objectiveId,projectId,meetingId,unitId}`.
    Backfill việc cũ trống mã: route **`POST /api/admin/backfill-init-codes`** (gác x-sync-key/exec, idempotent —
    chỉ đụng code NULL, tự self-heal bộ đếm). Bộ đếm `okr_code_seq` scope `H:<parent>` và `HU:<prefix>`.
- **Import/Export Excel** (`src/lib/excel.ts` + xlsx, route `/api/export` GET mọi user · `/api/import`
  POST chỉ exec): xuất 3 sheet Objectives/KeyResults/Initiatives; nhập KHỚP THEO `code` để cập nhật
  (công việc trống code + có Mã Objective → tạo mới, sinh code). Nút ở trang OKR + Quản trị (`ImportOkr.tsx`).
- **DỮ LIỆU 2026 ĐÃ SEED** (db/070 chiến lược + 080 users + 090–104 KHHĐ 17 khối): 27 objective
  (5 trụ 2026–2030 + 5 công ty 2026 + 17 khối), 158 KR, 255 dự án; 30 user thật khoá đăng nhập
  (marker `created_by` = 'seed_strategy'/'seed_khhd_<KHOI>'). "Kế hoạch & QLDA" = PHÒNG thuộc TC (unit TC-KH).

## KPI tự động từ BigQuery (ĐÃ NỐI 31/07)
- Cây tổ chức thật: `db/020_org_btmh.sql` (13 khối + 36 phòng theo sơ đồ CCTC). Exec home = công ty BTMH.
- `src/lib/bigquery.ts`: query BigQuery qua **Metabase** — config `{url,api_key}` đọc từ Postgres
  `pe_pricing_config` key `metabase` (tái dùng price-engine), POST `{url}/api/dataset` `database:5`.
  btmh_app đã GRANT SELECT `pe_pricing_config` (`db/030_grants_kpi.sql`). Metabase = `report.consultx.vn`.
- `src/lib/kpi.ts`: `KPI_METRICS` = revenue/gross_profit. KR gắn `kpi_source=metric` → `syncKrKpi`
  điền **target = kế hoạch cả kỳ** (`btmh-dwh-485609.dwh_fact.f_ke_hoach_kinh_doanh_2`, `version='ĐHCĐ'`,
  cột doanh_thu/loi_nhuan_gop) + **current = thực hiện tới hôm nay** (`op_finance.v_flatten_sales`,
  cột line_income_vnd/gross_profit_vnd, scope bán lẻ `is_revenue_recognized AND internal_sales=false
  AND company_code NOT IN ('SX','BN','HD')`) theo kỳ (okr_periods.starts_on/ends_on). `setKrAutoValues`
  cập nhật target+current+progress. Tạo KR gắn metric → ép currency + tự sync ngay.
  ⚠️ Scope kế hoạch (mọi kênh/pháp nhân) vs thực hiện (chỉ bán lẻ) có thể lệch — cần BI chốt bộ lọc
  đồng nhất nếu muốn so sánh chuẩn từng đồng.
- Route `POST/GET /api/kpi/sync` gác bằng session exec HOẶC header `x-sync-key=SYNC_KEY` (env, trên VPS).
  Middleware ĐÃ loại `/api` (route tự gác). Nút "Đồng bộ ngay" ở `/admin`.
- **Cron n8n "OKR KPI Sync — cron đồng bộ KPI BigQuery" (id `xOxOrwj80MPNSJqx`, ACTIVE, `0 7-22 * * *`
  giờ VN)**: SSH VPS đọc SYNC_KEY từ .env → `curl POST 127.0.0.1:8640/api/kpi/sync`. Key không rời VPS.
- **Auto-fill Scorecard (Thư viện KPI)** — `kpi.ts` `KPI_ACTUAL_SQL` (map MÃ KPI → SQL BigQuery) +
  `syncKpiScorecardActuals()` điền **chỉ số THỰC HIỆN** cấp **Công ty**, kỳ hiện tại (KHÔNG đụng target).
  Đã nối: scorecard T1-01 (gross_profit_vnd) · T1-03 (gold_weight_chi); **Nhóm A vận hành (db/260, weight 0,
  source=bigquery)**: OPS-01 Doanh thu (line_income_vnd) · OPS-02 Số hóa đơn (COUNT DISTINCT bill_id) ·
  OPS-03/04 Mua vào chỉ/tiền (`v_flatten_buyback` assessed_weight_chi/net_buyback_amount_vnd, scope
  `company_code NOT IN ('SX','BN','HD')`) · OPS-05/06 Tồn kho gt/tl (`v_so_du_ton_kho`, snapshot ngày mới
  nhất ≤ hôm nay, scope `nguon NOT IN ('Bắc Ninh','Sản xuất','Hải Dương')`). Thêm KPI auto mới ⇒ INSERT
  vào db (source=bigquery) + thêm entry `KPI_ACTUAL_SQL[code]`. Best-effort: 1 KPI lỗi không chặn KPI khác.
  Còn LẠI (Nhóm B — GMROI/DIO/biên/chỉ/contribution margin…) cần BI chốt công thức trước khi nối.

## Nâng cấp best-practice (31/07 batch 2) — #1/#2/#5/#4
- `db/040`: cột `okr_objectives.okr_type` (committed/aspirational/learning), `okr_key_results.indicator`
  (leading/lagging), bảng `okr_settings` (key→jsonb, GRANT btmh_app).
- #1 Loại OKR: chọn khi tạo, badge + kỳ vọng điểm (`OKR_TYPE_LABEL/EXPECT` trong okr.ts).
- #2 Nhãn KR leading/lagging: chọn khi thêm KR, badge, cơ cấu + cảnh báo (`MAX_LEADING`=3, cần ≥1 lagging).
- #5 Guardrail: `MAX_KR`=5 (chi tiết OKR), `MAX_OBJ_PER_OWNER`=5 (`ownersOverObjectiveLimit`, banner ở /objectives).
- #4 Nhắc check-in: `/admin/settings` cấu hình (enabled/weekday/stale_days/audience) lưu `okr_settings`
  key `checkin_reminder`. Route `POST /api/reminders/checkin` (gác x-sync-key/admin, `?force=1` bỏ gate
  ngày). `src/lib/reminders.ts` tính KR chưa check-in > stale_days → email qua **Deck Mail webhook**
  (`N8N_MAIL_WEBHOOK` trong .env VPS). **Cron n8n "OKR Check-in Reminder" (id `p0cAn5ghp8ZU0Sfw`, ACTIVE,
  `0 8 * * *` giờ VN)** — app tự gác theo weekday cấu hình. Đã test `sent:1` tới vanthang81@gmail.com.
- **NHẮC CÔNG VIỆC qua email + chuông (CFO 30/08)**: 4 loại thông báo việc — (1) **được giao mới** (đã có sẵn
  qua `notifyTaskAssigned`/`notify`, type `assignment`); (2) **sắp đến hạn 1 ngày** (`task_due_soon`); (3)
  **quá hạn** (`task_overdue`); (4) **email TỔNG HỢP quá hạn HÀNG TUẦN** (`task_overdue_weekly`). Logic ở
  `src/lib/task-reminders.ts` (`remindTasksDueSoon`/`remindTasksOverdue`/`weeklyOverdueDigest`) — OPEN =
  `status NOT IN ('done','canceled')`, giờ VN, **idempotent** (dedup theo (người nhận,type,entity_id) trong
  cửa sổ: due_soon 20h · overdue 20 ngày) nên chạy nhiều lần/ngày không spam. Route `POST/GET
  /api/reminders/tasks?kind=due_soon|overdue|weekly|daily` (gác `x-sync-key`/admin; `daily`=due_soon+overdue).
  **Mặc định BẬT cho MỌI user**; mỗi người tự tắt từng loại ở **Cài đặt cá nhân** (`notif_prefs`, auto-render
  từ `NOTIF_TYPE_META` → thêm loại mới chỉ cần 1 dòng ở đó). 2 cron n8n **ACTIVE**: "OKR Task Reminders —
  daily (đến hạn + quá hạn)" (id `IeYNzbjs1jsig9vA`, `0 8 * * *` VN → `?kind=daily`) + "OKR Task Overdue —
  weekly (tổng hợp quá hạn)" (id `OXOeqKGsHz1uQAtf`, `30 7 * * 1` = Thứ 2 07:30 VN → `?kind=weekly`), SSH
  đọc SYNC_KEY từ .env rồi curl `127.0.0.1:8640`. Email gửi qua `sendMail` (SMTP okr@baotinmanhhai.vn).
- **Tóm tắt công việc buổi sáng (daily digest, CFO 12/09)**: `src/lib/daily-digest.ts` (`buildAllDigests`/
  `renderDigestHtml`/`sendDailyDigests`) — 8:00 sáng **Thứ 2–Thứ 7** gửi mỗi user CÓ việc tồn đọng: KPI công việc +
  việc **quá hạn / đến hạn ≤3 ngày / đang làm** (owner=user) + **việc mình GIAO cho người khác** đang chờ
  (`created_by`=user, owner khác, còn hoạt động). BỎ QUA user không còn việc (tránh spam). Loại thông báo
  `daily_digest` trong `NOTIF_TYPE_META` (user tự tắt ở Cài đặt). Route **`GET/POST /api/digest/daily`** (gác
  `x-sync-key`/admin; `?test=1` = gửi thử cho chính admin, bỏ công tắc tổng). CÔNG TẮC TỔNG `daily_digest_enabled`
  (`okr_settings`, mặc định TẮT) bật ở **Quản trị → Cài đặt · Email tự động** (`saveDailyDigestSettingsAction`
  + `sendDailyDigestTestAction` "Gửi thử cho tôi"). Cron n8n **"OKR Daily Digest — 8h T2–T7"** (`0 8 * * 1-6` VN,
  SSH đọc SYNC_KEY → curl `127.0.0.1:8640/api/digest/daily`). Định dạng dùng chung `brandedEmail`.
- **THÔNG BÁO THAY ĐỔI CÔNG VIỆC (CFO 12/09)**: `src/lib/task-changes.ts`. Khi task đổi trạng thái/nội dung
  (hook `recordTaskChange` trong các action `update/edit/move/updateOwnProgress/bulk` của `objectives/actions.ts`)
  → ghi 1 dòng `okr_task_events` (db/660: task_id/title snapshot/actor/kind/summary). Digest gom & gửi cho
  **NGƯỜI GIAO (`created_by`) + CHỦ TRÌ OKR (`objective.owner_email`)** — loại actor. **LOẠI TRỪ** (trong
  recordTaskChange): actor là **super_admin** → mọi thay đổi KHÔNG ghi/báo; actor là **system_admin/okr_admin**
  + status→'canceled' (huỷ) → KHÔNG ghi/báo (xoá vốn không sinh event). Tuỳ chọn per-user cột
  `okr_users.task_change_prefs` `{channel:'both'|'app'|'email'|'off', times:['08:00',…], days:[1..6]}` (mặc định
  8:00 T2–T7, cả 2 kênh) + `task_change_last_sent`; UI ở **Cài đặt cá nhân** (`TaskChangeSettingsForm` chip
  kênh/giờ/ngày → `saveTaskChangePrefsAction`). Dispatch: **`GET/POST /api/task-changes/dispatch`** (gác
  `x-sync-key`/admin; `?test=1`=gửi thử cho admin, bỏ lịch+công tắc) → `dispatchTaskChangeDigests`: mỗi user
  chỉ gửi vào ĐÚNG mốc `times` đã tới (so `last_sent`), gom event kể từ `last_sent`, gửi app-notif (type
  `task_change`) + email `brandedEmail` gom theo việc; luôn advance `last_sent` (tránh lặp). CÔNG TẮC TỔNG
  `task_change_enabled` (mặc định TẮT) ở **Quản trị → Cài đặt** (`saveTaskChangeSettingsAction` +
  `sendTaskChangeTestAction`). Cron n8n **"OKR Task-Change Dispatch — mỗi 30′"** (`MdBJFJaUBBOtYNHi`, ACTIVE,
  `*/30 5-22 * * *` VN, SSH→curl dispatch). Dọn event >30 ngày trong dispatch. Retention chống phình.
- **BÁO CÁO THỰC HIỆN CÔNG VIỆC tuần/tháng (CFO 12/09)**: trang **`/task-report`** ("Báo cáo thực hiện",
  nav nhóm Tổng quan). `src/lib/exec-report.ts` `buildExecReport(user,units,access,{period,anchor})`: gom việc
  (owner≠null, ≠canceled) có `due_on` HOẶC `done_on` trong kỳ (Tuần T2–CN / Tháng 1–cuối), phân loại
  **done_ontime · done_late · overdue · ontrack**; **"chậm deadline" = done_late + overdue**. done_late =
  `done_on > due_on + graceDays`. **graceDays** = okr_settings `late_grace_days` (mặc định 0) — sửa bởi
  super/system/okr admin (`saveLateGraceAction` gác `canEditGrace`). **Phạm vi xem**: `scope.all`
  (super/system/okr/kpi admin) → toàn bộ; lãnh đạo (division/dept/function lead) → `subtreeIds` đơn vị mình +
  cấp dưới; nhân viên → chỉ việc của mình. UI: `ExecReportView` (client) — chip Tuần/Tháng + ‹ › điều hướng
  kỳ (prev/next anchor) + tiles tổng + bảng Đơn vị→(xổ)Cá nhân, cột đếm + %HT + %đúng hạn + ⚠ chậm; `wide-x`.
  KHÔNG cần bảng DB mới (chỉ okr_settings). Trang mở cho MỌI người, dữ liệu tự giới hạn theo phạm vi.
- **SUPER ADMIN + siết Quản trị hệ thống (CFO 12/09)**: thêm nhóm quyền `super_admin` (đỉnh, icon 👑) đứng đầu `GROUP_KEYS`. `isSuperAdmin(user)` = email ∈ `SUPER_ADMIN_EMAILS` (vanthang81@gmail.com, nguyenvanthang@baotinmanhhai.vn — hardcode chống khoá nhầm) HOẶC `perm_group='super_admin'`. `userCaps`: Super Admin → mọi cap (thay cho shortcut isExec cũ). Cap mới `super.admin` (SUPER_ONLY) chỉ nhóm super_admin có. `loadAccess` áp BẤT BIẾN: super_admin=đủ; bóc `super.admin` khỏi nhóm khác; bóc `SYSADMIN_DENY_CAPS` (scope.all, user.view360) khỏi `system_admin` → Quản trị hệ thống KHÔNG xem được mọi việc/hồ sơ 360° cá nhân. `savePermissionsAction`+`saveUserAction`: trừ Super Admin, không sửa được nhóm super_admin, không sửa nhóm CỦA CHÍNH MÌNH, không tự đổi perm_group của mình, không gán/hạ super_admin. UI phân quyền + form user khoá tương ứng. **Need-to-know việc**: `canViewInitiative` thêm nhánh `ctx.mentioned` (được @tag trong bình luận việc → xem được); `initiativeIdsMentioning(email)` trong comments.ts, truyền qua `buildTaskViewCtx`. LƯU Ý: vai trò tổ chức `exec` (CEO/CFO) vẫn có PHẠM VI role = null (không giới hạn) → siết quyền xem việc của 'Quản trị hệ thống' áp cho user NON-exec (đúng đối tượng vị trí IT/admin).
- **BẢNG GỌN — TRẠNG THÁI KHÔNG XUỐNG DÒNG (CFO 12/09, áp mọi bảng)**: `.badge` có `white-space:nowrap` (badge trạng thái luôn 1 dòng); cột `.right` nowrap. Dòng phụ dài trong ô (đơn vị/mô tả) bọc `cell-sub-1` (ellipsis 1 dòng) + đặt `max-width` ở td (vd `.t td.mtg-name`) để rút gọn thay vì kéo giãn cột, kèm `title` xem đầy đủ khi hover. Bảng mới có cột trạng thái + dòng phụ dài ⇒ theo mẫu này.
- **NHẬT KÝ GỬI BIÊN BẢN HỌP (CFO 12/09)**: mỗi lần bấm "Gửi biên bản" ghi 1 dòng vào `okr_meeting_minutes_sends` (db/640: meeting_id, sent_at, sent_by(_name), recipients, ok_count, fail_count, note) trong `sendMinutesEmail` (best-effort). Trang cuộc họp hiện note nhỏ dưới mục Biên bản (`MinutesSendLog`, mọi người xem): đã gửi mấy lần · gần nhất khi nào/ai · ok/total người · thành công/một phần/thất bại (chấm màu) + bấm Lịch sử xem tất cả. `listMinutesSends()` trong `meeting-mail.ts`; SendMinutesButton `router.refresh()` sau khi gửi để cập nhật note.
- **THÔNG BÁO MỞ ĐÚNG NỘI DUNG + ĐÚNG BÌNH LUẬN (CFO 12/09)**: link thông báo bình luận/nhắc tên ghép neo `#comment-<id>` (helper `linkWithComment` trong `comments.ts`); bình luận VIỆC dẫn tới `/tasks?task=<id>#comment-<id>` (mở popup chi tiết việc — có khung bình luận `defaultOpen`), bình luận OKR/KR dẫn tới `/objectives/<id>#comment-<id>`. Mỗi bình luận có `id="comment-<id>"` (CommentThread) → `HashScroller` (mount ở layout) cuộn tới + nháy sáng (`hash-flash`), retry 3s chờ modal/nội dung render. Thêm loại thông báo mới gắn nội dung ⇒ đặt link kèm neo tương tự để bấm vào là thấy ngay.
- **XỬ LÝ NGAY TẠI CHUÔNG — duyệt/từ chối/bình luận không cần mở trang (CFO 30/08)**: chuông 🔔 (`NotifBell.tsx`)
  nay là **BẢNG THẢ XUỐNG** (popover, đóng khi bấm ngoài/Esc) render `NotifItems.tsx` (dùng CHUNG với trang
  `/notifications` qua `NotifList.tsx`). Mỗi thông báo có thao tác inline: **Duyệt/Từ chối** cho `meeting_access_request`
  + `user_invite_pending` (kèm ô **Ghi chú** tuỳ chọn → đính vào thông báo quyết định gửi người yêu cầu); **↩ Trả lời**
  (bình luận thẳng qua `addComment`) cho thông báo gắn `entity_type ∈ objective/key_result/initiative` (mention/reply/
  comment_mine/assignment). Endpoint **`POST /api/notifications/act`** `{id,action:'approve'|'deny'|'comment',text?}` —
  chỉ đọc thông báo CỦA MÌNH + **kiểm quyền lại phía máy chủ theo loại** (`isMeetingEditor` / `canApproveUsers` /
  entity là mục bình luận được) → KHÔNG tin client. Sau khi xử lý: `markSiblingNotifsRead(type,entity_id)` để người
  đồng-nhận khác hết chờ. **Để hiện được nút inline, notifSimple PHẢI lưu `entity_type`/`entity_id`** — đã mở rộng
  `notifySimple` (2 cột mới) + 2 nơi tạo: yêu cầu xem họp (`meeting_access` + request id) & lời mời (`user_invite` +
  invite id); thông báo CŨ thiếu entity_id → chỉ còn nút "Mở" (fallback). **Thêm loại thông báo cần duyệt/bình luận
  mới ⇒ lưu entity_type/entity_id khi tạo + thêm nhánh xử lý trong `/api/notifications/act` + cho vào APPROVE_TYPES/
  COMMENT_ENTITIES ở `NotifItems.tsx`.**
- **THÔNG BÁO MỞ ĐÚNG CHỖ CẦN XỬ LÝ — deep-link #anchor (CFO 30/08, áp cho MỌI thông báo/điều hướng)**: `link` của
  thông báo PHẢI trỏ tới đúng **khu vực hành động** bằng `#<id>`, không chỉ tới trang. Cơ chế chung: **`HashScroller`**
  (`src/components/HashScroller.tsx`, mount ở layout) — mở link có `#id` sẽ **cuộn tới `getElementById(id)` + nháy
  `.hash-flash`** (chờ nội dung render, retry ~3s, chừa `scroll-margin-top:72px`). Đã gắn: yêu cầu xem họp →
  `/meetings/<id>#access-requests` (card "Yêu cầu xem" `id="access-requests"`); lời mời → `/admin/invites#pending-invites`
  (card "Chờ duyệt"); KR → `/objectives/<obj>#kr-<id>` (đã có sẵn); được giao việc → `/tasks?task=<id>` (mở popup việc).
  **Thêm thông báo/khu vực hành động mới ⇒ đặt `id="<anchor>"` lên khối đích + cho `#<anchor>` vào link thông báo.**

## Điều hành: Họp điều hành + Nhận định/Khuyến nghị + Sức khỏe OKR + Bản tin tuần (02/08)
- **`src/lib/health.ts`**: chấm SỨC KHỎE mỗi OKR theo 7 tiêu chí (chủ trì 20 · có KR 20 · có KR lagging 10 ·
  cascade 15 · thực thi 15 · check-in gần đây 10 · KR gắn KPI 10 = 100). `okrHealthSummary` (TB + phân bố
  tốt/khá/yếu + hạng mục thiếu). Hiện ở Dashboard card "Sức khỏe OKR".
- **`src/lib/review.ts`**: ENGINE tổng hợp 1 kỳ (`reviewData`/`currentReviewData`) → nhịp độ, theo Khối,
  BSC, **KPI cảnh báo W/A/E** (quét okr_kpi_values mọi đơn vị, `kpiStatus`), OKR cần chú ý, việc quá hạn,
  toàn vẹn, sức khỏe + **Nhận định/Khuyến nghị rule-based** (Quan sát→Hàm ý→Khuyến nghị). Dùng chung cho:
  trang **`/review`** ("Họp điều hành" WBR/MBR, in đẹp), card Dashboard, và **Bản tin tuần**.
- **Bản tin điều hành tuần (CFO 30/08 — công tắc + phân quyền + tự tắt)**: `src/lib/digest.ts` `sendWeeklyDigest()`.
  **CÔNG TẮC TỔNG MẶC ĐỊNH TẮT** (okr_settings `weekly_digest_enabled`, `getWeeklyDigestEnabled`/`setWeeklyDigestEnabled`) —
  cron gọi mà chưa bật thì `skipped:'disabled'`, KHÔNG gửi. Bật/tắt ở **Quản trị → Cài đặt** (`saveDigestSettingsAction`)
  kèm **xem trước người nhận** (`digestRecipients`). **Người nhận = năng lực `digest.weekly`** (`canReceiveWeeklyDigest`,
  mặc định gợi ý `system_admin`+`okr_admin`, cấu hình ở Phân quyền; exec luôn có mọi cap) + `notify_email=true` + **CHƯA tự
  tắt** loại `weekly_digest` (`notif_prefs`, hiện ở **Cài đặt cá nhân**). Nút "Gửi thử ngay" ở /admin + settings dùng
  `sendWeeklyDigest({force:true})` (bỏ qua công tắc, vẫn theo phân quyền). Route `POST/GET /api/digest/weekly` (gác
  x-sync-key/admin, KHÔNG force → theo công tắc). **Cron n8n "OKR Weekly Digest" (id `zwiPmsyDaCRxgSG2`, ACTIVE,
  `30 0 * * 1` UTC = Thứ 2 07:30 VN)** SSH curl route — giữ ACTIVE, tự no-op khi công tắc tắt. **Đổi ai nhận ⇒ Phân quyền
  (cap `digest.weekly`); không hardcode role nữa.**
- HelpTip: `review` · `insights` · `okr-health`. Nav "Họp điều hành" (/review) ở nhóm Tổng quan.

## Hướng dẫn sử dụng trong app + QUY TẮC CẬP NHẬT TÀI LIỆU (BẮT BUỘC)
- Trang **`/guide`** (`src/app/guide/page.tsx`) = hướng dẫn chi tiết: phương pháp luận OKR/KPI/Action
  Plan (best practice) + tính năng + lộ trình đề xuất + thuật ngữ + nhật ký. Vào từ menu "Hướng dẫn".
- **NGUỒN DUY NHẤT = `src/lib/guide.ts`** (METHODOLOGY, FEATURES, ROADMAP, GLOSSARY, CHANGELOG).
  Component **`HelpTip`** (`<HelpTip k="..." />`) đọc CÙNG registry `FEATURES` → tooltip + link tới
  `/guide#feat-<key>`. Đã gắn ở: nav, chi tiết OKR (key-result/budget/initiative/checkin/kpi-auto).
- Trang `/guide` render ĐỘNG phần cấu trúc (vai trò từ `rbac`, cấp từ `okr`, KPI metric từ `kpi`, kỳ
  hiện tại + số khối/phòng/OKR từ DB) → **tự phản ánh trạng thái hệ thống**, không cần sửa tay.
- **QUY TẮC (áp cho MỌI session sau)**: mỗi khi THÊM/ĐỔI tính năng ⇒ (1) cập nhật `FEATURES`
  (thêm/sửa mục + `help` tooltip) và/hoặc `METHODOLOGY`; (2) thêm 1 dòng vào `CHANGELOG` + đổi
  `GUIDE_VERSION`; (3) gắn `<HelpTip k="..."/>` tại UI tính năng đó. Nhờ vậy tài liệu + tooltip luôn
  đồng bộ với hệ thống một cách tự động.
- **HƯỚNG DẪN TỪNG BƯỚC — WALKTHROUGH THEO TRANG (CFO 29/08 — áp cho MỌI trang, TỰ CẬP NHẬT, KHÔNG cần
  nhắc lại)**: mỗi trang có **tour pop-up nhiều bước** (giống tour Trang chủ ở screenshot CFO): "Bước x/N",
  nút Tiếp/Quay lại/Bỏ qua, chấm tiến độ; **tự chạy lần đầu vào trang** (nhớ "đã xem" theo trang ở
  localStorage `okrTourSeen:<key>`), **mở lại** bằng nút "Hướng dẫn" (icon `?`) trên `SiteHeader`. **KHÔNG
  dùng khung tĩnh "Hướng dẫn nhanh" nữa** (CFO chốt: phải là pop-up walkthrough). Tối đa **10 bước/trang**.
  - **Kiến trúc TỰ ĐỘNG (không sửa từng trang)**: NGUỒN DUY NHẤT = **`src/lib/page-tours.ts`** — registry
    `PAGE_TOURS[key] = TourStep[]` (`{target?, title, body, link?}`; bước có `target` → khoét sáng
    `[data-tour="target"]`, không có → thẻ giữa màn) + hàm **`tourKeyForPath(pathname)`** ánh xạ URL→key.
    Component **`AutoPageTour`** (mount 1 lần ở `src/app/layout.tsx`) đọc `usePathname()` → chạy đúng tour
    trang hiện tại. Nút **`HeaderTourButton`** (trong `SiteHeader`) chỉ hiện khi trang có tour, bấm →
    dispatch `window` event `okr:start-tour` (ProductTour đang mount lắng nghe → mở lại). `ProductTour` nay
    GENERIC: nhận `steps`+`tourKey` (KHÔNG hardcode STEPS nữa). CSS `.tour-*` + `.hdr-tour-btn` ở globals.css.
  - **THÊM TRANG MỚI ⇒ chỉ (1) thêm entry vào `PAGE_TOURS` + (2) thêm 1 dòng ánh xạ trong `tourKeyForPath`**
    → tour tự chạy + nút "Hướng dẫn" tự hiện, KHÔNG phải đụng file trang. **THÊM/ĐỔI TÍNH NĂNG ⇒ thêm/sửa
    1 bước** ở tour của trang liên quan (giữ ≤10 bước).
  - **⭐ LUẬT KHOÉT SÁNG (CFO 30/08 — "không nhắc lại"): MỖI bước tour mô tả 1 khu vực/chức năng PHẢI có `target`
    trỏ tới một `data-tour="<target>"` THẬT trên trang** (khoét sáng đúng chỗ). CHỈ **bước MỞ ĐẦU** (index 0)
    và **bước KẾT `done(...)`** được phép không target. ⇒ Khi thêm bước, PHẢI gắn `data-tour` vào đúng khối trên
    trang (dạng tĩnh `data-tour="x"` hoặc động `data-tour={\`nav-${g.key}\`}`) rồi đặt `target` khớp. Đừng để
    bước "vào giữa màn" (lỗi CFO gặp ở /admin/activity 30/08).
  - **GÁC TỰ ĐỘNG (khỏi phải nhớ)**: `scripts/check-page-tours.mjs` chạy TRONG `npm run build` (đã nối ở
    `package.json` build + có `npm run check:tours`; Dockerfile build gọi `npm run build` nên **gác cả deploy**).
    Nó FAIL build nếu: (A) có bước giữa thiếu `target`; (B) `target` không khớp `data-tour` nào trong `src/`.
    → Sai là build đỏ ngay, không lên được production. Thêm tiền tố `data-tour` động mới ⇒ script tự nhận qua
    mẫu `data-tour={\`prefix-${...}\`}`.

## Tài liệu SLIDE DECK giới thiệu hệ thống (deck.consultx.vn) — TỰ ĐỘNG CẬP NHẬT
- **Nguồn**: `okr-portal/docs/system-overview-deck.html` (HTML self-contained, house style deck ConsultX:
  palette maroon `#7C0312`/gold, serif Georgia, nav ←→/Space, sáng/tối, in PDF; 16:9). Slug published =
  **`he-thong-quan-tri-hieu-suat-btmh`** → live PUBLIC tại `https://deck.consultx.vn/d/he-thong-quan-tri-hieu-suat-btmh`.
- **Publish/cập nhật**: tool MCP `deck-publisher` `deck_publish` (slug trên, `visibility:'public'`, category 'Hướng dẫn').
  Gọi lại cùng slug = ghi đè. Link deck cũng gắn ở bước cuối tour onboarding + trang `/guide`.
- **QUY TẮC THƯỜNG TRỰC (CFO 06/08 — KHÔNG cần hỏi lại)**: **mỗi khi thêm/đổi tính năng ⇒ TỰ ĐỘNG cập nhật
  deck này + republish + tự QC**. Thêm mục vào phụ lục **Nhật ký cập nhật** (ngày + tính năng) — KHÔNG ghi số
  version trong nội dung. Viết cho người **non-tech** (không lộ chi tiết kỹ thuật/hạ tầng/code).
- **⭐ BẮT BUỘC theo ĐÚNG SOP tạo Slide Deck HTML của BTMH (CFO 06/08 — luôn ghi nhớ)**: mọi lần tạo/cập nhật
  deck HTML PHẢI tuân thủ **SOP trên Outline**: "BTMH — SOP Tạo Slide Deck HTML" (doc id `85bc0c64-2350-4d23-91e3-fe235a690b34`,
  url `outline.vanthang.io/doc/…LxPm6Wh9J2`). Đọc SOP TRƯỚC khi dựng. Điểm cốt lõi: slide cố định 1280×720
  (#deck scale-to-fit), **logo là ẢNH THẬT** (base64, 3 biến thể lockup/monogram maroon/ivory — asset gốc
  `price-engine/public/logo-btmh-white.png` + `brand.ts` LOGO_WORDMARK), 4 loại slide (cover/divider/nội
  dung/kết thúc), **takeaway title** (câu khẳng định), **số đếm viết bằng chữ số**, dòng `.src` nguồn ở mọi
  slide nội dung, em-dash→gạch nối, tooltip thuật ngữ auto-annotate, nav 8 nút (⇱ ‹ › ▦ Aa ⛶ ⎙ ?) + phím tắt
  + overview + glossary + help + progress + deep-link + print, nền `body` đổi động, mobile auto-rotate, biểu
  đồ SVG tự vẽ. **QA 4 tầng bằng Playwright** (đo `getBoundingClientRect` so với mép vùng nội dung, KHÔNG nhìn
  ảnh; chạy tới `0/N slide lỗi`). Publish: deck này CFO chốt **public** (SOP mặc định protected — chỉ đổi khi
  CFO yêu cầu, mà CFO đã yêu cầu public cho deck giới thiệu). Mỗi lỗi mới phát hiện → tự ghi vào Mục 17 SOP.
  - **QA 4 tầng CHỈ bắt TRÀN, KHÔNG bắt THƯA**: phải đo thêm **mật độ (SOP #8)** — với mỗi slide nội dung,
    tính khoảng trống từ phần tử cuối `.body` tới đáy `.body`; **giữ ≤25% chiều cao `.body`** (script
    `density.cjs`: nếu >25% = thưa, làm dày bằng nội dung THẬT: card/KPI/list/bảng nhỏ/flow, KHÔNG padding rỗng).
    Và giữ **tối đa 1 khối `.hl` mỗi slide** (SOP 5.2). Harness QA chạy bằng **Node Playwright**
    (`NODE_PATH=/opt/node22/lib/node_modules node qa.cjs`, `executablePath=/opt/pw-browsers/chromium`) — bản
    Playwright ở đây là gói Node, KHÔNG phải Python. Bắt buộc chạy đối chiếu bản-lỗi-biết-trước để tin "0 lỗi".
  - Publish an toàn (deck lớn, tránh sai lệch base64 logo): KHÔNG in lại HTML vào tool call — dùng workflow
    n8n SSH một-lần đọc THẲNG file đã commit trên VPS (`/home/thang/okr-portal-src/okr-portal/docs/...`) rồi
    POST `/api/publish` (key trong `/home/thang/decks-portal/.env`), xong archive workflow.

## Logic quan trọng (src/lib/)
- `okr.ts`: `computeKrProgress` (theo hướng tăng/giảm, clamp 0..100), `recomputeUp` (lan tiến độ
  KR→Objective→cha, bình quân theo weight; không KR thì bình quân con). `canManageObjective`/`canCreateAt`.
- `rbac.ts` + `org.ts`: vai trò + `manageScope` (subtree đơn vị của lead). `subtreeIds`/`ancestorIds`/`buildTree`.
- `kpi.ts`: registry `KPI_SOURCES` (key→fetch từ Postgres, best-effort try/catch) + `syncKpiSources()`.
  Thêm nguồn KPI mới ⇒ thêm entry vào `KPI_SOURCES`. BigQuery (doanh thu/lãi gộp) nối qua API
  price-engine ở phase sau (chưa làm).
- `initiatives.ts` (**QUẢN TRỊ DỰ ÁN gắn OKR — đợt 1**): `buildInitiativeTree` (dựng cây từ danh
  sách phẳng theo `parent_id`, gán `depth`), `recomputeInitiativeUp` (roll-up: nút có con →
  progress = bình quân con bỏ 'canceled'; nút lá giữ progress thủ công; cascade lên cha), `createInitiative`
  (thêm `kind`/`parent_id`), `setInitiativeProgress` (nhân viên: trạng thái+tiến độ, done→100),
  `updateInitiative` (quản lý: đủ trường), `canUpdateInitiative` (→ `{manage, assignee}`: quản OKR sửa
  full; người được giao cập nhật việc của mình), `budgetSummaryForObjective` gộp CHỈ **nút lá**
  (`NOT EXISTS con`) tránh cộng đôi. `CHILD_KIND` = loại con hợp lệ (project→sub/action, sub→action).
  UI cây ở trang chi tiết OKR (`renderInitRow`, thụt theo depth); "tiến độ THỰC THI" tách khỏi "tiến độ
  KẾT QUẢ" (Key Result). `setInitiativeStatus` (đổi trạng thái đơn, done→100) + action `moveInitiativeAction(id,status)`.
- **`src/components/ExecutionTabs.tsx` ('use client') — Đợt 2**: bộ chuyển 3 view (Danh sách/Kanban/Gantt,
  nhớ ở localStorage `okrExecView`). **KANBAN kéo–thả native HTML5** (draggable + onDrop, optimistic +
  `router.refresh()`; chỉ kéo được nếu `canManage` HOẶC là người được giao — server re-check qua
  `moveInitiativeAction`). **GANTT read-only**: bar start→due theo % ngày, vạch hôm nay, màu theo trạng
  thái. KHÔNG import `initiatives.ts` (tránh kéo `pg` vào client bundle) → hằng số nhãn khai lại trong file.
  List view = children server-render (giữ form thêm/sửa/giao). CSS `.exec-tabs/.kb-*/.gantt-*` ở globals.css.
- Quyền ĐỌC: điều hành + Giám đốc khối + Trưởng phòng xem TẤT CẢ OKR (minh bạch quản lý); **Nhân viên
  (staff) CHỈ xem OKR trong phạm vi đơn vị mình** (đơn vị + chuỗi cấp trên align lên) — `objectiveViewScope`/
  `canViewObjectiveUnit` trong `org.ts`, lọc ở `/objectives` + gác `/objectives/[id]` (CFO 06/08). Quyền SỬA
  giới hạn theo `canManageObjective`.
- **NHÂN VIÊN = CHỈ XEM TOÀN BỘ module OKR + đúng phạm vi đơn vị ở MỌI đường ra (CFO 08/08 — ghi nhớ)**:
  1) `canEditObjective`/`canDeleteObjective`/`canCreateObjective` (access.ts) trả **false ngay nếu `role==='staff'`**
     (BỎ QUA cap `okr.edit`/`scope.all`) → ẩn mọi nút sửa/xoá/tạo trên `/objectives/[id]` VÀ chặn mọi server
     action OKR/KR (sửa OKR, tạo/sửa/xoá KR, check-in, gắn KPI, đặt BSC — đều qua `canManageObjectiveId`→`canEditObjective`).
     Ẩn '+ Tạo OKR' + redirect `/objectives/new` cho staff. Việc ĐƯỢC GIAO staff vẫn cập nhật (đường `assignee`
     trong `canUpdateInitiative`, KHÔNG đổi). 2) **Xuất Excel** `/api/export` truyền `scope` xuống `buildOkrWorkbook`
     (lọc Objectives/KeyResults/Initiatives = cấp Công ty + đơn vị trong scope + OKR mình chủ trì) — tránh rò rỉ qua file.
     3) **Trang /tasks**: `buildTaskViewCtx` dùng **objectiveViewScope theo VAI TRÒ cho staff** (bỏ qua cap `scope.all`),
     `canViewInitiative` lọc; ô lọc "Đơn vị" cũng chỉ liệt kê đơn vị trong scope. → Khi thêm bất kỳ đường XEM/XUẤT
     OKR/việc mới, PHẢI áp cùng `objectiveViewScope` (role-based), đừng chỉ dựa cap. QC bằng psql: role=staff,
     obj/task_scoped < total (đã kiểm 08/08: 21/39 OKR, 25/262 việc).
  4) **NGOẠI LỆ — CÁ NHÂN tự tạo cho mình (CFO 10/08)**: nhân viên VẪN tạo được (a) **OKR cá nhân** (level
     `individual` — `canCreateObjective` cho phép mọi vai trò khi level=individual; popup ở `/my`
     `NewPersonalOkrModal` + action `createPersonalOkrAction`, owner=self, không redirect) và (b) **VIỆC CÁ
     NHÂN** ở `/tasks` (nút "+ Tạo công việc" hiện cho MỌI người; staff → `NewTaskModal personal` form gọn,
     `createTaskAction` ép owner=self, KHÔNG gắn OKR/dự án/đơn vị/ngân sách). Việc cá nhân = **owner-anchored**:
     nới ràng buộc DB `okr_init_attach_ck` (migration **`db/440_personal_task_anchor.sql`**) để việc chỉ cần
     `owner_email` là hợp lệ (không bắt buộc OKR/KR/dự án/cuộc họp). Chính chủ **toàn quyền sửa/xoá** việc cá
     nhân của mình: `canManageTaskLoose` trả true khi việc KHÔNG gắn OKR/KR/dự án/họp và owner/created_by=mình;
     `editInitiativeAction` nhận thêm `owner_email` làm điểm neo; `/tasks` page thêm việc cá nhân vào `manageIds`.
     `Initiative` type + `SELECT` bổ sung cột `created_by`. **⚠ Deploy PHẢI chạy migration 440** (superuser)
     trước/khi build, nếu không INSERT việc cá nhân sẽ vi phạm CHECK cũ.
  Admin hệ thống (users/org/periods) chỉ `exec` (`canAdmin`), guard không xoá exec cuối/chính mình.
- **NĂNG LỰC (Capabilities) = NGUỒN DUY NHẤT của phân quyền (`src/lib/capabilities.ts`)**: `CAPABILITIES` (mỗi mục
  `{key,cat,label,desc,suggest}`) → trang **/admin/permissions** TỰ render ma trận Nhóm quyền × Năng lực (auto, không
  sửa UI). **`DEFAULT_GROUPS` nay SUY từ `suggest`** (không hardcode cap-set nữa): cap-set của mỗi nhóm = mọi cap có
  `suggest` chứa nhóm đó (system_admin luôn có TẤT CẢ). **TỰ GỢI Ý (CFO 30/08)**: thêm 1 năng lực + khai `suggest`
  = nhóm nên có → matrix hiện ô "gợi ý" (gold, `.perm-sg`) ở nhóm suggest nhưng CHƯA bật (do nhóm đã tuỳ biến/lưu
  `okr_settings.perm_groups`), + nút **"Áp dụng gợi ý"** (`ApplySuggestions.tsx`) tick nhanh rồi Lưu. **THÊM TÍNH NĂNG
  MỚI CẦN PHÂN QUYỀN ⇒ (1) thêm `CapKey` + 1 mục `CAPABILITIES` (kèm `suggest`); (2) thêm `can*` helper ở `access.ts`
  (`hasCap`); (3) gắn helper vào guard tính năng (trang/route/action) — LÀM ADDITIVE (cap OR gate cũ) để không ai mất
  quyền.** Đã đóng các "role-gap" (tính năng trước khoá cứng `isExec`/`role!=='staff'`, nay có cap): `report.view`
  (Xem Báo cáo theo cấp — report page/export + link header), `calendar.viewall` (Xem Lịch toàn công ty — calendar
  page), `budget.manage` nay gồm cả XUẤT ngân sách (bỏ isExec ở budget/export). `stored perm_groups` GHI ĐÈ default
  (VALID_CAP lọc key hợp lệ) nên cap mới KHÔNG tự vào nhóm đã tuỳ biến → dùng gợi ý; nhóm chưa tuỳ biến tự nhận qua
  DEFAULT_GROUPS. `savePermissionsAction` vẫn ép system_admin = mọi cap.
- **HỒ SƠ 360° + LỌC THEO NGƯỜI (CFO 30/08)**: xem hồ sơ 360° đầy đủ nay gác bằng năng lực **`user.view360`**
  (`canViewFullProfile`, mặc định gợi ý `system_admin`+`okr_admin`; `users/[email]/page.tsx` OR với `isExec`).
  **Lọc danh sách theo 1 người** qua URL `?owner=<email>`: `/objectives` (ObjectiveTree `initialOwner`→`fOwner`),
  `/tasks` (TaskExplorer `initialOwner`→`fOwner`, khớp `owner_email`), `/projects` (ProjectsList `initialOwner`).
  Hồ sơ 360° (`ListCard` prop `allHref`) render link "Xem …của người này →" trỏ tới các URL đó; băng
  `.person-filter` (gold) nhắc "đang lọc" + nút bỏ lọc. **Thêm khu vực cần lọc-theo-người mới ⇒ theo mẫu này:
  thêm `owner` searchParam + `initialOwner`→`fOwner` (khớp `owner_email`, gồm trong `filterActive`/clear) + link
  `allHref` ở hồ sơ.** (Người = `owner_email` viết thường, khớp toàn app.)
- **NHẬT KÝ HOẠT ĐỘNG hệ thống (CFO 30/08 — `/admin/activity`)**: dùng LẠI bảng `okr_audit_log` (KHÔNG bảng mới).
  Ghi thêm **đăng nhập** = `action='auth.login'` trong `recordLogin` (`users.ts`), **gộp 10 phút** (INSERT…WHERE NOT
  EXISTS trong 10') tránh trùng do nhiều tab/refresh. Trang `src/app/admin/activity/` (gác `canManageSystem`): lọc
  người/loại(`AUDIT_GROUPS` theo tiền tố action)/khoảng ngày/từ khoá + phân trang (`listAudit`/`countAudit` trong
  `audit.ts`); actor bọc `UserLink`. **CHỐNG PHÌNH DB — 2 lớp**: (1) **tự động** — retention lưu ở `okr_settings`
  key `audit_retention_days` (mặc định 180; `getAuditRetentionDays`/`setAuditRetentionDays`, options 0/30/60/90/180/365,
  0=không xoá); route **`/api/audit/prune`** (gác `x-sync-key`/admin, `pruneAuditByRetention`, `?days=N` để ép) do
  **cron n8n "OKR Audit Prune"** gọi hằng ngày. (2) **thủ công** — actions `pruneAuditNowAction`(cũ hơn N ngày)/
  `clearAllAuditAction`(gõ "XOA"). **KHÔNG ghi lượt xem trang** (đây là nguồn phình chính — giữ nguyên không log).
  Migration **`db/460_audit_activity.sql`** thêm index `(actor,created_at)`+`(action,created_at)` + **`GRANT DELETE
  ON okr_audit_log TO btmh_app`** (chạy SUPERUSER — app không tự grant được). Thêm hành động cần truy vết mới ⇒ gọi
  `logAudit()` + thêm nhãn vào `AUDIT_ACTION_LABEL` (+ tiền tố vào `AUDIT_GROUPS` nếu là nhóm mới).
- **⭐ CHECKPOINT AUDIT định kỳ — tự audit + auto-fix + auto-QC + tự báo (CFO 10/09)**: `src/lib/checkpoint.ts`
  `runCheckpoint({dryRun?,infra?,notify?})` — triết lý watchdog price-engine "phát hiện → tự sửa cái sửa được →
  QC lại → CHỈ báo khi còn thứ cần người". **AUTO-FIX (idempotent)**: (1) điền `okr_initiatives.unit_id` theo phòng
  người phụ trách (đồng bộ db/610); (2) sinh Mã việc còn trống (`nextInitCode`). **AUTO-QC (chỉ đọc)**: đếm bất
  thường — mã việc/OKR/dự án trùng hoặc trống, việc thiếu đơn vị dù owner có phòng, user active thiếu phòng,
  không còn exec, việc trỏ dự án đã xoá, thành viên dự án mồ côi. **Hạ tầng** (smoke domain · container up · lệch
  HEAD deploy) do cron n8n đo (SSH) rồi POST vào route `infra`. Mỗi lần chạy **ghi nhật ký `system.checkpoint`**;
  **chỉ gửi email** (qua `sendMail`, người nhận = `okr_settings.checkpoint_alert_emails` phẩy, mặc định exec active)
  khi có vấn đề **severity 'high'** (tránh spam việc vệ sinh 'warn'). Route **`/api/admin/checkpoint`** (gác
  `x-sync-key`/exec; `GET ?dry=1`/`?notify=0`; `POST {infra}`). UI: **Quản trị → "Kiểm tra sức khỏe hệ thống
  (Checkpoint)"** (`runCheckpointAction`, notify=false vì CFO xem trực tiếp) + hiện lần chạy gần nhất từ nhật ký.
  Cron n8n **"OKR Checkpoint Audit — kiểm tra & tự sửa hằng ngày" (id `5yDbflmR0PCkMwR5`, ACTIVE, `30 22 * * *`
  UTC = 05:30 VN)**: SSH đo hạ tầng (smoke 3 domain · `docker inspect` container up · HEAD local vs origin) rồi
  `curl POST 127.0.0.1:8640/api/admin/checkpoint?smoke=…&containers=…&hl=…&hr=…` (SYNC_KEY đọc từ .env). Thêm
  kiểm tra mới ⇒ thêm 1 câu đếm + 1 dòng `add(...)` trong `runCheckpoint` (severity 'high' nếu cần người xử lý
  ngay, 'warn' nếu chỉ vệ sinh). Verify 10/09: chạy tay sạch (ok:true, 0 issue, deploySynced:1, không gửi mail).
- **VAI TRÒ vs VỊ TRÍ (CFO 30/08)**: **Vai trò** (`rbac.ts` Role: ceo/cfo/division_lead/dept_lead/function_lead/staff)
  = CẤP QUYỀN HẠN → phạm vi quản lý (`manageScope`), lập trình cứng. **Vị trí/Chức danh** = preset TỰ PHỤC VỤ
  (`src/lib/positions.ts`, lưu okr_settings key `positions`, KHÔNG cần DDL): mỗi vị trí = nhãn + base_role +
  nhóm quyền mặc định. Quản lý ở **/admin/permissions** (`PositionsManager`); khi thêm/sửa user chọn Vị trí →
  `PositionAutofill` tự điền role+perm_group+title (chỉ điền nhanh, KHÔNG đụng logic phân quyền). Thêm role cấp
  bậc mới ⇒ vẫn phải sửa `rbac.ts` + `manageScope` + `defaultGroupForRole` + Record<Role,*>; còn "chức danh" thì
  admin tự thêm qua Vị trí, không cần lập trình.
  - **⚠ THÊM ROLE MỚI ⇒ PHẢI có MIGRATION NỚI `okr_users_role_check` (CFO 03/09 — bug function_lead)**: cột
    `okr_users.role` có CHECK constraint (đặt ở `db/320_role_ceo_cfo.sql`). 30/08 thêm `function_lead` vào code
    (`ROLES`) NHƯNG QUÊN nới constraint → lưu user "Quản lý chức năng" ném lỗi ràng buộc DB (staff vẫn lưu được),
    hiện ra ngoài là "An error occurred in the Server Components render". Fix: `db/570_role_function_lead.sql` nới
    constraint gồm `function_lead`. **GÁC TỰ ĐỘNG (khỏi phải nhớ)**: `scripts/check-role-constraint.mjs` chạy TRONG
    `npm run build` (nối sau check-page-tours ở package.json) — đọc `ROLES` (rbac.ts) + tập role trong CHECK ở
    migration MỚI NHẤT; nếu có role gán được mà chưa vào constraint ⇒ **build FAIL** kèm hướng dẫn.
    - **⚠ CHECK role có DUY NHẤT 1 CHỦ = migration MỚI NHẤT (hiện `db/570_role_function_lead.sql`)** (CFO 03/09,
      sau ca deploy vỡ): deploy re-run MỌI migration ≥320 mỗi lần, mà `ALTER TABLE ADD CONSTRAINT` re-validate TOÀN
      bảng NGAY. Nếu có 2+ migration cùng ADD `okr_users_role_check` với tập role KHÁC nhau, file số nhỏ hơn (tập
      cũ) sẽ vỡ khi bảng đã có dòng dùng role mới ("violated by some row") + DROP câu trước đã autocommit → MẤT
      constraint. Vì vậy `db/320` KHÔNG còn đụng constraint; chỉ 570 sở hữu. ⇒ **Thêm role mới: (1) `ROLES` rbac.ts,
      (2) SỬA CHÍNH `db/570` thêm role vào CHECK (KHÔNG tạo migration mới re-add).** Deploy tự áp (glob db/*.sql ≥320).
- **ĐỔI EMAIL người dùng (CFO 30/08 — email là KHOÁ CHÍNH `okr_users.email`)**: sửa email nhập sai ở popup
  "Sửa" người dùng (ô "Email đăng nhập"). Vì email là PK + nhiều bảng tham chiếu, `changeUserEmail()` trong
  `src/lib/users.ts` chạy TRONG 1 GIAO DỊCH: INSERT bản ghi user email mới (copy hồ sơ) → dời MỌI tham chiếu
  → DELETE bản cũ (nguyên tử, rollback nếu lỗi). Danh sách cột phải dời nằm ở hằng **`EMAIL_REF_COLS`** +
  2 cột xử lý riêng (`okr_meeting_participants.email` gỡ trùng unique; `okr_google_tokens.email` xoá token
  email mới trước). **⚠ THÊM BẢNG/CỘT MỚI LƯU EMAIL người dùng ⇒ PHẢI thêm vào `EMAIL_REF_COLS`** (nếu không,
  đổi email sẽ bỏ sót → mồ côi dữ liệu). Guard: không đổi email CHÍNH MÌNH (tránh mất phiên → tự khoá);
  không đổi trùng email người khác. `saveUserAction` nhận thêm field `new_email` (chỉ có ở popup Sửa; form
  Thêm user không có nên tương thích ngược). Nhật ký `user.email_change`.

## Trang (src/app/)
- `/` dashboard (tiến độ công ty + OKR công ty/khối) · `/objectives` cây OKR toàn kỳ + tạo mới ·
  `/objectives/[id]` chi tiết (KR + check-in + initiatives + ngân sách + OKR con + lịch sử) ·
  `/my` OKR & việc của tôi · `/admin` + `/admin/{users,org,periods}` (chỉ exec) · `/login` Google.
- **Trang `/my` — bảng CÔNG VIỆC CỦA TÔI theo nhóm (CFO 09/09)**: `listAllInitiativesForOwner` (mọi trạng thái
  trừ canceled) → `MyTasksBoard.tsx` (client) gom 4 nhóm: Đã quá hạn (due<hôm nay & chưa done) · Đang làm
  (in_progress/blocked) · Chưa làm (todo) · Đã hoàn thành (done) — mỗi việc 1 nhóm (quá hạn ưu tiên). Bấm việc →
  modal chi tiết TẠI CHỖ + "Cập nhật nhanh" (trạng thái/tiến độ/minh chứng) qua **`updateOwnTaskProgressAction`**
  (CHỈ owner/created_by, dùng `setInitiativeProgress` — an toàn, KHÔNG đụng field khác như nhánh manage của
  editInitiativeAction) + link "Mở đầy đủ ↗" (/tasks?task=id). CSS `.mytb-*`. **`SearchSelect` name? tuỳ chọn.**
- Server Actions ở `src/app/objectives/actions.ts` + `src/app/admin/actions.ts` (đều `requireUser`/
  `requireExec` + kiểm quyền trước khi ghi).
- **Nút "+ Tạo OKR" ở /objectives = POPUP (CFO 10/08)**: `NewObjectiveModal` bọc `NewObjectiveForm`
  (prop `inline`/`onSuccess`/`onCancel`); `createObjectiveAction` nhận `inline=1` → revalidate thay vì
  redirect (đóng popup + refresh tại chỗ). Dữ liệu form gom ở helper CHUNG **`src/lib/objective-form.ts`
  `buildObjectiveFormProps(user, periodId)`** — DÙNG CHUNG cho popup VÀ trang `/objectives/new` (giữ đồng bộ).
  → Mọi nút tạo (OKR/OKR con/OKR cá nhân/Công việc/Dự án) đều là popup đóng+refresh tại chỗ.
- **Sửa OKR: đổi Cấp + Liên kết cha (CFO 10/08)**: `ObjectiveEditButton` thêm select **Cấp OKR** (allowedLevels)
  + **Liên kết lên OKR cha** (ứng viên theo cấp: pillars cho company, OKR cấp trên cho division/dept/individual;
  loại chính nó). `editObjectiveAction` nhận `level`+`parent_id`: đổi cấp/đơn vị phải `canCreateObjective` phạm vi mới;
  parent kiểm cấp hợp lệ (Cá nhân→Phòng/Khối · Phòng→Khối · Khối→Công ty) + `setObjectiveParent` chống vòng lặp.
  `updateObjective` thêm cột `level` (tuỳ chọn). Dữ liệu ứng viên lấy từ `buildObjectiveFormProps` (dùng chung).
- **Công việc — tự điền đơn vị + hoàn thành đúng hạn (CFO 10/08)**: (a) `NewTaskModal` — chọn "Giao cho"
  (owner) → tự set `unit_id` = đơn vị của người đó (owner/unit thành controlled; chỉ nhảy khi unit trong
  phạm vi); PersonOpt + userOpts thêm `unit_id`. (b) Cập nhật công việc (**cả `TaskEditModal` /tasks LẪN
  `ExecutionTabs` OKR-detail**): trường **Hạn (`due_on`) — người QUẢN việc SỬA được** (CFO 29/08, đảo lại
  quyết định khoá 10/08: chủ trì/thư ký họp, quản OKR, quản trị dời được hạn; người ĐƯỢC GIAO chỉ xem
  `disabled` — không tự dời hạn mình). Server: nhánh `perm.manage` của `editInitiativeAction` nhận
  `due_on: fd.has('due_on') ? orNull(...) : init.due_on`; nhánh assignee KHÔNG đọc `due_on`) + thêm **Hoàn thành**
  (`done_on`) + huy hiệu đúng/trễ hạn (so `done_on` vs `due_on`). `editInitiative` nhận `done_on`
  (`CASE WHEN status='done' THEN COALESCE($done_on,done_on,now()) ELSE NULL`); `editInitiativeAction` truyền
  `done_on` khi form gửi. `Card`/`TaskRow` + TASK_SELECT thêm cột `done_on`.
- **Scorecard KPI — xuất đủ + tạo KPI (CFO 10/08)**: (a) `buildScorecardWorkbook(period,unit,bsc?)` sửa để
  bắt đầu **FROM okr_kpis LEFT JOIN okr_kpi_values** (giống `listScorecard`) → xuất MỌI KPI active trong lọc,
  kể cả KPI chưa có số (trước FROM okr_kpi_values nên rớt KPI trống). Route `/api/scorecard/export` nhận thêm
  `bsc`; link "Xuất Excel" ở `/kpi` gắn `&bsc=`. (b) Nút **"+ Tạo KPI"** trên `/kpi` (`NewKpiModal`, gác
  `canManageKpi`) → `createKpiAction` trong `src/app/kpi/actions.ts` (source='manual', unit_id=null = KPI dùng
  chung; revalidate `/kpi`+`/admin/kpi`). Thư viện KPI đầy đủ vẫn ở `/admin/kpi`.
- **Xuất OKR nhiều kỳ · nhiều đơn vị (CFO 10/08)**: `buildOkrWorkbook(periodIds[], unitIds[], scope)` nhận
  MẢNG (rỗng=tất cả, dùng `= ANY($n::text[])`). Route `/api/export` parse `getAll('period')`+CSV `periods`
  (tương tự unit/units). Nút "Xuất Excel" ở `/objectives` = `ExportOkrModal` (popup, 2 `MultiSelect` kỳ+đơn vị,
  form GET tới `/api/export`, MultiSelect gửi CSV). Vẫn áp `objectiveViewScope` (nhân viên chỉ xuất phạm vi mình).
  Cây OKR trên màn hình GIỮ 1 kỳ (dễ đọc); đa kỳ/đa đơn vị chỉ ở đường XUẤT.
- **Cây tổ chức: SỬA đơn vị (CFO 10/08)**: `/admin/org` thêm nút "Sửa" mỗi đơn vị (`EditUnitButton` popup) →
  `updateUnitAction` (đã có sẵn, gác `requireExec`=**canManageSystem** nên admin hệ thống dùng được, không chỉ
  exec — đáp ứng "OKR quản trị trở lên"). Đổi tên/mã/thứ tự/trực thuộc/ẩn-hiện; chặn tự làm cha của mình; loại
  đơn vị giữ nguyên. `.row-actions` gom Sửa+Xoá.
- **Cơ cấu hiệu lực theo thời gian — Phase 1 (CFO chốt 10/08 "hiệu lực theo mốc")**: `db/450_unit_history.sql`
  bảng **`okr_unit_versions`** (unit_id, effective_from, name/code/parent_id/sort/is_active, note, created_by) +
  seed 1 phiên bản/đơn vị (01/01/2026). `okr_units` GIỮ **ẢNH HIỆN TẠI** (phiên bản hiệu lực ≤ hôm nay mới
  nhất) → mọi query OKR KHÔNG đổi (0 blast radius). `org.ts`: `recordUnitVersion` (ghi mỗi lần thêm/sửa),
  `listUnitsAsOf(date)` (LATERAL lấy phiên bản ≤ ngày), `applyDueUnitVersions()` (áp phiên bản đặt-lịch đã
  tới hạn vào okr_units — gọi khi mở `/admin/org`), `listUnitVersions`. `createUnitAction`/`updateUnitAction`
  nhận `effective_from` (mặc định hôm nay; tương lai → chỉ ghi version, chưa đụng ảnh hiện tại). UI: nút "Sửa"
  + form Thêm có ô "Áp dụng từ ngày"; `/admin/org?asof=YYYY-MM-DD` = xem cơ cấu tại thời điểm (chỉ xem).
  **Phase 2 (CHƯA làm, blast radius rộng)**: hiển thị TÊN đơn vị *as-of kỳ* trong mọi view OKR/báo cáo (đổi
  join `okr_units` → resolve version theo period.starts_on) — cần regression kỹ, làm task riêng.
- **Tạo OKR con NGAY trong OKR cha (CFO 10/08)**: khối "OKR con (alignment xuống)" ở `/objectives/[id]`
  có nút "+ Tạo OKR con" (góc phải-trên, `NewChildOkrModal` — popup EditModal) hiện **luôn** khi
  `canCreateChild` (trước chỉ có link khi rỗng). Server `createChildObjectiveAction` (KHÔNG redirect →
  `revalidatePath('/objectives/[id]')`): parent_id cố định, kỳ + BSC kế thừa cha; cấp con phải THẤP hơn
  cha (`CHILD_LEVELS`); đơn vị con phải ∈ `subtreeIds(parent.unit_id)`; gác `canCreateObjective(level,unit)`.
  Cấp 'individual' chỉ hiện khi `canManage` OKR này. `childLevelOpts`/`childUnitOpts` tính ở page theo quyền.

## Deploy (ĐÃ LIVE 31/07/2026 — https://okr.consultx.vn)
- VPS `45.77.247.185`, biên host nginx + certbot (giống deck/price/ideas). Container Docker
  **`okr-portal`** (Dockerfile standalone, build context = thư mục `okr-portal/`), port 3000→host
  **`127.0.0.1:8640`** (8630 đã bị `ideas-portal` chiếm), `--restart unless-stopped`,
  `--add-host=host.docker.internal:host-gateway` để tới DB `:5435`.
- **Nguồn trên VPS = git worktree** `/home/thang/okr-portal-src` (checkout nhánh
  `claude/okr-kpi-tracking-system-ugv41q` của repo decks, worktree từ `/home/thang/decks-portal`).
  `.env` ngoài git (DATABASE_URL lấy từ decks `.env` = btmh_app/btmh_data; GOOGLE_*, AUTH_SECRET tự sinh,
  AUTH_URL=https://okr.consultx.vn).
- nginx vhost `/etc/nginx/sites-available/okr.consultx.vn.conf` → `127.0.0.1:8640`, cert Let's Encrypt
  `okr.consultx.vn` (certbot --nginx). Google OAuth redirect URI đã whitelist:
  `https://okr.consultx.vn/api/auth/callback/google`.
- **Domain thứ 2 = `https://okr.vanthang.io` — LOGIN GỐC (31/07, kiến trúc 2-container)**: DNS
  *.vanthang.io đã trỏ VPS, vhost `/etc/nginx/sites-available/okr.vanthang.io` (cert riêng), forward
  `X-Forwarded-Host $host`. **QUAN TRỌNG — vì sao 2 container**: Auth.js v5 build này KHÔNG dựng
  redirect_uri từ header dù đã `trustHost:true` (có sẵn từ commit nền tảng) + `AUTH_TRUST_HOST=true` +
  nginx forward `Host`/`X-Forwarded-Host` → redirect_uri rớt về `https://0.0.0.0:3000/...` (đúng lỗi
  stack này luôn phải đặt `AUTH_URL` như deck/price-engine). ⇒ Giải pháp CHẮC CHẮN: **mỗi domain 1
  container, mỗi container 1 `AUTH_URL` riêng** (cùng image `okr-portal:latest`, cùng DB):
  - `okr-portal` (:8640) = domain **consultx**: `--env-file .env` (client CŨ `655980…` +
    `AUTH_URL=https://okr.consultx.vn`). Callback đã whitelist sẵn.
  - `okr-portal-vt` (:8641) = domain **vanthang**: `--env-file .env` + override
    `-e AUTH_URL=https://okr.vanthang.io -e GOOGLE_CLIENT_ID=717726…apps.googleusercontent.com
    -e GOOGLE_CLIENT_SECRET=…` (client MỚI, redirect URI `https://okr.vanthang.io/api/auth/callback/google`
    phải whitelist trong Google client mới). vhost vanthang `proxy_pass 127.0.0.1:8641`.
  - Đã verify redirect_uri đúng theo từng domain (không còn 0.0.0.0), `/login`=200 cả 2. Client mới +
    secret KHÔNG nằm trong .env (chỉ truyền qua `-e` lúc `docker run` container vt).
- **Deploy/redeploy = chạy tay workflow n8n "OKR Deploy — manual (SSH VPS)" (id `S2sxTDJOSjQ3Yd39`)**:
  node SSH (cred "SSH - VPS deploy") — fetch nhánh + `git reset --hard` worktree + `docker build` +
  chạy lại container + migrate (idempotent). Đổi command của node cho từng bước (build vs nginx).
  **MIGRATE nay TỰ ĐỘNG (CFO 03/09)**: node lặp `ls db/*.sql | sort`, chạy MỌI file số ≥320 (bỏ baseline
  001-31x đã seed lúc init) qua `psql -v ON_ERROR_STOP=1` superuser — **thêm migration mới KHÔNG cần sửa
  workflow nữa** (trước là danh sách cứng, dễ quên → bug function_lead). Mọi migration ≥320 phải idempotent
  (deploy re-run mỗi lần); non-idempotent sẽ FAIL sớm (đúng ý đồ).
  **⚠ Khi redeploy (build image mới) PHẢI recreate CẢ 3 container** `okr-portal` (:8640, env-file),
  `okr-portal-vt` (:8641, `-e AUTH_URL=https://okr.vanthang.io` + client vanthang) VÀ `okr-portal-btmh`
  (:8643, `-e AUTH_URL=https://okr.baotinmanhhai.vn` + client vanthang) — nếu chỉ recreate 1 thì container
  kia chạy image cũ. (Command canonical của workflow đã recreate đủ 3.) Thao tác root (nginx/certbot) qua
  container privileged: `docker run --rm --privileged --pid=host --network host -v /:/host nginx:latest ...`
  (BẮT BUỘC `--pid=host` để `nginx -s reload` gửi được tín hiệu).
- **Domain thứ 3 = `https://okr.baotinmanhhai.vn` (27/08, brand chính BTMH)**: DNS `okr.baotinmanhhai.vn`
  A → VPS (BTMH tự trỏ). Container **`okr-portal-btmh` (:8643)** = cùng image, `-e AUTH_URL=https://okr.baotinmanhhai.vn`
  + **DÙNG LẠI Google client vanthang** (`717726…`) → redirect URI `https://okr.baotinmanhhai.vn/api/auth/callback/google`
  **PHẢI whitelist trong client vanthang ở Google Console** (nếu chưa, /login mở được nhưng bấm "Đăng nhập Google"
  báo redirect_uri_mismatch). Cổng 8642 đã bị `deck-converter` chiếm → dùng **8643**. TLS = **cert wildcard
  `*.baotinmanhhai.vn`** (GlobalSign OV, hạn 07/02/2027) đặt tại **`/etc/nginx/ssl/baotinmanhhai.vn/{fullchain,privkey}.pem`**
  (KHÔNG phải certbot — cert do BTMH mua, gia hạn tay: thay 2 file này + `nginx -s reload`). vhost
  `/etc/nginx/sites-available/okr.baotinmanhhai.vn` → `proxy_pass 127.0.0.1:8643`. cert cùng wildcard phục vụ
  được mọi `*.baotinmanhhai.vn` khác sau này. **⚠ vhost dựng TAY PHẢI có `include /etc/letsencrypt/options-ssl-nginx.conf;`
  + `ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;`** (giống vhost certbot) — nếu thiếu, vhost rơi về `ssl_ciphers`
  cũ/hẹp trong `nginx.conf` → `curl` vào được nhưng **Chrome báo `ERR_SSL_PROTOCOL_ERROR`** (đã dính 28/08). Chẩn
  đoán nhanh SSL: `openssl s_client -connect 45.77.247.185:443 -servername <host>` + `curl --resolve <host>:443:45.77.247.185`
  (bỏ qua DNS) — nếu 2 lệnh này OK mà trình duyệt lỗi thì KHÔNG phải server/DNS mà là cấu hình TLS vhost / cache trình duyệt.
- **Email hệ thống OKR = gửi SMTP TRỰC TIẾP từ `okr@baotinmanhhai.vn` (27/08)**: `src/lib/mail.ts` ưu tiên
  nodemailer khi có env `SMTP_HOST` (Gmail `smtp.gmail.com:587` STARTTLS, app-password), fallback
  `N8N_MAIL_WEBHOOK` cũ. Cred trong **`.env` VPS** (ngoài git): `SMTP_HOST/SMTP_PORT/SMTP_USER=okr@baotinmanhhai.vn/
  SMTP_PASS(app-password 16 ký tự, BỎ dấu cách)/MAIL_FROM="BTMH OKR <okr@baotinmanhhai.vn>"`. **`next.config.mjs`
  PHẢI có `experimental.serverComponentsExternalPackages:['nodemailer']`** — nếu bundle, standalone báo
  MODULE_NOT_FOUND lúc chạy. Cả 3 container đọc chung `.env` → mọi domain đều gửi từ okr@baotinmanhhai.vn.
- Migration đã chạy: `db/001_okr_core.sql` + `002_grants.sql` + `010_seed_example.sql` bằng superuser
  (`docker exec wg8owogscc4ogog8ccgw0ok8 psql -U postgres -d btmh_data`). Seed exec = `vanthang81@gmail.com`.

## Nguyên tắc làm việc với CFO
Tự động làm hết, tự tra mọi nguồn, tự review kỹ vài vòng; xong & chắc mới báo. Chỉ hỏi khi cần
quyết định nghiệp vụ/bí mật/quyền mà không tự vượt được.
