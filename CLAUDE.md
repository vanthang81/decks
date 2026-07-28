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
  deck_group_decks = entitlement nhóm↔deck, `005_deck_password.sql` cột deck_decks.password_hash)
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
  không mật khẩu. Chưa vào được + deck có mật khẩu → form nhập (POST `/d/<slug>` verify → cookie jose
  `dpw_<id8>` 12h). Admin bỏ qua. (OTP chỉ áp cho luồng link cá nhân, không chặn đường mật khẩu.)
  Đặt/gỡ ở trang chi tiết deck (đặt tay / **tạo tự động** / gỡ; hiện 1 lần qua `?pw`, có nút Copy —
  `src/components/CopyField.tsx`). API publish + tool MCP `deck_publish` nhận thêm `password` (đặt/gỡ) và
  `generate_password` (tự sinh, TRẢ VỀ mật khẩu trong response). `src/lib/decks.ts`
  (setDeckPassword/verifyDeckPassword/generateDeckPassword). **Đổi schema tool MCP thì phải rebuild
  `decks-mcp` VÀ reconnect connector claude.ai (hoặc mở chat mới) để nạp schema mới.**
- **Trang chủ `/` = thư viện deck NỘI BỘ, ĐÃ KHOÁ sau đăng nhập** (middleware gác `/` + `/admin/*`;
  khách chưa login → đẩy về `/login`). Liệt kê **mọi** deck (badge công khai/bảo mật/OTP/nháp), card mở
  trang quản trị deck. `src/app/page.tsx` + `auth()` guard (defense-in-depth). KHÔNG để lộ danh sách deck ra ngoài.
- **Deck public**: `/d/<slug>` vẫn mở tự do qua link trực tiếp (không watermark) — nhưng KHÔNG còn liệt kê
  công khai ở `/` nữa (muốn khoá luôn cả xem-qua-link thì đổi route `/d`).
- Chặn tải/in: render qua route (không URL file rời) + chặn menu/in + watermark. KHÔNG chặn được chụp màn hình.

## Hạ tầng & deploy (ĐÃ LIVE 26/07/2026)
- VPS `45.77.247.185`. Biên là **host nginx** (`nginx/1.18.0`) + **certbot** (KHÔNG phải Traefik).
  vhost `deck.consultx.vn` → `proxy_pass 127.0.0.1:8610`; TLS `/etc/letsencrypt/live/deck.consultx.vn/`.
- App chạy **container Docker `decks-portal-staging`** (Dockerfile standalone, port 3000→host 8610,
  `--restart unless-stopped`, `--add-host=host.docker.internal:host-gateway` để tới DB `:5435`).
  Nguồn: `/home/thang/decks-portal` (git checkout). **`.env` ngoài git** (DATABASE_URL, GOOGLE_*,
  AUTH_SECRET, **`AUTH_URL=https://deck.consultx.vn`** — BẮT BUỘC để Auth.js/redirect không nhảy `0.0.0.0`).
- **Deploy** (cập nhật app): `cd /home/thang/decks-portal && git fetch && git reset --hard origin/main
  && docker build -t decks-portal:latest . && docker rm -f decks-portal-staging && docker run -d …`.
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
  `.html`** hoặc **dán HTML** → chọn public/protected. Nội dung lưu cột `deck_decks.content` (DB), phục
  vụ ngay. Sửa nội dung sau ở trang chi tiết deck ("Nội dung deck"). Nguồn render = **DB content > file
  `content/decks/<slug>.html`** (fallback).
- **Qua repo (file)**: tạo `content/decks/<slug>.html` (copy `template.html`) → push `main` → deploy
  (rebuild) → `/admin` Thêm deck với slug trùng tên file.
- **Qua API (cho Claude/máy tự publish)**: `POST https://deck.consultx.vn/api/publish` header
  `x-publish-key: <PUBLISH_KEY>` (đọc từ `.env` VPS qua SSH relay), body JSON
  `{slug,title,html,visibility('public'|'protected'),require_otp?,description?}` → upsert vào DB, trả
  `{ok,url}`. Dùng cách này khi CFO nhờ "tạo deck ở Claude chat, publish luôn": sinh HTML self-contained
  → gọi API → trả link. (Proxy sandbox chặn deck.consultx.vn → gọi qua relay curl trên VPS.)
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

## Nguyên tắc làm việc với CFO (áp cho MỌI session)
Luôn **tự động làm hết**: tự tra mọi nguồn (memory/CLAUDE.md mọi project, Outline KB, n8n MCP,
Metabase/BigQuery, GitHub…) để tìm cách tự làm; **tự review & tự kiểm kỹ vài vòng**; xong & chắc
chắn OK mới báo. Hạn chế tối đa việc CFO can thiệp — chỉ hỏi khi gặp cửa thật sự cần quyền/bí mật/
quyết định nghiệp vụ mà mình không có cách tự vượt.
