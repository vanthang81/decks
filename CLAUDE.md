# decks-portal — Deck portal có kiểm soát truy cập (deck.consultx.vn) · Ngữ cảnh cho Claude

Portal slide deck của **Bảo Tín Mạnh Hải (BTMH)**. Chủ dự án: **Thắng Nguyễn (CFO)**.
Tách từ `vanthang81/n8n` (25/07/2026). Live tại `deck.consultx.vn`.

Ban đầu là site HTML tĩnh; **26/07/2026 nâng thành app Next.js** vì CFO cần **kiểm soát từng
người xem** (link cá nhân + watermark + log + thu hồi) — client-side crypto không làm được.
Thiết kế đầy đủ: `docs/ACCESS-CONTROL.md`. Deck **vẫn soạn dạng HTML self-contained**, app chỉ
phục vụ + chèn watermark/log.

## Stack & cấu trúc
- **Next.js 14 (App Router, standalone)** + TypeScript, **Auth.js v5** (Google OAuth, admin),
  **node-postgres** (không ORM), **jose** (phiên viewer). Không Tailwind — CSS thường (`globals.css`).
  Pattern auth 2 tầng giống price-engine (`src/auth.config.ts` edge, `src/auth.ts` node).
- **Theme ConsultX (chuyên nghiệp)**: palette xanh ConsultX `#3595D5` (sáng/tối), `globals.css` làm lại
  (card shadow, header sticky). Logo + favicon ConsultX nhúng **data-URI** trong `src/lib/brand.ts`
  (logo lấy từ consultx.vn, resize+tối ưu ~2.4KB — KHÔNG để asset rời trong repo public). Header dùng
  chung `src/components/SiteHeader.tsx` (logo→Home + nút "Trang chủ" + slot actions) đặt ở TRÊN `.wrap`
  của trang chủ/admin/login → **mọi trang portal luôn có đường về Home**.
- Nội dung deck: `content/decks/<slug>.html` (self-contained; palette paper `#FBFAF8`/ink `#161A21`/
  accent `#B07B32`/data `#2E6F72`; serif hệ thống + system-ui; nav ←→/Space, sáng/tối; in PDF).
- DB Postgres `btmh_data`, bảng prefix `deck_` (admins/decks/viewers/grants/access_log/otp).
  Schema `db/001_deck_access.sql` (+ `002_deck_content.sql` cột content, `003_admin_groups.sql`
  bảng deck_groups/deck_group_members + cột deck_grants.group_id, `004_group_decks.sql` bảng
  deck_group_decks = entitlement nhóm↔deck, `005_deck_password.sql` cột deck_decks.password_hash,
  `006_deck_meta.sql` cột category/tags(text[])/company(default BTMH)/thumbnail = thư viện phân loại,
  `007_access_events.sql` mở rộng CHECK deck_access_log.event thêm pw_ok/pw_fail/link_resend,
  `008_access_requests.sql` bảng deck_access_requests = yêu cầu xin cấp quyền xem,
  `009_deck_password_plain.sql` cột password_plain = mật khẩu deck dạng đọc-được cho admin xem lại,
  `010_deck_source.sql` cột source_url = link "Nguồn / Chat gốc" tuỳ chọn mỗi deck)
  — chạy bằng superuser postgres qua
  `docker exec` (hoặc n8n admin cred); app dùng user `btmh_app` (đã GRANT). Typecheck: `npm run build`.
- **`mcp-server/` là project RIÊNG** (deps riêng, image Docker riêng `decks-mcp`) → ĐÃ loại khỏi
  build của app (`tsconfig.json` exclude + `.dockerignore`). ĐỪNG bỏ exclude: glob `**/*.ts` sẽ kéo
  `mcp-server/src` vào typecheck app, mà Docker build root chỉ cài deps app → lỗi thiếu
  `@modelcontextprotocol/sdk` (chỉ pass ở local vì còn `mcp-server/node_modules`).

