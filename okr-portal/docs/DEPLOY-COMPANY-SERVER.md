# Triển khai app OKR lên SERVER CÔNG TY — Hướng dẫn & Prompt AI (bản cho OKR)

> Bản này KẾ THỪA playbook đã thành công với **BTMH MIS (price-engine bản công ty)** và **điều chỉnh cho
> đúng app OKR**. Kiến trúc mục tiêu: **Docker Compose + Caddy (TLS Let's Encrypt) + Postgres RIÊNG (mạng
> internal) + auto-deploy KÉO**, **KHÔNG dùng n8n**, DB **least-privilege**, di trú **mã hoá age**, bàn giao
> **squash git sạch** — giống hệt BTMH MIS.
>
> ⚠️ Bản này **THAY THẾ** runbook khuôn VPS cũ (host nginx + DB dùng chung + giữ n8n) trước đây — khuôn đó
> KHÔNG đúng chuẩn công ty. Cập nhật: 27/09/2026.

---

## §0. REVIEW NOTES — 6 điều chỉnh QUAN TRỌNG so với bản playbook gốc (áp riêng cho OKR)

Bản gốc viết cho price-engine nên có vài chỗ **không đúng với OKR**. Đã sửa trong tài liệu, tóm tắt để anh nắm:

1. **"OKR không có BigQuery" là SAI.** OKR **có** kéo KPI (doanh thu/lãi gộp/tồn kho) từ **BigQuery qua
   Metabase** (`src/lib/bigquery.ts` → POST `{metabase}/api/dataset`, database 5 = `btmh-dwh-485609`). ⇒ phải
   quyết định giữ hay bỏ luồng này (xem §0.5-mục 1). App KHÔNG có chatbot/AI/Telegram (đã grep xác nhận) → phần
   "egress ra AI" (Nhóm A) = **N/A**.
2. **Phụ thuộc chéo DB.** OKR đọc bảng **`pe_pricing_config`** (của price-engine) để lấy cấu hình Metabase.
   Khi cho OKR **DB riêng chỉ có `okr_*`** thì bảng này KHÔNG tồn tại → KPI sync gãy. ⇒ **phải refactor** đọc
   cấu hình từ **ENV** (`METABASE_URL`/`METABASE_API_KEY`) thay vì DB (task code nhỏ ở Pha B), hoặc seed 1 dòng
   config tối thiểu. **Khuyến nghị: refactor sang ENV** (cắt hẳn coupling).
3. **`worker` là BẮT BUỘC, không phải tuỳ chọn.** OKR có **~8 job nền định kỳ** (bản gốc ghi "bỏ nếu không có
   job nền"). Phải dựng container `worker` thay toàn bộ cron n8n (danh sách ở §0.5-mục 3).
4. **DSAR + Google tokens.** OKR chứa **nhiều PII nhân sự** (user, tên, email, cây tổ chức, bình luận, nhật ký
   theo actor) **và OAuth token Google Calendar** (`okr_google_tokens`). Cần tính năng **xem/xoá dữ liệu 1 người**
   (Nhóm B — DSAR) + xử lý token (khuyến nghị **KHÔNG di trú token**, để user tự nối lại Calendar).
5. **Tách repo riêng để squash sạch.** Code OKR đang nằm **chung repo `decks`** (`okr-portal/` + `decks` +
   `mcp-server`). Để "gộp lịch sử về 1 commit sạch, repo private" cho gọn, nên **`git filter`/tách OKR ra repo
   riêng** trước khi squash (CLAUDE.md đã dự trù "khi có repo riêng thì git mv").
6. **Bỏ n8n mail webhook + publish deck.** OKR đã hỗ trợ **SMTP trực tiếp** (nodemailer) → dùng SMTP, bỏ
   `N8N_MAIL_WEBHOOK`. Việc publish "deck giới thiệu" (deck.consultx.vn) là ngoài phạm vi bản công ty → bỏ.

---

## §0.5. ĐẶC THÙ OKR (đọc kỹ trước khi làm)

**1) Luồng KPI BigQuery — ✅ ĐÃ CHỐT: GIỮ (phương án a, CFO 27/09).**
- App gọi **Metabase** (`report.consultx.vn`) → Metabase truy vấn **BigQuery** (`btmh-dwh-485609`, DWH của công
  ty). Đây là **kéo số liệu tổng hợp VỀ**, không phải đẩy PII ra AI.
