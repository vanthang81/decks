# decks — Deck engine (deck.consultx.vn) · Ngữ cảnh cho Claude

Kho slide deck HTML tĩnh của **Bảo Tín Mạnh Hải (BTMH)**. Chủ dự án: **Thắng Nguyễn (CFO)**.
Tách từ `vanthang81/n8n` sang repo riêng (25/07/2026). Phát hành tại `deck.consultx.vn`.

## Hạ tầng & deploy (ĐÃ LIVE 25/07/2026 — chi tiết `docs/COOLIFY-SETUP.md`)
- VPS `45.77.247.185`. Biên là **host nginx** (`nginx/1.18.0`) + **certbot**, KHÔNG phải Traefik
  Coolify. Mỗi subdomain = 1 vhost nginx → cổng localhost 1 container.
- Deck = Coolify **static app "decks"** (uuid `ssh3yybpge1ps0y9poredqwl`, project Applications),
  Base Directory `/site`, repo `vanthang81/decks@main`, port `8600:80`. Host nginx vhost
  `deck.consultx.vn` → `proxy_pass 127.0.0.1:8600`; TLS certbot (`/etc/letsencrypt/live/deck.consultx.vn/`).
- DNS: `deck.consultx.vn → 45.77.247.185` (A record, verify 25/07).
- **Đưa deck lên:** push `main` → redeploy Coolify app (auto nếu gắn webhook, hoặc
  `GET coolify.vanthang.io/api/v1/deploy?uuid=ssh3yybpge1ps0y9poredqwl` kèm Bearer token).
- Thao tác root trên VPS (nginx/certbot): user `thang` KHÔNG có passwordless sudo → đi qua
  container privileged (`docker run --pid=host --network host -v /:/host … chroot /host …`),
  LUÔN `nginx -t` trước khi `nginx -s reload`. n8n SSH cred `SSH - VPS deploy` (`q10ObtcvPYMRQs5P`).

## Quy ước deck (BẮT BUỘC giữ đồng nhất)
- Mỗi deck = **1 file HTML self-contained** trong `site/decks/<slug>.html` — KHÔNG framework,
  KHÔNG CDN, KHÔNG build step. CSS/JS inline. Mở file là chạy; in PDF được (mỗi slide 1 trang).
- Thêm deck mới: tạo file từ `site/decks/template.html`, rồi chèn 1 card `<a class="deck">` vào
  `site/index.html` ĐÚNG chỗ đánh dấu `<!-- DECK-INSERT-POINT -->`.
- **Palette**: paper `#FBFAF8` / ink `#161A21` / accent đồng `#B07B32` / data teal `#2E6F72`
  (có biến dark-mode + `data-theme` override sẵn trong template — copy nguyên khối `:root`).
- **Font**: display serif hệ thống (`Georgia, "Times New Roman", serif`) + body `system-ui`.
  KHÔNG nhúng webfont nặng.
- Điều hướng phím `← →` / `Space`, thanh tiến độ, chấm chuyển slide, nút sáng/tối — đã có trong template.

## Nguyên tắc làm việc với CFO (chốt 25/07/2026 — áp cho MỌI session)
Luôn **tự động làm hết**: tự tra mọi nguồn sẵn có (memory/CLAUDE.md mọi project, Outline KB,
n8n MCP, Metabase/BigQuery, GitHub…) để tìm cách tự làm; **tự review & tự kiểm kỹ vài vòng**;
xong xuôi & chắc chắn OK mới báo kết quả. Hạn chế tối đa việc CFO phải can thiệp — chỉ hỏi khi
gặp cửa thật sự cần quyền/bí mật/quyết định nghiệp vụ mà mình không có cách tự vượt.