## Phân quyền & luồng (xem `docs/ACCESS-CONTROL.md`)
- **Admin** `/admin`: Google login, allowlist `deck_admins` (seed `vanthang81@gmail.com`). Quản deck
  (public/protected, OTP), cấp/thu hồi link theo người xem, xem nhật ký. Middleware gác `/admin`.
  - **Quản trị viên** `/admin/admins` (chỉ role `admin`): thêm/khoá/xoá admin + đổi vai trò
    `admin`↔`editor` (editor quản deck/người xem/link, KHÔNG đụng mục này). Guard: không tự hạ/xoá
    mình, không xoá admin cuối. `src/lib/admins.ts` + actions `requireOwnerAdmin`.
  - **Nhóm người xem** `/admin/groups` + `/admin/groups/[id]`: gom viewer thành nhóm; cấp 1 deck cho
    cả nhóm → ghi **entitlement `deck_group_decks`** (nhóm RỖNG vẫn giữ quyền) + fan-out link cá nhân +
    watermark riêng từng người (`src/lib/groups.ts`, grant mang `group_id`). Thêm thành viên sau → tự
    nhận link các deck nhóm được cấp; bỏ khỏi nhóm/thu hồi cả nhóm = revoke grant + xoá entitlement.
    Trang chi tiết deck có mục "Cấp cho nhóm" (hiện cả nhóm 0 người). **4 nhóm seed sẵn**: Ban điều hành
    BTMH · Nhà đầu tư · Đối tác chiến lược · Tư vấn & Kiểm toán (2 nhóm đầu+cuối đã được cấp `portal-bao-mat`).
  - **Admin xem MỌI deck**: admin đăng nhập Google mở được mọi deck (công khai+bảo mật) qua `/d/<slug>`
    KHÔNG cần link cấp (route check `auth()`+`getAdmin`); deck bảo mật vẫn bọc watermark định danh admin.
- **Deck tài liệu nội bộ** `portal-bao-mat` (protected): tài liệu kiến trúc bảo mật & phân quyền
  (chuẩn MBB) — publish qua `/api/publish`, chỉ xem qua link được cấp (KHÔNG ở gallery).
- **Viewer**: mỗi người 1 **magic link** `/v/<token>` (lưu sha256, KHÔNG lưu token thô) → phiên jose
  (cookie `deck_session`, 8h) → `/d/<slug>` render **có watermark tên+email+giờ** + log `view`.
  Kiểm grant **mỗi request** → thu hồi tức thì. OTP email tùy chọn per-deck.
- **Mật khẩu deck** (tùy chọn, `deck_decks.password_hash` sha256): 1 mật khẩu chung — ai có link
  `/d/<slug>` + mật khẩu là xem được NGAY (không cần link cá nhân). Truy cập là **HOẶC**: link cá nhân
  (grant active, watermark định danh) **HOẶC** mật khẩu đúng (watermark "mật khẩu chung") **HOẶC** public
  không mật khẩu. Chưa vào được → **trang gate hợp nhất** (`accessGate` trong `/d/<slug>/route.ts`) hiện
  MỌI cách được cấp quyền (deck protected): (a) **Đăng nhập Google** (nút → `/login?callbackUrl=/d/<slug>`);
  (b) ô **mật khẩu chung** (nếu deck có mật khẩu; POST `mode=password` verify → cookie jose `dpw_<id8>` 12h);
  (c) ô **đăng nhập bằng email** (POST `mode=email` → nếu email có grant còn hiệu lực thì `rotateGrantToken`
  cấp token mới + gửi lại link `/v/<token>` qua Deck Mail, phản hồi **trung tính** không tiết lộ email nào có
  quyền; KHÔNG reactivate grant đã thu hồi). (OTP vẫn áp ở luồng click link cá nhân, không chặn mật khẩu/Google.)
- **Xin cấp quyền xem (request → duyệt)** (`db/008`, bảng `deck_access_requests` 1 dòng/(deck,email),
  status pending/approved/denied): trang gate có form **"Yêu cầu quyền xem"** (email + tên + lý do). POST
  `mode=request`: nếu email đã có grant → gửi lại link; nếu chưa → tạo yêu cầu + **email tới MỌI admin đang
  hoạt động** (`src/lib/emails.ts` HTML ConsultX) gồm thông tin người xin (email/tên/lý do/**IP**/**trình
  duyệt+OS** parse từ UA `src/lib/ua.ts`/giờ VN/domain truy cập) + **ảnh preview slide** (nhúng qua
  `/api/thumb/<id>?t=<token ký>` vì Gmail chặn data-URI — token `signThumbToken`) + link deck + **2 nút
  Đồng ý/Không đồng ý** (link 1-chạm kèm token, GET `/api/access-request/<id>?a=approve|deny&t=…`). Duyệt =
  `setRequestStatus`+`approveAndGrant` (cấp grant + email link cho người xem); từ chối = thu hồi grant. Idempotent
  (đã xử lý → báo trạng thái). Admin đổi quyết định ở trang chi tiết deck mục **"Yêu cầu cấp quyền"**; badge
  🔔 "chờ duyệt" ở thư viện (`pendingRequestCountByDeck`). Phản hồi người dùng TRUNG TÍNH (không lộ email nào có quyền).
  `src/lib/accessRequests.ts`. **Lưu ý**: link duyệt 1-chạm (GET) có thể bị trình quét email prefetch → luôn có
  thể đảo quyết định ở admin; muốn chặt hơn thì đổi sang trang xác nhận (POST).