- **Giữ nguyên luồng KPI.** Cho server công ty **egress tới Metabase** (khai báo Nhóm A là "residual có chủ
  đích" + chặn mọi egress ngoài danh sách cho phép + log). **BẮT BUỘC** có `METABASE_URL` + `METABASE_API_KEY`
  trong `.env` (sau khi refactor đọc cấu hình từ ENV — mục §0-điểm 2). Job `kpi/sync` GIỮ chạy ở worker.
- *(Sau này nếu công ty dựng Metabase nội bộ thì chỉ đổi 2 biến ENV, không đụng code.)*

**2) DB & di trú:** chỉ trích **bảng `okr_*`** từ `btmh_data` VPS cũ. Cân nhắc **loại `okr_google_tokens`**
(token OAuth — nhạy cảm, để user tự nối lại). Sau restore: chạy **grants.sql** (least-privilege theo bảng).
Migration schema: `db/*.sql` — baseline `001–31x` (DB trắng) + mọi file **≥ 320 idempotent** (nâng cấp).

**3) Các job nền phải chuyển từ n8n sang `worker/` (in-repo):** worker gọi route nội bộ kèm header
`x-sync-key: <SYNC_KEY>` (các route đã có sẵn xác thực này — đã kiểm), hoặc gọi thẳng hàm lib.

| Job | Route (đã có, gated x-sync-key) | Lịch (giờ VN) |
|---|---|---|
| Đồng bộ KPI BigQuery | `POST /api/kpi/sync` | `0 7-22 * * *` |
| Nhắc check-in | `POST /api/reminders/checkin` | `0 8 * * *` |
| Nhắc việc đến hạn/quá hạn | `POST /api/reminders/tasks?kind=daily` | `0 8 * * *` |
| Tổng hợp quá hạn tuần | `POST /api/reminders/tasks?kind=weekly` | T2 `07:30` |
| Digest sáng | `POST /api/digest/daily` | `0 8 * * 1-6` |
| Bản tin tuần | `POST /api/digest/weekly` | T2 `07:30` |
| Dispatch thay đổi việc | `POST /api/task-changes/dispatch` | `*/30 5-22 * * *` |
| Dọn nhật ký (retention) | `POST /api/audit/prune` | hằng ngày |
| Checkpoint tự audit | `POST /api/admin/checkpoint` | `05:30` |

**4) Auth/domain:** 1 domain `okr.baotinmanhhai.vn`, 1 app container. **BẮT BUỘC set `AUTH_URL`** (Auth.js v5
build này không dựng redirect_uri từ header → thiếu sẽ nhảy `0.0.0.0`). Giữ domain → redirect URI Google không
đổi. **`nodemailer` để external** (đã cấu hình `next.config.mjs`).

**5) Endpoint ghi DB không xác thực:** đã kiểm — 9 route cron đều gated `x-sync-key` HOẶC session admin; route
người dùng (`/api/notifications/act`, `/api/comments`…) kiểm session. ⇒ Nhóm D/E phần endpoint = đạt (vẫn rà lại).

---

# PHẦN A — HƯỚNG DẪN

## 1. Mục tiêu
Đưa app OKR từ VPS cá nhân cũ sang **server công ty**, đóng gói Docker, làm sạch bảo mật theo bộ audit IT, bàn
giao code review **không còn vi phạm**.

## 2. Ràng buộc BẮT BUỘC (giống BTMH MIS)
1. **KHÔNG đụng/sửa gì trên VPS cá nhân cũ** (`45.77.247.185`) — chỉ đọc để lấy dump `okr_*`.
2. **Chỉ thao tác trên server công ty.** Chạm server ngoài/cá nhân → **hỏi & chờ xác nhận**.
3. **SOP/secret bản OKR lưu vào MỘT tài liệu Outline RIÊNG cho OKR** (tách khỏi doc BTMH MIS & doc app cũ).
4. Server công ty **chỉ vào qua VPN (FortiClient)** → chạy lệnh từ **laptop đã nối VPN**, **SSH key IT cấp**.

## 3. Kiến trúc mục tiêu (Docker Compose — chỉ Caddy mở cổng)

| Container | Vai trò | Ghi chú OKR |
|---|---|---|
| `caddy` | TLS + reverse proxy, Let's Encrypt auto-renew | domain `okr.baotinmanhhai.vn` |
| `app` | App OKR (Next.js standalone, cổng nội bộ 3000) | `AUTH_URL` bắt buộc; `nodemailer` external |
| `worker` | **BẮT BUỘC** — chạy 8 job nền (§0.5-mục 3) | thay toàn bộ cron n8n |
| `postgres` | DB **RIÊNG** của OKR (`okr_*`), user quyền hẹp | mạng `internal`, KHÔNG ra internet |

