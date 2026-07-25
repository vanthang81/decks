# Slide Deck — tạo & host tự động

Sinh slide deck HTML self-contained bằng Claude, phát hành tĩnh lên
`deck.consultx.vn` qua Coolify (TLS tự cấp).

## Cấu trúc

```
site/                web root Coolify publish
  index.html         trang gallery liệt kê deck
  decks/
    template.html    deck mẫu (khung chuẩn, 5 slide)
docs/
  COOLIFY-SETUP.md   hướng dẫn gắn vào Coolify + DNS + auto-deploy
```

## Đặc điểm mỗi deck

- Một file `.html` — không framework, không CDN, không build step.
- Điều hướng phím `← →` / `Space`, thanh tiến độ, chấm chuyển slide.
- Sáng/tối tự theo hệ thống + nút đổi thủ công.
- In ra PDF được (mỗi slide một trang).

## Xem thử nhanh (không cần VPS)

Mở trực tiếp file trong trình duyệt, hoặc dùng bản Claude Artifact khi cần
link tạm để duyệt trước.

## Phát hành lên domain riêng

Xem [`docs/COOLIFY-SETUP.md`](docs/COOLIFY-SETUP.md). Sau khi setup 1 lần:
push HTML → Coolify auto-deploy → `https://deck.consultx.vn/decks/<slug>.html`.

## Thêm deck mới

1. Tạo `site/decks/<slug>.html` (copy `template.html` rồi thay nội dung).
2. Thêm một card `<a class="deck">` vào `site/index.html` tại
   `DECK-INSERT-POINT`.
3. Commit + push branch phát hành.