- **Google login cho VIEWER** (không chỉ admin): `signIn` (auth.ts) cho phép **admin allowlist HOẶC người có
  grant còn hiệu lực** (`hasAnyActiveGrant`) — viewer đăng nhập Google có phiên nhưng `isActive=false`. `/d/<slug>`
  GET: phiên Google + admin → xem mọi deck; phiên Google + grant khớp email (`findActiveGrantByDeckEmail`) → xem
  deck đó (watermark định danh, **bỏ qua OTP** vì Google đã xác thực chủ email). **CHỐT CHẶN admin bằng DB
  `is_active`** ở 3 chỗ (vì giờ viewer cũng có phiên): trang chủ `/` (page.tsx), `admin/layout.tsx`, và
  `requireAdminEmail` (mọi server action) → viewer KHÔNG thấy thư viện/khu quản trị, không gọi được action quản trị,
  `/api/thumb` cũng gác `is_active`. Login page nhận `callbackUrl` (chỉ path nội bộ, chặn open-redirect).
  Đặt/gỡ ở trang chi tiết deck (đặt tay / **tạo tự động** / gỡ; hiện 1 lần qua `?pw`, có nút Copy —
  `src/components/CopyField.tsx`). **Admin xem lại mật khẩu bất cứ lúc nào**: lưu thêm `deck_decks.password_plain`
  (db/009) vì mật khẩu chung là "mã cửa" admin chủ động phát; `getDeckPassword(id)` (NGOÀI DECK_COLS, chỉ đọc ở
  trang chi tiết deck đã gác admin) → mục "🔑 Hiện mật khẩu hiện tại". Mật khẩu đặt TRƯỚC db/009 chỉ có hash →
  hiện ghi chú "đặt lại để xem được". API publish + tool MCP `deck_publish` nhận thêm `password` (đặt/gỡ) và
  `generate_password` (tự sinh, TRẢ VỀ mật khẩu trong response). `src/lib/decks.ts`
  (setDeckPassword lưu cả hash+plain / verifyDeckPassword / generateDeckPassword / getDeckPassword). **Đổi schema tool MCP thì phải rebuild
  `decks-mcp` VÀ reconnect connector claude.ai (hoặc mở chat mới) để nạp schema mới.**
- **Trang chủ `/` = thư viện deck NỘI BỘ, ĐÃ KHOÁ sau đăng nhập** (middleware gác `/` + `/admin/*`;
  khách chưa login → đẩy về `/login`). Liệt kê **mọi** deck (badge công khai/bảo mật/OTP/nháp), card mở
  trang quản trị deck. `src/app/page.tsx` + `auth()` guard (defense-in-depth). KHÔNG để lộ danh sách deck ra ngoài.
- **Deck public**: `/d/<slug>` vẫn mở tự do qua link trực tiếp (không watermark) — nhưng KHÔNG còn liệt kê
  công khai ở `/` nữa (muốn khoá luôn cả xem-qua-link thì đổi route `/d`). **Nhãn "Công khai" CHỈ hiện khi
  `visibility=public` VÀ KHÔNG mật khẩu**; public+mật khẩu → nhãn "Bảo mật" (vẫn đòi mật khẩu ở gate). Trang chi
  tiết deck có nút **đổi chế độ Công khai↔Bảo mật** (`setDeckVisibilityAction`).
- **Nguồn / Chat gốc mỗi deck** (`db/010`, cột `source_url`, chỉ hiện ở admin): link tuỳ chọn tới cuộc chat
  Claude (hoặc Google Doc/Outline…) đã tạo deck, để mở lại mà chỉnh sửa. Đặt/đổi/gỡ ở trang chi tiết deck (nút
  "Mở nguồn ↗"); `setDeckSource`/`sanitizeUrl` (CHỈ http/https, chống `javascript:`). API `/api/publish` + tool
  MCP `deck_publish` nhận thêm `source_url` (không truyền = giữ nguyên) → khi Claude publish deck từ chat có thể
  đính link chat luôn. **HỆ KHÔNG tự biết chat gốc** (MCP/API không mang URL chat, Claude không tự biết URL claude.ai
  của mình) → trường này là **thủ công / opt-in** (dán tay hoặc CFO bảo "kèm link chat này"). Đổi schema MCP →
  đã rebuild `decks-mcp`; muốn dùng `source_url` từ chat thì **reconnect connector claude.ai**.
