# Hướng dẫn cài đặt OKR Portal lên SERVER CÔNG TY

> Runbook triển khai **okr-portal** lên server công ty, theo **đúng khuôn mẫu** đã dùng cho
> **BTMH Control Tower (price-engine)**: Next.js standalone chạy Docker + host **nginx** (reverse proxy)
> + **certbot/cert wildcard** + **PostgreSQL `btmh_data`** + **n8n** (deploy & cron).
>
> Đối tượng đọc: CFO + đội IT/DevOps. Ngôn ngữ thao tác: shell trên server công ty.
> Cập nhật lần đầu: 27/09/2026.

---

## 0. Điểm mấu chốt phải nhớ trước khi làm

1. **OKR DÙNG CHUNG database `btmh_data` với price-engine + decks** (bảng prefix `okr_`), và **đọc bảng
   `pe_pricing_config`** (của price-engine) để lấy cấu hình **Metabase → BigQuery** cho KPI.
   → **Nếu price-engine đã lên server công ty** thì `btmh_data` + `pe_pricing_config` **đã có sẵn ở đó** →
   việc cài OKR chủ yếu là: **build container + vhost domain riêng + chạy migration `okr_*` + nối cron**.
   KHÔNG cần dựng lại Postgres/Metabase từ đầu.
2. App **standalone** (Next.js `output:'standalone'`) → chạy 1 process Node trong container, cổng nội bộ **3000**.
3. **Mỗi domain = 1 container** (cùng image, khác `AUTH_URL` + Google client) — vì Auth.js v5 build này KHÔNG
   dựng redirect_uri từ header, bắt buộc đặt `AUTH_URL` cứng cho từng domain.
4. **`.env` NẰM NGOÀI git** (chứa secret) — không bao giờ commit.
5. **Migration `db/*.sql` số ≥ 320 tự chạy mỗi lần deploy** (idempotent). Baseline `001`–`31x` chỉ chạy 1 lần
   lúc khởi tạo DB.

---

## 1. Thông tin cần THU THẬP trước (điền vào bảng này)

| Hạng mục | Giá trị (điền) | Lấy ở đâu |
|---|---|---|
| IP server công ty | `__________` | Đội IT / nơi đã cài price-engine |
| SSH user + key | `__________` | Đội IT (nên tạo cred n8n "SSH - VPS deploy (company)") |
| Đã có Docker? | ☐ có ☐ chưa | `docker version` |
| Đã có host nginx? | ☐ có ☐ chưa | `nginx -v` |
| Đã có Postgres `btmh_data`? | ☐ có ☐ chưa | do price-engine mang sang |
| Cổng Postgres (host) | `__________` (VPS cũ: 5435) | `docker ps`/`.env` price-engine |
| Container/superuser Postgres | `__________` | như price-engine |
| Đã có n8n? | ☐ có ☐ chưa | `automation.<domain>` |
| Domain OKR sẽ dùng | `okr.baotinmanhhai.vn` (khuyến nghị) | DNS công ty |
| Cert TLS | ☐ wildcard `*.baotinmanhhai.vn` ☐ certbot | như price-engine |
| Google OAuth client cho domain | `__________` | Google Cloud Console |
| SMTP gửi mail | `okr@baotinmanhhai.vn` (app-password) | Google Workspace |
| Metabase URL (BI) | `report.consultx.vn` (hoặc BI công ty) | `pe_pricing_config` key `metabase` |

> **Nguyên tắc "giống price-engine":** với mọi giá trị hạ tầng (đường dẫn checkout, tên container Postgres,
> cổng, vị trí cert, cred SSH n8n) → **soi lại đúng cách price-engine đang chạy trên server công ty** rồi dùng
> cùng quy ước. Runbook này dùng **cổng 8640/8641/8643** cho OKR (đừng trùng cổng price-engine 3001).

---

## 2. Yêu cầu hệ thống trên server (prerequisite)

Nếu price-engine đã chạy trên server này thì **hầu hết đã có sẵn**. Kiểm tra/cài bổ sung:

