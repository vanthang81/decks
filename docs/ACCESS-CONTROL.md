# Deck Access Control — Thiết kế phân quyền & bảo mật deck

> Trạng thái: **THIẾT KẾ (Phase 0)** — chốt kiến trúc trước khi code. CFO đã chọn (25/07):
> (1) **kiểm soát từng người xem** (log/thu hồi/watermark theo người) → cần backend, KHÔNG dùng
> mã hoá client-side; (2) **app admin riêng trong repo decks**, đăng nhập Google.

Tài liệu này là nguồn sự thật cho việc biến `deck.consultx.vn` từ site tĩnh thành **mini data‑room**
có kiểm soát truy cập, mà **vẫn giữ cách soạn deck = 1 file HTML self-contained**.

---

## 1. Yêu cầu

| # | Yêu cầu | Cơ chế |
|---|---|---|
| R1 | CFO đăng nhập **Google (Gmail)** để vào trang quản trị | Auth.js v5 + Google OAuth, allowlist `deck_admins` |
| R2 | Mỗi deck **công khai** hoặc **bảo vệ** | cột `visibility` ở `deck_decks` |
| R3 | Deck bảo vệ: **kiểm soát từng người xem** | mỗi người 1 **link cá nhân** (magic link) → phiên riêng |
| R4 | **Ghi log** ai/khi nào xem deck nào (tới từng slide) | bảng `deck_access_log` |
| R5 | **Thu hồi** quyền của từng người bất cứ lúc nào | `deck_grants.status='revoked'` |
| R6 | **Watermark** tên+email+giờ người xem lên deck | inject overlay server-side khi render |
| R7 | **Ngăn/giảm tải-in** | serve trong app (không phải file rời) + chặn ngữ cảnh/in + watermark |

**Nói thẳng giới hạn:** không cơ chế nào ngăn được **chụp màn hình**. Chống rò rỉ thực chất =
watermark định danh (ai lộ thì truy ra) + thu hồi nhanh + log. Đây là chuẩn của DocSend/data‑room.

---

## 2. Kiến trúc

```
                       host nginx (deck.consultx.vn, TLS certbot)
                                     │  proxy_pass 127.0.0.1:8600
                                     ▼
                        ┌──────────────────────────────┐
                        │  Next.js app "decks-portal"  │  (container Coolify, port 3000→8600)
                        │  ├─ /                gallery công khai (chỉ deck public)
                        │  ├─ /d/<slug>        render deck (public: mở; protected: cần phiên)
                        │  ├─ /v/<token>       cổng vào link cá nhân → (OTP?) → phiên viewer
                        │  ├─ /admin/*         Google OAuth, allowlist deck_admins
                        │  └─ /api/*           quản trị + log + cấp/thu hồi link
                        └──────────────┬───────────────┘
                                       │ pg (btmh_data, user btmh_app)
                                       ▼   DDL bằng "Postgres Admin BTMH" qua n8n
                                 Postgres  deck_*  (metadata/grant/log)
        Nội dung deck = file HTML self-contained trong repo: content/decks/<slug>.html
        Gửi email (link/OTP) = app → webhook n8n → SMTP (không nhét SMTP cred vào app)
```

**Nguyên tắc giữ nguyên:** deck vẫn là **1 file HTML self-contained** trong `content/decks/<slug>.html`
(soạn như cũ, `template.html` không đổi). App chỉ **đọc file → chèn watermark/lớp bảo vệ → trả về**.
Metadata (public/protected, ai được xem) nằm ở DB, không nằm trong file.

---

## 3. Data model (Postgres `btmh_data`, prefix `deck_`)

DDL chạy bằng cred **"Postgres Admin BTMH"** qua n8n (btmh_app không có quyền tạo bảng — giống pattern
`pe_cf_*`), rồi `GRANT` cho `btmh_app`. Xem `db/001_deck_access.sql`.

- **`deck_admins`** — allowlist đăng nhập quản trị: `email PK, display_name, role('admin'|'editor'), is_active, created_at`.
- **`deck_decks`** — 1 dòng/deck (metadata; nội dung ở file):
  `id uuid PK, slug unique, title, description, visibility('public'|'protected'), require_otp bool,
   is_published bool, created_by, created_at, updated_at`.
- **`deck_viewers`** — danh bạ người xem: `id uuid PK, email, name, company, note, created_by, created_at`
  (unique lower(email)).
- **`deck_grants`** — 1 dòng = (viewer ↔ deck) + link cá nhân:
  `id uuid PK, deck_id fk, viewer_id fk, token_hash unique, status('active'|'revoked'),
   expires_at nullable, created_by, created_at, revoked_at`. Unique `(deck_id, viewer_id)`.
  → **Chỉ lưu SHA-256 của token**, không lưu token thô (rò DB không lộ link).
- **`deck_access_log`** — mọi sự kiện:
  `id bigserial, deck_id, viewer_id nullable, grant_id nullable,
   event('link_open'|'otp_sent'|'otp_ok'|'view'|'slide'|'denied'|'revoked_hit'),
   slide_no int nullable, ip, user_agent, meta jsonb, created_at`.
- **`deck_otp`** — mã OTP email (khi `require_otp`): `grant_id fk, code_hash, expires_at, attempts, created_at`.

---

## 4. Luồng người xem (viewer) — magic link (mặc định)