- **Lưu trữ (ẩn) & xoá deck** (trang chi tiết deck): **Ẩn/lưu trữ** = tắt `is_published` (`setDeckPublished`) →
  `/d/<slug>` trả 404, ẩn khỏi người xem, GIỮ nội dung + link đã cấp, khôi phục lại bất cứ lúc nào (badge
  "đã ẩn" ở thư viện/list admin). **Xoá vĩnh viễn** = `deleteDeck` (`DELETE FROM deck_decks`) — phải gõ đúng
  slug để xác nhận (details "Vùng nguy hiểm"); FK cascade tự dọn `deck_grants` + `deck_group_decks`,
  `deck_access_log` giữ lại (deck_id→NULL). Actions `setDeckPublishedAction`/`deleteDeckAction` (redirect
  `/admin?deleted=<slug>`; gõ sai slug → `?del=mismatch`).
- **MỌI deck LUÔN có danh mục + BỘ DANH MỤC GIỚI HẠN < 10 (BẮT BUỘC, tự động — CFO chốt 10/08 & 22/08/2026)**:
  khi thêm/tạo/publish deck mà KHÔNG nhập danh mục thì hệ **tự suy danh mục** — **review NỘI DUNG deck**
  (`src/lib/categorize.ts` `inferCategory`: vòng 1 quét tiêu đề/mô tả/thẻ, vòng 2 quét TEXT nội dung khi chưa rõ).
  Auto-phân loại CHỈ trả về **8 danh mục chuẩn** (`CANONICAL_CATEGORIES`) + fallback `Tài liệu chung` = 9 < 10 →
  **không bao giờ nở quá 10**. `resolveCategory`: **admin nhập tay > danh mục hiện có (KHÔNG ghi đè) > tự suy nội
  dung > fallback**. Áp ở `/api/publish` (⇒ tool MCP `deck_publish`, có truyền `content`) + `createDeckAction`
  (upload, có `content`) + `updateDeckMetaAction` → mọi deck upload/publish đều được phân loại theo nội dung.
  **8 danh mục chuẩn**: Nhà đầu tư · Đối tác · Chiến lược · Nghiên cứu thị trường · Sản phẩm & Nguồn cung ·
  Báo cáo & Quản trị · Hướng dẫn · Nội bộ. Admin vẫn có thể nhập tay danh mục khác (chủ động) nhưng auto giữ
  trong bộ chuẩn để library gọn. **Đừng bỏ bước này**. (Backfill toàn bộ deck theo nội dung: 10/08 lần đầu;
  22/08 phân lại 35 deck theo nội dung, dồn "Nội bộ" 31→ phân bổ đúng 8 danh mục, 0 deck lệch bộ chuẩn.)
  **Ghi chú**: auto dùng từ khoá (nhanh, xác định) — gần đúng, không thay được review của người; muốn AI đọc-hiểu
  từng deck để phân loại thì thêm bước gọi LLM ở pipeline publish (chưa làm).
- **Thư viện phân loại (nhiều deck)**: mỗi deck có **category** (danh mục), **tags** (`text[]`), **company**
  (mặc định BTMH) + **thumbnail** (ảnh preview slide đầu). Trang chủ dùng `src/components/DeckGallery.tsx`
  ('use client'): ô tìm kiếm + chip lọc theo danh mục + **nút đổi kiểu hiển thị Lưới/Danh sách** (giống
  Google Drive, nhớ lựa chọn ở localStorage `deckView`). Card hiện thumbnail (hoặc ô placeholder màu theo
  hash + chữ cái đầu) + badge. **Mỗi card có thanh URL ở chân** (`UrlBar` trong DeckGallery): link **URL
  đầy đủ** mở deck (`/d/<slug>`, tab mới) + nút **Copy** để gửi ngay — KHÔNG cần vào trang quản trị deck.
  Thân card (thumb+nội dung) vẫn link vào `/admin/decks/<id>`; thanh URL tách RIÊNG (tránh lồng `<a>`).
  `baseUrl` dựng URL tuyệt đối = `APP_URL` (fallback header nginx `x-forwarded-proto`/`x-forwarded-host`),
  truyền từ `src/app/page.tsx` xuống DeckGallery. **Card cũng hiện các nhóm được cấp** deck đó (chip
  👥 tên nhóm) — `groupNamesByDeck()` trong `groups.ts` trả map deck_id→tên nhóm, truyền vào DeckLite. **Ảnh preview TỰ CHỤP slide đầu qua browserless**: `src/lib/thumbnail.ts`
  `generateDeckThumbnail` POST `${BROWSERLESS_URL}/chrome/screenshot?token=…` (env VPS
  `BROWSERLESS_URL=http://host.docker.internal:8090` + `BROWSERLESS_TOKEN`, đọc từ container `browserless-shot`)
  → JPEG 1000×563 → lưu data-URI vào `deck_decks.thumbnail`. Tự chạy sau khi publish/sửa nội dung (API + action),
  best-effort (lỗi không chặn publish). Ảnh phục vụ qua route **`/api/thumb/[id]`** (gác admin `auth()`+`getAdmin`,
  trả bytes, `cache-control: private`). Đặt/sửa phân loại ở trang chi tiết deck (mục "Phân loại") + form Thêm deck.
  `src/lib/decks.ts`: `updateDeckMeta`/`setDeckThumbnail`/`getDeckThumbnail`/`listCategories`/`listCompanies`.
  API publish + tool MCP `deck_publish` nhận thêm `company`/`category`/`tags` (đổi schema MCP → rebuild `decks-mcp`
  + reconnect connector claude.ai để nạp schema mới).