- **OS**: Ubuntu 22.04/24.04 LTS.
- **Docker Engine + CLI**: `curl -fsSL https://get.docker.com | sh` (nếu chưa có).
- **Host nginx**: `apt install nginx`.
- **certbot** (nếu dùng Let's Encrypt): `apt install certbot python3-certbot-nginx`.
  *(Nếu dùng cert wildcard `*.baotinmanhhai.vn` do công ty mua → chỉ cần đặt 2 file `fullchain.pem` + `privkey.pem`.)*
- **git**: `apt install git`.
- **PostgreSQL `btmh_data`**: dùng lại DB mà price-engine đã restore. Nếu OKR đi 1 mình (không kèm price-engine)
  → xem **Phụ lục B** (tách DB).
- **n8n**: dùng lại instance đang chạy (deploy + cron). Nếu chưa có → dựng n8n (Docker) như price-engine.
- **Mạng egress** từ server phải tới được: **Metabase** (BI), **Google** (`accounts.google.com`,
  `oauth2.googleapis.com`, `www.googleapis.com`), **SMTP** (`smtp.gmail.com:587`).
- **Mạng ingress**: mở **443** (và 80 cho certbot).

---

## 3. Chuẩn bị mã nguồn trên server (git checkout / worktree)

Giống price-engine: dùng 1 checkout của repo `decks`, nhánh OKR `claude/okr-kpi-tracking-system-ugv41q`
(hoặc `main` nếu đã merge), **build context = thư mục `okr-portal/`**.

```bash
# Ví dụ đặt tại /home/<user>/okr-portal-src  (mirror cách price-engine đặt /home/<user>/price-engine)
cd /home/<user>
git clone <URL repo decks> okr-portal-src           # nếu chưa có
cd okr-portal-src
git fetch origin
git checkout claude/okr-kpi-tracking-system-ugv41q  # hoặc main
git reset --hard origin/claude/okr-kpi-tracking-system-ugv41q
```

> Deploy key **read-only** của server công ty phải được add vào repo (giống `~/.ssh/gh_deploy` của price-engine).

---

## 4. Tạo file `.env` (NGOÀI git)

Đặt tại `okr-portal-src/okr-portal/.env`. Đây là bản **container domain chính (consultx/base)**; 2 domain kia
override qua `-e` lúc `docker run` (mục 6).

```dotenv
# ── Database (dùng chung btmh_data với price-engine) ──
DATABASE_URL=postgres://btmh_app:<mật khẩu>@host.docker.internal:<cổng 5435>/btmh_data

# ── Auth.js ──
AUTH_URL=https://okr.baotinmanhhai.vn        # domain chính (đổi theo domain container này phục vụ)
AUTH_SECRET=<chuỗi random 32+ ký tự>          # GIỮ NGUYÊN secret cũ để không đăng xuất user
AUTH_TRUST_HOST=true
GOOGLE_CLIENT_ID=<client id>
GOOGLE_CLIENT_SECRET=<client secret>

# ── URL tuyệt đối app (dựng link email/tuyệt đối) ──
APP_URL=https://okr.baotinmanhhai.vn

# ── SMTP gửi mail hệ thống (ưu tiên hơn n8n webhook nếu có SMTP_HOST) ──
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=okr@baotinmanhhai.vn
SMTP_PASS=<app-password 16 ký tự, BỎ dấu cách>
MAIL_FROM=BTMH OKR <okr@baotinmanhhai.vn>

# ── Khoá gọi cron nội bộ (n8n → curl route) ──
SYNC_KEY=<chuỗi random>

# ── (Tuỳ chọn) fallback gửi mail qua n8n nếu không dùng SMTP ──
# N8N_MAIL_WEBHOOK=https://automation.<domain>/webhook/deck-mail
```

> **Metabase/BigQuery**: OKR đọc cấu hình từ bảng `pe_pricing_config` key `metabase` trong `btmh_data`
> (KHÔNG cần env riêng). Chỉ cần server tới được Metabase URL đó.

---

## 5. Build image

```bash
cd /home/<user>/okr-portal-src/okr-portal
docker build -t okr-portal:latest .
```

> Dockerfile đã: `npm run build` (kèm `check-page-tours` + `check-role-constraint` gác lỗi), copy `public/`,
> giữ `nodemailer` external. Build xong image tự chứa mọi thứ để chạy `node server.js` cổng 3000.

---

## 6. Chạy container (1 domain, hoặc 3 domain như hiện tại)

**Tối thiểu — chỉ domain công ty `okr.baotinmanhhai.vn` (khuyến nghị gọn):**

```bash
docker rm -f okr-portal-btmh 2>/dev/null
docker run -d --name okr-portal-btmh \
  --env-file /home/<user>/okr-portal-src/okr-portal/.env \
  -e AUTH_URL=https://okr.baotinmanhhai.vn \
  -e APP_URL=https://okr.baotinmanhhai.vn \
  -p 127.0.0.1:8643:3000 \
  --add-host=host.docker.internal:host-gateway \
  --restart unless-stopped \
  okr-portal:latest
```

**Nếu muốn giữ đủ 3 domain (như VPS cũ):** chạy 3 container cùng image, khác `AUTH_URL` + cổng + Google client:

| Container | Domain | Cổng host | AUTH_URL | Google client |
|---|---|---|---|---|
| `okr-portal` | okr.consultx.vn | 8640 | https://okr.consultx.vn | client "consultx" |
| `okr-portal-vt` | okr.vanthang.io | 8641 | https://okr.vanthang.io | client "vanthang" |
| `okr-portal-btmh` | okr.baotinmanhhai.vn | 8643 | https://okr.baotinmanhhai.vn | client "vanthang" |

```bash
# ví dụ container vanthang (client mới truyền qua -e, không để trong .env)
docker run -d --name okr-portal-vt \
  --env-file .../.env \
  -e AUTH_URL=https://okr.vanthang.io -e APP_URL=https://okr.vanthang.io \
  -e GOOGLE_CLIENT_ID=<client vanthang> -e GOOGLE_CLIENT_SECRET=<secret vanthang> \
  -p 127.0.0.1:8641:3000 --add-host=host.docker.internal:host-gateway \
  --restart unless-stopped okr-portal:latest
```

> ⚠️ Cổng 8640–8643 chỉ ví dụ. **Kiểm `docker ps`/`ss -ltnp` để tránh trùng** cổng price-engine (3001) & app khác.

---

## 7. Chạy migration schema (`okr_*`)

Nếu `btmh_data` đến từ bản `pg_dump` đầy đủ của price-engine thì bảng `okr_*` **đã có sẵn** → chỉ cần chạy để
đảm bảo mới nhất. Nếu là DB trắng → phải chạy **baseline + migration**.

**Cách 1 — DB trắng (lần đầu):** chạy toàn bộ `db/*.sql` theo thứ tự số, bằng **superuser**:

```bash
cd /home/<user>/okr-portal-src/okr-portal
for f in $(ls db/*.sql | sort -t/ -k2 -V); do
  echo "== $f"; docker exec -i <container_postgres> psql -U postgres -d btmh_data -v ON_ERROR_STOP=1 < "$f" || break
done
```

**Cách 2 — đã có DB (nâng cấp):** chỉ chạy migration ≥ 320 (idempotent), giống node deploy n8n:

```bash
for f in $(ls db/*.sql | sort -V | awk -F/ '$2+0>=320'); do
  echo "== $f"; docker exec -i <container_postgres> psql -U postgres -d btmh_data -v ON_ERROR_STOP=1 < "$f" || break
done
```

**Tạo role runtime (nếu DB trắng):**

```sql
-- chạy bằng superuser postgres
CREATE ROLE btmh_app LOGIN PASSWORD '<mật khẩu>';
GRANT USAGE ON SCHEMA public TO btmh_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO btmh_app;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO btmh_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO btmh_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE,SELECT ON SEQUENCES TO btmh_app;
-- OKR cần đọc cấu hình Metabase của price-engine:
GRANT SELECT ON pe_pricing_config TO btmh_app;
-- OKR cần XOÁ nhật ký (retention):
GRANT DELETE ON okr_audit_log TO btmh_app;
```

---

## 8. nginx vhost + TLS

Tạo vhost `/etc/nginx/sites-available/okr.baotinmanhhai.vn` → proxy về cổng container (8643):

```nginx
server {
  listen 443 ssl;
  server_name okr.baotinmanhhai.vn;

  ssl_certificate     /etc/nginx/ssl/baotinmanhhai.vn/fullchain.pem;   # cert wildcard công ty
  ssl_certificate_key /etc/nginx/ssl/baotinmanhhai.vn/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;     # BẮT BUỘC (nếu thiếu → Chrome ERR_SSL_PROTOCOL_ERROR)
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

  client_max_body_size 20m;
  location / {
    proxy_pass http://127.0.0.1:8643;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
server { listen 80; server_name okr.baotinmanhhai.vn; return 301 https://$host$request_uri; }
```

```bash
ln -s /etc/nginx/sites-available/okr.baotinmanhhai.vn /etc/nginx/sites-enabled/
nginx -t && nginx -s reload    # LUÔN test trước khi reload
```

> Nếu dùng **certbot** thay cert wildcard: `certbot --nginx -d okr.baotinmanhhai.vn` (server phải mở 80 + DNS đã trỏ).

---

## 9. Google OAuth (chỉ khi ĐỔI domain)

- **Giữ nguyên domain `okr.baotinmanhhai.vn`** → redirect URI cũ vẫn đúng → **không phải làm gì**.
- Nếu domain mới: vào **Google Cloud Console → APIs & Services → Credentials → OAuth client** tương ứng, thêm
  **Authorized redirect URI**: `https://<domain mới>/api/auth/callback/google`. (Tài khoản Google có quyền quản client.)

---

## 10. n8n — deploy tự động + các cron của OKR

OKR dựa vào n8n cho **deploy** và **~10 cron nghiệp vụ**. Trên server công ty cần **tạo/điều chỉnh** các workflow
để **SSH đúng server mới + curl đúng cổng**. Nếu dùng lại n8n hiện tại → chỉ sửa **cred SSH + host + cổng**.

**Workflow deploy (bắt buộc):** node SSH chạy:
```bash
cd /home/<user>/okr-portal-src && git fetch origin && git reset --hard origin/<branch> \
 && cd okr-portal && docker build -t okr-portal:latest . \
 && <chạy lại 1–3 container ở mục 6> \
 && <chạy migration ≥320 ở mục 7 cách 2> \
 && <smoke: curl -so /dev/null -w '%{http_code}' https://okr.baotinmanhhai.vn/login>
```

**Các cron nghiệp vụ (SSH đọc `SYNC_KEY` từ `.env` rồi `curl` route nội bộ `127.0.0.1:8643`):**

| Mục đích | Route | Lịch (giờ VN) |
|---|---|---|
| Đồng bộ KPI BigQuery | `POST /api/kpi/sync` | `0 7-22 * * *` |
| Nhắc check-in | `POST /api/reminders/checkin` | `0 8 * * *` |
| Nhắc việc (đến hạn+quá hạn) | `POST /api/reminders/tasks?kind=daily` | `0 8 * * *` |
| Tổng hợp quá hạn tuần | `POST /api/reminders/tasks?kind=weekly` | T2 `07:30` |
| Digest sáng | `POST /api/digest/daily` | `0 8 * * 1-6` |
| Bản tin tuần | `POST /api/digest/weekly` | T2 `07:30` |
| Dispatch thay đổi việc | `POST /api/task-changes/dispatch` | `*/30 5-22 * * *` |
| Dọn nhật ký (retention) | `POST /api/audit/prune` | hằng ngày |
| Checkpoint tự audit | `POST /api/admin/checkpoint?...` | `05:30` |

> Route đều gác bằng header `x-sync-key: <SYNC_KEY>`. Mẫu 1 node SSH:
> `KEY=$(grep ^SYNC_KEY .env|cut -d= -f2); curl -s -X POST -H "x-sync-key: $KEY" http://127.0.0.1:8643/api/kpi/sync`
>
> Cách nhanh nhất: **export các workflow OKR từ n8n cũ → import vào n8n công ty → sửa cred SSH + host + cổng**.

---

## 11. Cắt DNS (blue-green — an toàn nhất)

1. Chạy **song song** server cũ + mới; server mới chỉ truy cập nội bộ/qua `--resolve` để verify.
2. Verify đầy đủ (mục 12).
3. **Đổi DNS A record** `okr.baotinmanhhai.vn` → IP server mới; chờ TTL.
4. **Giữ server cũ chạy vài ngày** để rollback nếu cần; **tạm dừng cron ở server cũ** để tránh gửi email trùng.

```bash
# verify không phụ thuộc DNS:
curl -k --resolve okr.baotinmanhhai.vn:443:<IP mới> https://okr.baotinmanhhai.vn/login -o /dev/null -w '%{http_code}\n'
```

---

## 12. Checklist nghiệm thu (verify)

- ☐ `docker ps` — (các) container OKR **Up**.
- ☐ `curl .../login` = **200** trên từng domain.
- ☐ Đăng nhập Google thành công (không lỗi `redirect_uri_mismatch`, không nhảy `0.0.0.0`).
- ☐ Dashboard/OKR/Công việc hiển thị dữ liệu (DB kết nối OK).
- ☐ Bấm "Đồng bộ KPI" ở `/admin` chạy được (Metabase reachable).
- ☐ Gửi email thử (digest `?test=1`) tới hộp thư → nhận được (SMTP OK).
- ☐ Chạy tay 1 workflow cron → 200.
- ☐ Checkpoint `/api/admin/checkpoint?dry=1` sạch.
- ☐ Backup DB tự động đã bật (mục 13).

---

## 13. Backup & an toàn (nên làm ngay khi lên server công ty)

- **pg_dump định kỳ** `btmh_data` → lưu **off-site** (S3/khác máy), giữ ≥ 14 bản; kiểm thử restore định kỳ.
- **`.env` cất trong secret manager** của công ty (không để lộ; sao lưu riêng, mã hoá).
- **Phân quyền server**: tách quyền sudo/DB theo người; bật audit log hệ điều hành.
- **Chứng chỉ**: theo dõi hạn cert; certbot auto-renew hoặc lịch thay cert wildcard.

---

## 14. Rollback nhanh

- **App lỗi**: nginx trỏ lại container cũ (đổi `proxy_pass` cổng) + `nginx -s reload`; hoặc `docker run` lại image tag trước.
- **DNS**: trỏ A record về IP cũ (đã giữ server cũ chạy).
- **DB**: restore từ pg_dump gần nhất (chỉ khi migration hỏng — hiếm vì idempotent).

---

## Phụ lục A — Bảng cổng & container (quy ước OKR)

| Domain | Container | Cổng host nội bộ |
|---|---|---|
| okr.consultx.vn | `okr-portal` | 127.0.0.1:8640 |
| okr.vanthang.io | `okr-portal-vt` | 127.0.0.1:8641 |
| okr.baotinmanhhai.vn | `okr-portal-btmh` | 127.0.0.1:8643 |

## Phụ lục B — Nếu OKR đi RIÊNG (không kèm price-engine)

Phải cắt 2 phụ thuộc chéo:
1. **DB**: tạo DB riêng (vd `btmh_okr`) → `pg_dump -t 'okr_*'` từ DB cũ → restore sang; sửa `DATABASE_URL`.
2. **Cấu hình Metabase**: OKR đang đọc `pe_pricing_config` (bảng của price-engine). Khi tách DB, phải **copy dòng
   config Metabase** sang DB mới (tạo bảng `pe_pricing_config` tối thiểu chỉ với key `metabase`), HOẶC sửa
   `src/lib/bigquery.ts` để đọc config từ **env** thay vì DB. → Đây là thay đổi CODE, cần 1 task riêng + test.

> Khuyến nghị: **đi cùng cụm dùng chung DB** để khỏi đụng code. Chỉ tách khi có lý do bắt buộc.

## Phụ lục C — Biến môi trường (tham chiếu nhanh)

`DATABASE_URL` · `AUTH_URL` · `AUTH_SECRET` · `AUTH_TRUST_HOST` · `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` ·
`APP_URL` · `SMTP_HOST` · `SMTP_PORT` · `SMTP_USER` · `SMTP_PASS` · `MAIL_FROM` · `SYNC_KEY` ·
`N8N_MAIL_WEBHOOK` (tuỳ chọn).

---

### Việc Claude Code hỗ trợ được (khi anh mở chat mới cho migration)
- Soạn sẵn **script provisioning, `.env` mẫu, vhost nginx, lệnh docker run**, chỉnh code (Phụ lục B) qua PR.
- **Tạo/sửa workflow n8n** (deploy + cron) qua n8n MCP, trỏ đúng server mới.
- KHÔNG tự **SSH vào server / đổi DNS** → phần này đội IT chạy theo runbook, hoặc qua workflow n8n SSH.
