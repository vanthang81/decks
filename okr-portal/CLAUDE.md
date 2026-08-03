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
- `okr_checkins`: cập nhật tiến độ + `confidence`. `okr_audit_log`: nhật ký.
- **MÃ UNIQUE (db/110, import/export)**: cột `code` ở objectives/key_results/initiatives — định dạng
  `<KHỐI>-O<n>` / `<obj>.KR<m>` / `<obj>.H<kk>` (prefix = mã đơn vị hoặc 'CTY'). Sinh tự động khi tạo
  (`src/lib/codes.ts`: nextObjectiveCode/nextKrCode/nextInitCode); unique index. Hiển thị badge `.okr-code`.
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

## Điều hành: Họp điều hành + Nhận định/Khuyến nghị + Sức khỏe OKR + Bản tin tuần (02/08)
- **`src/lib/health.ts`**: chấm SỨC KHỎE mỗi OKR theo 7 tiêu chí (chủ trì 20 · có KR 20 · có KR lagging 10 ·
  cascade 15 · thực thi 15 · check-in gần đây 10 · KR gắn KPI 10 = 100). `okrHealthSummary` (TB + phân bố
  tốt/khá/yếu + hạng mục thiếu). Hiện ở Dashboard card "Sức khỏe OKR".
- **`src/lib/review.ts`**: ENGINE tổng hợp 1 kỳ (`reviewData`/`currentReviewData`) → nhịp độ, theo Khối,
  BSC, **KPI cảnh báo W/A/E** (quét okr_kpi_values mọi đơn vị, `kpiStatus`), OKR cần chú ý, việc quá hạn,
  toàn vẹn, sức khỏe + **Nhận định/Khuyến nghị rule-based** (Quan sát→Hàm ý→Khuyến nghị). Dùng chung cho:
  trang **`/review`** ("Họp điều hành" WBR/MBR, in đẹp), card Dashboard, và **Bản tin tuần**.
- **Bản tin điều hành tuần**: `src/lib/digest.ts` `sendWeeklyDigest()` dựng HTML từ reviewData → gửi
  **role=exec** (fallback vanthang81@) qua Deck Mail webhook. Route `POST/GET /api/digest/weekly` (gác
  x-sync-key/admin). Nút "Gửi bản tin ngay" ở `/admin` (`sendDigestAction`). **Cron n8n "OKR Weekly Digest"
  (id `zwiPmsyDaCRxgSG2`, ACTIVE, `30 0 * * 1` UTC = Thứ 2 07:30 VN)** SSH curl route. Đã test `sent:2`
  (nguyenvanthang@baotinmanhhai.vn + vanthang81@gmail.com).
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
- Quyền ĐỌC minh bạch (mọi user xem hết OKR); quyền SỬA giới hạn theo `canManageObjective`.
  Admin hệ thống (users/org/periods) chỉ `exec` (`canAdmin`), guard không xoá exec cuối/chính mình.

## Trang (src/app/)
- `/` dashboard (tiến độ công ty + OKR công ty/khối) · `/objectives` cây OKR toàn kỳ + tạo mới ·
  `/objectives/[id]` chi tiết (KR + check-in + initiatives + ngân sách + OKR con + lịch sử) ·
  `/my` OKR & việc của tôi · `/admin` + `/admin/{users,org,periods}` (chỉ exec) · `/login` Google.
- Server Actions ở `src/app/objectives/actions.ts` + `src/app/admin/actions.ts` (đều `requireUser`/
  `requireExec` + kiểm quyền trước khi ghi).

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
  **⚠ Khi redeploy (build image mới) PHẢI recreate CẢ 2 container** `okr-portal` (:8640, env-file) VÀ
  `okr-portal-vt` (:8641, thêm `-e AUTH_URL/GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET` client vanthang) —
  nếu chỉ recreate 1 thì container kia chạy image cũ. Thao tác root (nginx/certbot) qua container
  privileged: `docker run --rm --privileged --pid=host --network host -v /:/host nginx:latest ...`
  (BẮT BUỘC `--pid=host` để `nginx -s reload` gửi được tín hiệu).
- Migration đã chạy: `db/001_okr_core.sql` + `002_grants.sql` + `010_seed_example.sql` bằng superuser
  (`docker exec wg8owogscc4ogog8ccgw0ok8 psql -U postgres -d btmh_data`). Seed exec = `vanthang81@gmail.com`.

## Nguyên tắc làm việc với CFO
Tự động làm hết, tự tra mọi nguồn, tự review kỹ vài vòng; xong & chắc mới báo. Chỉ hỏi khi cần
quyết định nghiệp vụ/bí mật/quyền mà không tự vượt được.