Egress cho phép (khai báo residual): **Metabase/BigQuery** (nếu giữ KPI), **Google** (OAuth+Calendar),
**SMTP** (`smtp.gmail.com:587`). Ngoài ra chặn.

**Template:** sao khung deploy từ repo BTMH MIS: `deploy/scripts/{bootstrap-server,gen-secrets,deploy,backup,
restore,healthcheck,migrate-pull,migrate-export,first-setup}.sh`, `deploy/sql/grants.sql`,
`docker-compose.yml`, `Caddyfile`, `.env.example` — chỉ chỉnh tên/biến + thêm service `worker`.

## 4. Cần chuẩn bị (xin trước)
- **Từ IT:** SSH key server công ty; xác nhận 80/443 mở cho OKR; DNS `okr.baotinmanhhai.vn`.
- **Từ chủ sở hữu:** Google OAuth client (redirect `https://okr.baotinmanhhai.vn/api/auth/callback/google`);
  quyền đọc VPS cũ lấy dump; **khoá backup age** (sinh mới, private key giữ offline); **`METABASE_URL` +
  `METABASE_API_KEY`** (KPI đã chốt GIỮ — §0.5-mục 1).
- **Dữ liệu:** OKR trong DB dùng chung `btmh_data` VPS cũ → **chỉ trích `okr_*`** (cân nhắc bỏ `okr_google_tokens`).

## 5. Các bước triển khai (tuần tự, có checkpoint)
1. **Bootstrap server** (1 lần, sudo): Docker+compose, swap, `ufw` (22/80/443), `fail2ban`, cron auto-deploy
   `*/5` + backup đêm. In **deploy key** → thêm vào GitHub repo OKR **read-only**.
2. **Di trú mã hoá đầu-cuối:** server sinh khoá age → VPS cũ dump **chỉ `okr_*`** → nén + age → chép **2 chặng
   qua laptop** → server giải mã, kiểm `sha256` → **shred bản rõ** ở VPS cũ.
3. **`gen-secrets`:** sinh mật khẩu DB/secret vào `.env` (chmod 600); điền domain + OAuth + ACME email +
   (nếu giữ KPI) Metabase.
4. **`first-setup`:** nạp dump `okr_*` vào Postgres trống → `grants.sql` → chạy migration → dựng stack (app+worker+caddy).
5. **QC trước cắt DNS:** thêm tạm dòng hosts trỏ domain về IP server → đăng nhập, kiểm từng màn hình + KPI + email thử + 1 job worker.
6. **Cắt chuyển:** đổi DNS A → server công ty; Caddy tự xin cert.
7. **Self-audit/QC/fix nhiều vòng** tới khi **hội tụ** (§6).

## 6. Checklist bảo mật (đối chiếu audit gốc — khép từng nhóm)
- **Nhóm A — Egress AI/bên thứ 3:** OKR **không có** chatbot/AI/Telegram → **N/A** (ghi rõ). Luồng
  Metabase/BigQuery là **kéo số tổng hợp về từ DWH công ty**, không đẩy PII ra AI → khai "residual có chủ đích"
  + chặn egress ngoài danh sách cho phép + log.
- **Nhóm B — Dữ liệu & vòng đời:** DB về VN (server công ty); **backup age + retention** (đã có nhật ký
  retention `audit_retention_days`); **DSAR** — bổ sung tính năng **xem/xoá/ẩn danh dữ liệu 1 người** (user +
  bình luận + nhật ký actor + tokens); xử lý `okr_google_tokens`.
- **Nhóm C — Bí mật KD:** logic phân quyền/tài chính **server-side** (đã kiểm: 0 `NEXT_PUBLIC` secret); repo private.
- **Nhóm D — Shadow IT:** **gỡ toàn bộ n8n** → job nền vào `worker/` (git); mọi endpoint ghi DB có khoá/kiểm quyền (đã có).
- **Nhóm E — Kiểm soát truy cập:** 0 secret client bundle; route public tự kiểm khoá; DB **least-privilege**
  (user app không super/createdb, grant theo bảng; thêm `GRANT SELECT pe_pricing_config` **CHỈ nếu** không refactor ENV;
  `GRANT DELETE okr_audit_log`).
- **Hạ tầng:** chỉ Caddy publish 80/443; Postgres `internal`; SSH key-only; không `docker.sock`, không
  `privileged`; security headers (HSTS/nosniff/X-Frame).