- Chặn tải/in: render qua route (không URL file rời) + chặn menu/in + watermark. KHÔNG chặn được chụp màn hình.
- **Cải thiện deck viewer qua portal** (`injectDeckChrome` trong `src/lib/watermark.ts`, chèn vào MỌI deck phục vụ
  qua `/d/<slug>` — cả public raw lẫn bảo mật bọc watermark, qua `deckHtmlResponse` trong route; KHÔNG áp cho
  404/gate). **TẤT CẢ gated theo `#navdock`** (deck generator MBB) ⇒ deck ảnh (`slidesHtml`)/deck HTML thường KHÔNG
  bị đụng. **Sửa 1 chỗ ⇒ áp cho TẤT CẢ deck hiện có + tương lai** (KHÔNG cần sửa/republish từng deck). Gồm:
  (1) **iPad/máy tính bảng cảm ứng** (`@media (pointer:coarse) and (min-width:821px)`): `#navdock` lùi sát mép phải
  (`right:18px` thay `24mm`, CSS) + **cỡ chữ to hơn** (JS inline `html{zoom:1.32 !important}` thay 1.20 tablet) →
  KHÔNG đụng desktop chuột (`pointer:fine`)/điện thoại (<821px, zoom 1.30 của deck).
  (2) **Nút TOÀN MÀN HÌNH `#nb-fs`** (⛶, `requestFullscreen`/`webkit`, phím **F**) + **nút HƯỚNG DẪN `#nb-help`** (?,
  mở overlay `#dhelp` liệt kê phím tắt T/J/K/G/↑/F/Esc) — chèn vào `#navsub`, **kế thừa style `#navsub button`** của deck.
  (3) **TOC `#toc` + bảng thuật ngữ `#gs`**: `overscroll-behavior:contain` + momentum iOS + thanh cuộn maroon rõ +
  `padding-bottom` safe-area; **bù chiều cao** trên iPad (`height:calc(100dvh/1.32)`) vì `html{zoom}` phóng cả phần tử
  `position:fixed` → nếu để `height:100%` thì drawer tràn quá đáy, cuộn không tới cuối. Deck generator dùng `#navdock`
  (`#navsub`: nb-toc ☰ · nb-top ↑ · nb-prev ‹ · nb-next › · nb-gs Aa) + `html{zoom}` theo breakpoint
  desktop≥1120 / tablet 821-1119 (1.20) / mobile≤820 (1.30).
  (**Nút chỉnh cỡ chữ thủ công A−/⟲/A+ đã BỎ theo yêu cầu CFO 22/08.**)

## Hạ tầng & deploy (ĐÃ LIVE 26/07/2026)
- VPS `45.77.247.185`. Biên là **host nginx** (`nginx/1.18.0`) + **certbot** (KHÔNG phải Traefik).
  DNS `consultx.vn` ở Cloudflare?; `vanthang.io` ở **Mắt Bão** (`ns1/ns2.matbao.com`, KHÔNG có wildcard).
