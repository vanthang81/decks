# decks — Deck engine (deck.consultx.vn) · Ngữ cảnh cho Claude

Kho slide deck HTML tĩnh của **Bảo Tín Mạnh Hải (BTMH)**. Chủ dự án: **Thắng Nguyễn (CFO)**.
Tách từ `vanthang81/n8n` sang repo riêng (25/07/2026). Phát hành tại `deck.consultx.vn`.

## Hạ tầng & deploy
- VPS `45.77.247.185`, chạy **Coolify** (Traefik + Let's Encrypt tự cấp TLS).
- DNS: `deck.consultx.vn → 45.77.247.185` (A record, đã trỏ & verify 25/07).
- **`main` = nhánh production Coolify theo dõi** → đưa code vào `main` là lên web.
- Coolify Static Site: repo `vanthang81/decks`, branch `main`, Base Directory `/site`,
  domain `https://deck.consultx.vn`, bật Generate SSL + Auto Deploy. Chi tiết: `docs/COOLIFY-SETUP.md`.

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