## 7. Làm sạch trước bàn giao IT
- Xoá **mọi dấu vết hệ thống cũ**: n8n, Metabase-consultx, deck.consultx, domain `*.consultx.vn`/`*.vanthang.io`,
  IP/username VPS cá nhân — trong **code, tài liệu, message commit**.
- **Không secret trong file track**; quét `gitleaks`/`trufflehog`.
- **Tách OKR ra repo riêng** rồi **squash về 1 commit sạch** (orphan) → repo **private**.
- Quét hội tụ: `grep` toàn repo + **runtime bundle** = 0 dấu vết; `npm run build` sạch; các màn hình 200; healthcheck OK.

## 8. Rủi ro IT sẽ ghi nhận (chuẩn bị trả lời)
Single-admin/bus-factor · phụ thuộc VPN · rebuild image vá CVE định kỳ · kho secret Outline (bật 2FA/SSO) ·
**egress Metabase/BigQuery** (nếu giữ KPI) — ghi rõ "residual có chủ đích".

---

# PHẦN B — PROMPT AI (dán vào Claude Code chạy trên laptop có VPN)

> Mở Claude Code trên **laptop đã nối VPN công ty**, tại thư mục **repo app OKR**. Dán nguyên khối dưới đây.
> Thay `«…»` bằng thông tin thực tế (hoặc để AI hỏi).