- **ĐA DOMAIN (2 domain, 2 container) — cùng portal, cùng DB `btmh_data`**:
  - `deck.consultx.vn` → nginx `proxy_pass 127.0.0.1:8610` → container **`decks-portal-staging`** (`--env-file .env`).
  - `deck.vanthang.io` → nginx `proxy_pass 127.0.0.1:8611` → container **`decks-portal-vanthang`** (`--env-file .env.vanthang`).
  - `/mcp` (cả 2 vhost) → `127.0.0.1:8620` (decks-mcp). TLS mỗi domain 1 cert Let's Encrypt (`certbot --nginx`).
  - **Vì sao 2 container**: Auth.js v5 (standalone) KHÔNG suy được host qua `trustHost`/`x-forwarded-host`
    (ra `redirect_uri=https://0.0.0.0:3000/...` → hỏng OAuth) → BẮT BUỘC mỗi container **ghim `AUTH_URL` riêng**.
    Bỏ `AUTH_URL` = hỏng cả 2 domain. Mỗi domain 1 **Google OAuth client riêng** (mỗi client đã đăng ký sẵn
    redirect URI của domain đó — KHÔNG cần đụng Google Console khi deploy): consultx=client `655980…`,
    vanthang=client `717726…`. Khác biệt duy nhất giữa `.env` và `.env.vanthang` = `AUTH_URL`/`APP_URL`/
    `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`. Cả hai `.env*` NGOÀI git.
  - Cookie phiên host-only (không set `domain`) → mỗi domain phiên độc lập; luồng viewer (mật khẩu/email/OTP/
    `/v`) dùng `reqBaseUrl(req)` (`src/lib/http.ts`) giữ đúng domain đang truy cập (không nhảy domain, mất cookie).
- **Deploy** (cập nhật app): chạy **`bash deploy.sh`** (trong repo) — build 1 image rồi restart **CẢ HAI**
  container (staging :8610 + vanthang :8611). **ĐỪNG chỉ restart 1 container** — domain kia sẽ chạy code cũ.
  (App static Coolify cũ uuid `ssh3yybpge1ps0y9poredqwl` trên :8600 đã bị thay — nginx trỏ 8610.)
- **Email link/OTP**: app POST `N8N_MAIL_WEBHOOK=https://automation.consultx.vn/webhook/deck-mail`
  → workflow n8n **"Deck Mail"** (id `l6RcJ3u6qsdjQ3bu`, active) gửi SMTP ConsultX (from `info@consultx.vn`).
- Thao tác root VPS (nginx/certbot/psql-superuser): user `thang` KHÔNG có passwordless sudo → qua
  container privileged (`docker run --rm --privileged --pid=host --network host -v /:/host nginx:latest
  chroot /host …`), LUÔN `nginx -t` trước reload. n8n SSH cred `SSH - VPS deploy` (`q10ObtcvPYMRQs5P`).
  DB superuser = `postgres` (docker exec vào container `wg8owogscc4ogog8ccgw0ok8`).
- Rollback: trỏ nginx `8610 → 8600` (container static cũ vẫn còn) + reload.

## Thêm deck mới (2 cách)
- **Tự phục vụ trên admin (KHÔNG cần rebuild)**: `/admin` → Thêm deck → nhập slug/tiêu đề → **tải file
  `.html`** hoặc **`.pdf`/`.pptx`/`.ppt`/`.odp`/`.key`** hoặc **dán HTML** → chọn public/protected. Nội dung
  lưu cột `deck_decks.content` (DB), phục vụ ngay. Sửa nội dung sau ở trang chi tiết deck ("Nội dung deck").
  Nguồn render = **DB content > file `content/decks/<slug>.html`** (fallback).
- **Host PDF/PPTX (chuyển thành deck ảnh self-contained — đầy đủ tính năng như deck HTML)**: khi tải file
  tài liệu (`isConvertibleDoc`: pdf/pptx/ppt/odp/key trong `src/lib/convert.ts`), app POST file tới dịch vụ
  **deck-converter** (`${CONVERTER_URL}/convert`, header `x-token: ${CONVERTER_TOKEN}`) → nhận về **ảnh JPEG
  từng slide** → `buildImageDeckHtml` (`src/lib/slidesHtml.ts`) dựng **HTML deck self-contained** (mỗi slide 1
  `<img data-URI>`, nav ←→/Space/PageUp-Down/Home/End/F, đếm trang, fullscreen, in PDF) lưu vào
  `deck_decks.content` **y như deck HTML thường** ⇒ **thừa hưởng TOÀN BỘ tính năng**: watermark định danh, mật
  khẩu chung, cấp/thu hồi link, nhật ký, chặn tải/in, phân loại, thumbnail. Áp ở cả **Thêm deck** (`createDeckAction`)
  và **Sửa nội dung** (`updateContentAction`) qua `extractDeckContent` (`src/app/admin/actions.ts`); convert lỗi →
  redirect `?content=convertfail`. **Giới hạn**: đây là ảnh slide (không phải PDF gốc nhúng) — text không chọn/copy
  được, kích thước lớn hơn; đủ cho mục tiêu "xem có kiểm soát". File >80MB bị converter chặn (`MAX_CONTENT_LENGTH`).
