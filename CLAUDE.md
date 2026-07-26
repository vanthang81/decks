# decks-portal — Deck portal có kiểm soát truy cập (deck.consultx.vn) · Ngữ cảnh cho Claude

Portal slide deck của **Bảo Tín Mạnh Hải (BTMH)**. Chủ dự án: **Thắng Nguyễn (CFO)**.
Tách từ `vanthang81/n8n` (25/07/2026). Live tại `deck.consultx.vn`.

Ban đầu là site HTML tĩnh; **26/07/2026 nâng thành app Next.js** vì CFO cần **kiểm soát từng
người xem** (link cá nhân + watermark + log + thu hồi) — client-side crypto không làm được.
Thiết kế đầy đủ: `docs/ACCESS-CONTROL.md`. Deck **vẫn soạn dạng HTML self-contained**, app chỉ
phục vụ + chèn watermark/log.

## Stack & cấu trúc
- **Next.js 14 (App Router, standalone)** + TypeScript, **Auth.js v5** (Google OAuth, admin),
  **node-postgres** (không ORM), **jose** (phiên viewer). Không Tailwind — CSS thường (`globals.css`,
  palette deck). Pattern auth 2 tầng giống price-engine (`src/auth.config.ts` edge, `src/auth.ts` node).
- Nội dung deck: `content/decks/<slug>.html` (self-contained; palette paper `#FBFAF8`/ink `#161A21`/
  accent `#B07B32`/data `#2E6F72`; serif hệ thống + system-ui; nav ←→/Space, sáng/tối; in PDF).
- DB Postgres `btmh_data`, bảng prefix `deck_` (admins/decks/viewers/grants/access_log/otp).
  Schema `db/001_deck_access.sql` — chạy bằng superuser postgres qua `docker exec` (hoặc n8n admin cred);
  app dùng user `btmh_app` (đã GRANT). Typecheck: `npm run build` (hoặc `npx tsc --noEmit`).

## Phân quyền & luồng (xem `docs/ACCESS-CONTROL.md`)
- **Admin** `/admin`: Google login, allowlist `deck_admins` (seed `vanthang81@gmail.com`). Quản deck
  (public/protected, OTP), cấp/thu hồi link theo người xem, xem nhật ký. Middleware gác `/admin`.
- **Viewer**: mỗi người 1 **magic link** `/v/<token>` (lưu sha256, KHÔNG lưu token thô) → phiên jose
  (cookie `deck_session`, 8h) → `/d/<slug>` render **có watermark tên+email+giờ** + log `view`.
  Kiểm grant **mỗi request** → thu hồi tức thì. OTP email tùy chọn per-deck.
- **Deck public**: `/d/<slug>` mở tự do (không watermark), hiện ở gallery `/`.
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

## Thêm deck mới
1. Tạo `content/decks/<slug>.html` (copy `template.html`), commit + push `main` → deploy (rebuild container).
2. Vào `/admin` → **Thêm deck** (slug trùng tên file, đặt public/protected).
3. Nếu protected: thêm viewer → **Cấp link** → gửi (email tự động hoặc copy link).

## Nguyên tắc làm việc với CFO (áp cho MỌI session)
Luôn **tự động làm hết**: tự tra mọi nguồn (memory/CLAUDE.md mọi project, Outline KB, n8n MCP,
Metabase/BigQuery, GitHub…) để tìm cách tự làm; **tự review & tự kiểm kỹ vài vòng**; xong & chắc
chắn OK mới báo. Hạn chế tối đa việc CFO can thiệp — chỉ hỏi khi gặp cửa thật sự cần quyền/bí mật/
quyết định nghiệp vụ mà mình không có cách tự vượt.