```text
Bạn là kỹ sư triển khai. Nhiệm vụ: đưa app OKR này (repo hiện tại) lên SERVER CÔNG TY, đóng gói Docker
Compose, làm sạch bảo mật theo bộ audit CNTT, bàn giao code review không còn vi phạm. App chị em BTMH MIS
(price-engine bản công ty) đã làm y hệt quy trình — TÁI SỬ DỤNG khung deploy đó (deploy/scripts,
docker-compose.yml, Caddyfile, deploy/sql/grants.sql, .env.example), CHỈ chỉnh tên/biến + THÊM service worker.

BỐI CẢNH & TÀI NGUYÊN
- Server công ty: «IP», user «user», CHỈ vào qua VPN, SSH key IT cấp ở «đường dẫn key».
- Domain: «okr.baotinmanhhai.vn». DNS/OAuth/cert: hỏi tôi khi cần.
- Dữ liệu OKR nằm trong DB DÙNG CHUNG `btmh_data` trên VPS cá nhân cũ «45.77.247.185». Khi di trú CHỈ lấy
  bảng `okr_*` — KHÔNG mang cả DB. CÂN NHẮC bỏ bảng `okr_google_tokens` (token OAuth — để user tự nối lại).

ĐẶC THÙ OKR — BẮT BUỘC XỬ LÝ (khác price-engine)
1. App KHÔNG có chatbot/AI/Telegram → Nhóm A (egress AI) = N/A, ghi rõ.
2. App CÓ kéo KPI từ BigQuery qua Metabase (src/lib/bigquery.ts). ĐÃ CHỐT: GIỮ luồng KPI (KHÔNG tắt kpi/sync).
   Hiện đọc cấu hình từ bảng `pe_pricing_config` (của price-engine) — bảng này KHÔNG có trong DB riêng OKR.
   HÃY REFACTOR đọc cấu hình Metabase từ ENV (METABASE_URL/METABASE_API_KEY) thay vì DB, để cắt phụ thuộc chéo.
   Cho server egress tới Metabase và khai Nhóm A là "residual có chủ đích" (chặn mọi egress khác + log).
3. App CÓ ~8 job nền (đang chạy bằng n8n) — PHẢI dựng service `worker` (in-repo, node-cron) thay n8n, gọi các
   route nội bộ kèm header x-sync-key=«SYNC_KEY»: kpi/sync (7-22h), reminders/checkin (8h), reminders/tasks
   ?kind=daily (8h) & ?kind=weekly (T2 7:30), digest/daily (8h T2-T7), digest/weekly (T2 7:30),
   task-changes/dispatch (*/30 5-22h), audit/prune (hằng ngày), admin/checkpoint (5:30). GỠ BỎ mọi n8n.
4. PII nặng + OAuth token → Nhóm B DSAR: bổ sung tính năng xem/xoá/ẩn danh dữ liệu 1 người (user + bình luận +
   nhật ký actor + google tokens). Backup mã hoá age + retention.
5. Code OKR đang trong repo `decks` (thư mục okr-portal/, chung với decks + mcp-server). Để squash sạch + repo
   private: TÁCH OKR ra repo riêng trước, rồi orphan-squash. Đưa lệnh cho tôi tự chạy phần force-push.
6. Email dùng SMTP trực tiếp (nodemailer, đã có) — BỎ N8N_MAIL_WEBHOOK. Bỏ việc publish deck giới thiệu.
7. AUTH_URL bắt buộc set = domain (nếu thiếu Auth.js nhảy 0.0.0.0). Giữ next.config experimental
   serverComponentsExternalPackages:['nodemailer'].

RÀNG BUỘC BẮT BUỘC
1. KHÔNG thay đổi gì trên VPS cá nhân cũ — chỉ đọc để lấy dump.
2. Chỉ thao tác trên server công ty. Chạm server ngoài/cá nhân → HỎI & chờ tôi xác nhận.
3. Lưu SOP/secret/khoá age vào MỘT tài liệu Outline RIÊNG cho OKR.
4. Không secret vào code/log/commit. Auto-deploy KIỂU KÉO (cron */5 trên server), KHÔNG mở SSH cho CI.

CÁCH LÀM VIỆC (ghi nhớ suốt phiên)
- Làm TUẦN TỰ; xong việc đang làm mới sang việc mới.
- Sau mỗi mốc lớn: DỪNG checkpoint, tóm tắt kết quả + rủi ro để tôi QC.
- Self-audit/QC/fix NHIỀU VÒNG tới khi vòng sau KHỚP vòng trước (hội tụ).
- Thao tác phá huỷ (force-push, xoá dữ liệu, đổi DNS) → đưa lệnh sẵn cho tôi tự chạy.

KIẾN TRÚC MỤC TIÊU
- Docker Compose: caddy (80/443, Let's Encrypt auto-renew) + app + worker + postgres (internal, không ra
  internet). Chỉ Caddy publish cổng.
- Postgres least-privilege: user app KHÔNG super/createdb/createrole; GRANT theo bảng; GRANT DELETE
  okr_audit_log (retention). (Không cần pe_pricing_config sau khi refactor Metabase sang ENV.)
- Auto-deploy KÉO: cron */5 chạy deploy.sh --if-changed (git reset --hard origin/main → build → migrate
  (db/*.sql ≥320 idempotent) → healthcheck → audit log); deploy key GitHub read-only. Actions chỉ CI.
- Backup: pg_dump → age → file 600 + retention + restore.sh + diễn tập khôi phục.

CÁC PHA (checkpoint giữa mỗi pha)
A. KHẢO SÁT app OKR: liệt kê dịch vụ ngoài (Metabase/BigQuery, SMTP, Google), secret đang dùng, PII lưu ở đâu,
   job nền, endpoint ghi DB. Báo cáo trước khi sửa.
B. ĐÓNG GÓI: docker-compose + Caddyfile + scripts (mượn BTMH MIS) + service worker; refactor Metabase→ENV;
   tham số hoá hằng số; tách secret ra .env; build sạch (npm run build).
C. HARDENING theo audit (khép từng nhóm, ghi N/A nếu không áp): Nhóm A = N/A; DB về VN + backup age +
   retention + DSAR; server-side/0 secret client; bỏ shadow-IT (n8n→worker); least-privilege DB; security
   headers; SSH key-only; không docker.sock/privileged.
D. TRIỂN KHAI: bootstrap server → deploy key → di trú (age: dump CHỈ okr_* [bỏ tokens] → mã hoá → 2 chặng qua
   laptop → giải mã + sha256 → shred) → gen-secrets → first-setup → QC qua hosts tạm (login + KPI + email +
   1 job worker) → (khi tôi duyệt) cắt DNS + Let's Encrypt.
E. LÀM SẠCH BÀN GIAO: xoá dấu vết cũ (n8n/Metabase-consultx/deck.consultx/domain consultx+vanthang.io/IP VPS)
   trong code+tài liệu+commit; gitleaks/trufflehog=0; TÁCH repo OKR riêng + orphan-squash (đưa lệnh force-push
   cho tôi); quét hội tụ repo + runtime bundle = 0.

ĐẦU RA MỖI PHA: đã làm gì, verify bằng lệnh gì, kết quả, rủi ro còn lại. Cập nhật Outline OKR.
Bắt đầu PHA A và HỎI tôi thông tin còn thiếu («…») trước khi chạy lệnh chạm server.
```

---

*Ghi chú (chủ sở hữu): điền sẵn `«…»` (IP server, key, domain, IP VPS cũ, SYNC_KEY, METABASE_URL/METABASE_API_KEY)
hoặc để team tự hỏi IT. Luồng KPI BigQuery: ĐÃ CHỐT GIỮ (27/09) — chat mới không cần hỏi lại.*