- **Giới hạn dung lượng UPLOAD QUA FORM (2 tầng, phải khớp nhau)**: upload nội dung deck đi qua **Server Action**
  (`createDeckAction`/`updateContentAction`), mà Next mặc định **chặn body 1MB** → deck `.html` self-contained
  (ảnh/font nhúng) hay `.pdf/.pptx` >1MB **bị chặn im lặng** (nhìn như "không upload được"). Đã nâng
  `experimental.serverActions.bodySizeLimit='20mb'` (`next.config.mjs`) khớp nginx `client_max_body_size 20m`
  ở `location /` (`deck.consultx.vn.conf`/`deck.vanthang.io.conf`). ⇒ hiện cho tải tối đa **20MB/file**. Muốn to
  hơn phải nâng **CẢ HAI** (next.config + nginx reload) cho khớp. File `.html` upload = đọc thẳng text làm nội dung
  (giống ô "dán HTML", tiện cho file lớn); `.pdf/.pptx` = qua converter.
- **Qua repo (file)**: tạo `content/decks/<slug>.html` (copy `template.html`) → push `main` → deploy
  (rebuild) → `/admin` Thêm deck với slug trùng tên file.
- **Chuẩn hoá text khi lưu**: `upsertDeck`/`updateDeckMeta` chạy `decodeEntities` cho title/description/
  category/company/tags → tránh lưu literal `&amp;`/`&lt;` (nguồn HTML tự-chứa hay bị encode) rồi hiện sai
  ở UI (React tự-escape → "&amp;" hiện nguyên chữ). Idempotent, an toàn chạy lại trên dữ liệu sạch.
- **Qua API (cho Claude/máy tự publish)**: `POST https://deck.consultx.vn/api/publish` header
  `x-publish-key: <PUBLISH_KEY>` (đọc từ `.env` VPS qua SSH relay), body JSON
  `{slug,title,html,visibility('public'|'protected'),require_otp?,description?}` → upsert vào DB, trả
  `{ok,url}`. Dùng cách này khi CFO nhờ "tạo deck ở Claude chat, publish luôn": sinh HTML self-contained
  → gọi API → trả link. (Proxy sandbox chặn deck.consultx.vn → gọi qua relay curl trên VPS.)
  - **Optimistic lock chống ghi đè khi nhiều phiên cùng sửa 1 deck** (`if_match`, tuỳ chọn — mặc định KHÔNG
    khoá nên tương thích ngược): body thêm `if_match`. **Bỏ trống** = y như cũ. **`"new"`** = chỉ tạo mới, slug đã
    có → **409**. **`<md5 32 hex>`** = md5 nội dung bạn nghĩ đang có trên server; server đã đổi → **409, KHÔNG ghi
    gì**. Response 409 kèm `{reason:'md5_mismatch'|'slug_exists', current_md5, current_len, current_updated_at}`
    để người gọi đọc lại → rebase → gọi lại với `if_match=current_md5`. Response 200 trả thêm `content_md5` +
    `content_len` (dùng làm `if_match` cho lần sau). Kiểm tra + ghi **atomic 1 câu SQL** (`upsertDeckGuarded` +
    `getDeckContentState` trong `src/lib/decks.ts`): mode new = `INSERT … ON CONFLICT DO NOTHING`, mode md5 =
    `UPDATE … WHERE slug=$ AND md5(content)=$` → **không có khe TOCTOU**. `md5` do Postgres tính (chữ thường).
    Tool MCP `deck_publish` cũng nhận `if_match` + báo 409 rõ (đổi schema MCP → rebuild `decks-mcp` + reconnect
    connector claude.ai). **Khuyến nghị mọi phiên khi SỬA deck có sẵn: publish với `if_match=<md5 vừa đọc>`** để
    không đè mất thay đổi của phiên khác (deck đang bị sửa song song từ nhiều chat).
- Nếu protected: thêm viewer → **Cấp link** → gửi (email tự động qua "Deck Mail" hoặc copy link).

## MCP connector cho claude.ai (publish deck từ chat claude.ai)
- **MCP server `deck-publisher`** (`mcp-server/`, Node + @modelcontextprotocol/sdk, Streamable HTTP
  stateless): container `decks-mcp` port `127.0.0.1:8620`, nginx `location /mcp` (snippet
  `/etc/nginx/snippets/deck-mcp.conf`) → endpoint `https://deck.consultx.vn/mcp`. Auth: header
  `Authorization: Bearer <MCP_TOKEN>` (env container). Tool `deck_publish` gọi portal `/api/publish`.
