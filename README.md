# decks-portal — Deck portal có kiểm soát truy cập

Portal slide deck của **BTMH**, live tại **https://deck.consultx.vn**. Next.js app phục vụ deck
HTML self-contained với **phân quyền từng người xem** (magic link · watermark · log · thu hồi) và
trang quản trị đăng nhập Google.

## Đặc điểm
- **Deck công khai** hoặc **bảo mật** (mỗi người xem 1 link cá nhân, watermark định danh, ghi log,
  thu hồi tức thì, OTP email tùy chọn).
- **Admin** (`/admin`): đăng nhập Google (allowlist), quản deck · cấp/thu hồi link · xem nhật ký.
- Deck vẫn là **1 file HTML self-contained** trong `content/decks/<slug>.html` (không đổi cách soạn).

## Cấu trúc
```
content/decks/<slug>.html   nội dung deck (self-contained)
src/app/                    routes: / (gallery) · /d/<slug> · /v/<token> · /admin · /api/*
src/lib/                    db, auth, grants, session, watermark, otp, mail…
db/001_deck_access.sql      schema deck_* (Postgres)
docs/ACCESS-CONTROL.md      thiết kế & data model
Dockerfile                  build standalone
```

## Thêm deck
1. Tạo `content/decks/<slug>.html` (copy từ `template.html`) → push `main` → deploy.
2. `/admin` → Thêm deck (slug trùng tên file; đặt public/protected).
3. Protected: thêm viewer → Cấp link → gửi.

## Dev
```
cp .env.example .env   # điền DATABASE_URL, GOOGLE_*, AUTH_SECRET, AUTH_URL…
npm install && npm run build && npm start
```

Chi tiết vận hành/deploy: xem `CLAUDE.md` và `docs/ACCESS-CONTROL.md`.
