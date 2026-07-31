# ideas-portal — "Ý tưởng BTMH" · Cổng đề xuất & bình chọn ý tưởng (ideas.consultx.vn + ideas.vanthang.io)

Cổng thu thập ý tưởng + bình chọn của **Bảo Tín Mạnh Hải (BTMH)**. Chủ dự án: **Thắng Nguyễn (CFO)**.
Ai cũng xem được, **muốn đăng ý tưởng/bình chọn phải đăng nhập bằng Google**. Live tại `ideas.consultx.vn`
và `ideas.vanthang.io` (2 tên miền song song, CHUNG dữ liệu).

Nền tảng dùng **Fider** (open-source, self-host) nhưng đã **Việt hóa toàn bộ + gắn thương hiệu BTMH,
gỡ mọi dấu vết Fider + gắn bản quyền BTMH**. Repo này CHỈ chứa lớp tùy biến mỏng (locale VN + branding +
scripts) — build từ source Fider bằng **Dockerfile chính chủ của Fider**, KHÔNG fork toàn bộ source, nên
cập nhật Fider rất nhẹ (chỉ đổi `FIDER_REF`).

## Kiến trúc tùy biến (quan trọng: vì sao update không mất tùy biến)
- **Việt hóa** = ghi đè locale mặc định `en` bằng tiếng Việt (`locale/en/client.json` + `server.json`).
  Ta ghi đè `en` (không thêm `vi`) vì mã `vi` chưa đăng ký trong binary Fider. **LƯU Ý**: chuỗi phía
  client bị **webpack BIÊN DỊCH lúc build** (chunk `locale-*-client-json.<hash>.js`) → KHÔNG overlay file
  lúc chạy được. Vì vậy phải **BUILD LẠI TỪ SOURCE**: `scripts/deploy.sh` clone source Fider, ghi đè
  `locale/en/*.json`, rồi `docker build` bằng **Dockerfile chính chủ của Fider** → webpack tự biên dịch
  tiếng Việt vào chunk. Overlay luôn chạy trước mỗi build ⇒ **Việt hóa tự tái áp dụng sau mỗi update**.
- **Tên trang / logo / CSS gỡ thương hiệu / bản quyền / bật Google / chỉ-Google-login** = lưu ở
  **Postgres** (bảng `tenants`, `tenant_providers`), KHÔNG nằm trong image ⇒ update image không đụng tới.
  `scripts/apply-branding.sh` áp lại (idempotent) sau mỗi deploy để chắc chắn.
- **Logo BTMH** sinh xác định trên VPS bằng `scripts/gen-logo.py` (Pillow, chạy trong container python)
  rồi upsert vào bảng `blobs` + trỏ `tenants.logo_bkey` — tránh lỗi truyền base64. Cache tại
  `branding/logo.png`. LƯU Ý: imagic của Fider CHỈ resize được PNG RGB phẳng (không alpha).
- Ghim phiên bản Fider ở biến `FIDER_REF` trong `scripts/deploy.sh`; đổi giá trị đó để nâng cấp Fider.
- Nguồn build: `/home/thang/fider-src` (clone getfider/fider). Không sửa tay — deploy.sh tự reset.

## Hạ tầng (VPS 45.77.247.185)
- Container Docker **`ideas-portal`** (image `ideas-portal:latest`), cổng `127.0.0.1:8630` → 3000.
  `--restart unless-stopped`, `--add-host=host.docker.internal:host-gateway`.
- Nguồn trên VPS: `/home/thang/ideas-portal` (đồng bộ từ nhánh `claude/voting-system-ideas-87h8zo`
  repo `decks`, thư mục `ideas-portal/`). **`.env` + `.env.vanthang` ngoài git**.
- **DB**: Postgres BTMH dùng chung (container `wg8owogscc4ogog8ccgw0ok8`, host `:5435`), database riêng
  **`fider`** owner role `fider`. Fider tự chạy migration khi khởi động.
- **Biên**: host nginx vhost `ideas.consultx.vn.conf` + `ideas.vanthang.io.conf`; TLS Let's Encrypt
  (`certbot --nginx`), tự gia hạn.
- **Google OAuth**: provider built-in `_google` (route `/oauth/google`, callback `.../oauth/google/callback`).
  Client id/secret ở `.env`/`.env.vanthang` (biến `OAUTH_GOOGLE_*`). User đăng nhập Google khớp email →
  vào đúng tài khoản; admin seed sẵn = `vanthang81@gmail.com` (role=3).

## Hai tên miền song song (chung dữ liệu)
- App phục vụ ở **cả 2 domain**: `ideas.consultx.vn` (container `ideas-portal`, port 8630) và
  `ideas.vanthang.io` (container `ideas-portal-vanthang`, port 8631). **CHUNG database `fider`** ⇒ ý tưởng,
  lượt bình chọn, người dùng **y hệt nhau** ở cả 2 link.
- Vì Fider single-host có 1 BASE_URL cố định (OAuth callback + cookie phiên gắn theo domain), mỗi domain
  chạy 1 container với `.env` riêng: `.env` (BASE_URL=consultx) và **`.env.vanthang`** (BASE_URL=vanthang,
  `OAUTH_GOOGLE_*` = client Google riêng; DATABASE_URL/JWT_SECRET/EMAIL giống hệt).
- Container phụ chạy `./fider` (KHÔNG migrate) vì container chính đã migrate DB dùng chung. Job nền là
  in-memory theo từng instance nên KHÔNG gửi trùng email. Đăng nhập theo từng domain (cookie riêng).
- Google: mỗi domain 1 OAuth client, redirect URI khớp domain đó (`https://<domain>/oauth/google/callback`).

## Deploy & auto-update
- `scripts/deploy.sh` = update source Fider (FIDER_REF) + overlay locale VN + `docker build` + recreate
  **cả 2 container** + apply-branding. Build mất vài phút (npm ci + webpack + go build, chạy trong docker).
- **Tự động**: workflow n8n **"Ideas Deploy"** (cron Chủ nhật 03:00 VN) pull tùy biến từ nhánh git rồi chạy
  `scripts/deploy.sh`; nâng cấp Fider = đổi `FIDER_REF`. Tùy biến luôn được giữ.
- Chạy tay khi cần (qua SSH/n8n): `cd /home/thang/ideas-portal && bash scripts/deploy.sh`.

## Ghi chú vận hành
- **Chỉ đăng nhập Google**: `tenants.is_email_auth_allowed=false`. Nếu Google trục trặc, tạm bật lại
  email auth bằng SQL (`UPDATE tenants SET is_email_auth_allowed=true WHERE id=1;`).
- **Email (thông báo/mã)**: hiện `.env` để SMTP tạm — Google login KHÔNG cần email. Muốn bật email
  thông báo thì trỏ `EMAIL_SMTP_*` sang SMTP thật (vd postal trên VPS) rồi recreate.
- **Đổi logo/tên/CSS**: sửa trong Admin (Site Settings, đã Việt hóa) — lưu DB, giữ khi update. Bản
  quyền/gỡ-Fider ở `branding/custom.css`; logo ở `scripts/gen-logo.py`.