- Deploy/đổi code MCP: `cd mcp-server && docker build -t decks-mcp:latest . && docker rm -f decks-mcp &&
  docker run -d --name decks-mcp -e MCP_TOKEN=… -e PUBLISH_KEY=… -e PORTAL_URL=https://deck.consultx.vn
  -p 127.0.0.1:8620:8620 --restart unless-stopped decks-mcp:latest`. (KHÔNG nằm trong "Decks Deploy".)
- claude.ai: Settings → Connectors → Add custom connector → **Remote MCP server URL =
  `https://deck.consultx.vn/mcp/<MCP_TOKEN>`** (token nằm TRONG url — vì UI connector claude.ai hiện
  chỉ có ô URL + OAuth, KHÔNG có ô request header). Server nhận cả 2: `/mcp/<token>` (path-secret) và
  `/mcp` (header `Authorization: Bearer <token>`, gác ở tools/call). Rotate = đổi env MCP_TOKEN + restart.

## Dịch vụ deck-converter (host PDF/PPTX → ảnh slide)
- **Container RIÊNG `deck-converter`** (thư mục `converter/`: `Dockerfile` debian-slim + **libreoffice-impress**
  (soffice) + **poppler-utils** (pdftoppm) + fonts Noto/CJK/Liberation; `server.py` Flask). Pipeline
  `/convert`: pptx/ppt/odp/key → `soffice --headless --convert-to pdf` → (pdf) `pdftoppm -jpeg -scale-to-x 1600`
  → trả JSON `{ok,count,pages:[base64 JPEG…]}`. Bảo vệ bằng header `x-token` == env `CONVERTER_TOKEN` (thiếu/sai
  → 401). `/healthz` mở. Giới hạn upload 80MB.
- **Chạy (one-off, NGOÀI `deploy.sh` — giống `decks-mcp`)**: build + run trên **network RIÊNG** (BẮT BUỘC):
  ```
  docker build -t deck-converter:latest converter/
  docker network create deck-conv-net 2>/dev/null || true
  docker rm -f deck-converter 2>/dev/null || true
  docker run -d --name deck-converter --network deck-conv-net \
    -e CONVERTER_TOKEN="$CONVERTER_TOKEN" -e PORT=8642 \
    -p 0.0.0.0:8642:8642 --restart unless-stopped deck-converter:latest
  ```
  **VÌ SAO network riêng `deck-conv-net`** (bài học 16/08): nếu để chung `bridge` mặc định với 2 container portal
  thì app **KHÔNG** gọi được qua `host.docker.internal:8642` (Docker hairpin-NAT lỗi khi container bridge gọi cổng
  host publish trỏ về container khác cùng bridge, qua IP `10.0.0.1` không phải gateway) → fetch **timeout**. Đặt
  converter sang network riêng (giống `browserless-shot` ở `shot-website_default`) là hết. `--restart unless-stopped`
  ⇒ tự lên lại sau reboot; `deploy.sh` chỉ dựng lại 2 container portal, **KHÔNG đụng** deck-converter → converter
  cứ chạy độc lập (chỉ chạy lại lệnh trên khi đổi code `converter/` hoặc lỡ xoá container).
- **Env portal (cả `.env` + `.env.vanthang`, NGOÀI git)**: `CONVERTER_URL=http://host.docker.internal:8642` +
  `CONVERTER_TOKEN=<secret>`. App đọc `process.env.CONVERTER_URL/CONVERTER_TOKEN` (`src/lib/convert.ts`); thiếu
  `CONVERTER_URL` ⇒ convert trả null (upload tài liệu sẽ báo lỗi, deck HTML/dán vẫn chạy). Đổi env ⇒ chạy lại
  `deploy.sh` để 2 container portal nạp env mới.
- **QC nhanh** (đã pass 16/08): tạo PDF thật trong deck-converter → `docker cp` sang `decks-portal-staging` →
  `node -e` POST `${CONVERTER_URL}/convert` (x-token) ⇒ `ok=true count=N pages=N`. Reach test:
  `docker exec decks-portal-{staging,vanthang} node -e "fetch('http://host.docker.internal:8642/healthz')"` ⇒ `OK ok`.

## Nguyên tắc làm việc với CFO (áp cho MỌI session)
Luôn **tự động làm hết**: tự tra mọi nguồn (memory/CLAUDE.md mọi project, Outline KB, n8n MCP,
Metabase/BigQuery, GitHub…) để tìm cách tự làm; **tự review & tự kiểm kỹ vài vòng**; xong & chắc
chắn OK mới báo. Hạn chế tối đa việc CFO can thiệp — chỉ hỏi khi gặp cửa thật sự cần quyền/bí mật/
quyết định nghiệp vụ mà mình không có cách tự vượt.