1. CFO ở admin: chọn deck bảo vệ → thêm/khách chọn **viewer** (tên, email) → **"Cấp link"** →
   hệ sinh token ngẫu nhiên 32 byte, lưu `sha256(token)` vào `deck_grants`, hiện **link cá nhân**
   `https://deck.consultx.vn/v/<token>` để CFO gửi (hoặc bấm "gửi email" → n8n gửi giúp).
2. Viewer mở link → `/v/<token>`: hash & tra grant. Nếu `active` & chưa hết hạn:
   - Nếu deck `require_otp`: gửi OTP 6 số tới email viewer (`event=otp_sent`), viewer nhập → khớp →
     `otp_ok`. (Bước này chứng minh viewer kiểm soát email → chống chuyển link.)
   - Cấp **cookie phiên** (JWT ký `AUTH_SECRET`, TTL ngắn ~8h) gắn `grant_id/viewer/deck`.
3. Viewer vào `/d/<slug>`: middleware kiểm phiên → grant còn `active` → **render deck có watermark**
   (email+tên+giờ), ghi `event=view`. Client beacon đổi slide → `event=slide` (biết xem tới đâu).
4. **Thu hồi:** CFO set `status=revoked` → lần sau chạm link/route = `revoked_hit` → chặn ngay
   (kiểm tra grant mỗi request, không chỉ dựa cookie).

Tùy chọn khác (bật sau nếu CFO muốn): bắt viewer **login Google** thay magic link.

---

## 5. Quản trị (admin) — Google login

- `/admin` gate bằng Auth.js Google OAuth + allowlist `deck_admins` (mirror `pe_app_users`;
  **tái dùng chính Google OAuth client của price-engine** — chỉ thêm redirect URI).
- Màn hình:
  1. **Decks** — danh sách, tạo/sửa metadata, đặt public/protected, bật OTP, publish.
  2. **Viewers & Links** — theo deck: thêm viewer, cấp/copy/gửi link cá nhân, xem trạng thái, **thu hồi**.
  3. **Nhật ký** — log truy cập theo deck/viewer (ai, khi nào, tới slide mấy, IP).
- Tạo NỘI DUNG deck vẫn qua git (Claude làm) — admin chỉ quản metadata/quyền/log.

---

## 6. Chống tải/in (giảm thiểu, trung thực)

- Deck bảo vệ **không có URL file tĩnh** — chỉ render qua route có phiên.
- Inject: watermark lặp mờ (email+giờ) toàn trang; `@media print { html{display:none} }`;
  chặn `contextmenu`/`selectstart`/`Ctrl+P/S`. (Chỉ *giảm* — chụp màn hình vẫn được → watermark để truy nguồn.)

---

## 7. Triển khai (an toàn, không sập site đang live)

- App = **Next.js standalone + Dockerfile**, chạy container port 3000. Coolify build kiểu Dockerfile
  (đổi từ "static"), map ra host `8600` → **host nginx vhost deck.consultx.vn đã trỏ 127.0.0.1:8600 nên KHÔNG cần đổi nginx**.
- **DB:** DDL `db/001_deck_access.sql` chạy qua n8n cred "Postgres Admin BTMH" → `GRANT` cho `btmh_app`.
- **Env (.env trên VPS, ngoài git):** `DATABASE_URL, GOOGLE_CLIENT_ID/SECRET (tái dùng), AUTH_SECRET,
  N8N_MAIL_WEBHOOK (gửi email), APP_URL=https://deck.consultx.vn`.
- **Email link/OTP:** app POST sang webhook n8n → n8n gửi SMTP (không để SMTP cred trong app).
- **Rollout không downtime:** build & test bản app trên container **cổng tạm** (vd `deck-staging.consultx.vn`
  hoặc host port khác) trong khi `main` (static) vẫn phục vụ. Verify xong mới **cắt** `8600` sang container app,
  gỡ app static. Rollback = trỏ lại container static.

---

## 8. Phân pha

- **Phase 0 — Thiết kế** *(tài liệu này + `db/001_deck_access.sql`)* ✅ đang chốt.
- **Phase 1 — Nền app**: scaffold Next.js, auth Google + allowlist, db libs, schema, deploy staging (chưa cắt live).
- **Phase 2 — Viewer core**: magic link `/v/<token>`, phiên, render deck + watermark, log view/slide, thu hồi.
- **Phase 3 — Admin UI**: quản decks/viewers/links/log; nút cấp & gửi link (n8n email); OTP tùy chọn.
- **Phase 4 — Cắt live**: chuyển `deck.consultx.vn` sang app, di trú deck hiện có, retire static; QA.
- **Phase 5 (tùy)**: OTP email bắt buộc theo deck, hạn dùng link, export log, watermark nâng cao.

---

## 9. Quyết định đã chốt
- Kiểm soát **per-viewer** (không client-side crypto). — CFO 25/07.
- Admin = **app riêng trong repo decks**, không gộp price-engine. — CFO 25/07.
- Viewer vào bằng **magic link cá nhân** (mặc định; OTP email là tùy chọn per-deck). — đề xuất, chờ CFO bác nếu muốn Google-login cho viewer.
- Nội dung deck **vẫn là HTML self-contained trong repo**; DB chỉ giữ metadata/quyền/log.
