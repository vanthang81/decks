# okr-portal — Hệ thống OKR/KPI/Action plan/Ngân sách BTMH · Ngữ cảnh cho Claude

App điều hành OKR nội bộ của **Bảo Tín Mạnh Hải (BTMH)**. Chủ dự án: **Thắng Nguyễn (CFO)**.
Phân quyền theo cây tổ chức **CEO/CFO → Giám đốc khối → Trưởng phòng → Nhân viên**, đăng nhập Google.
Dự kiến live tại `okr.consultx.vn`.

## Vị trí & lý do
- App Next.js **độc lập, self-contained** trong thư mục `okr-portal/` của repo `decks` (KHÔNG tạo
  được repo riêng do integration bị chặn quyền tạo repo). Có `package.json` / `Dockerfile` / DB schema
  RIÊNG. **Đã loại khỏi build của decks**: `decks/tsconfig.json` exclude + `decks/.dockerignore` (giống
  cách `mcp-server` bị loại). ĐỪNG bỏ exclude — glob `**/*.ts` của decks sẽ kéo `okr-portal/src` vào
  typecheck app decks → lỗi path alias/deps. Khi có repo riêng thì `git mv` sang là xong.

## Stack & quy ước
- **Next.js 14 (App Router, standalone)** + TypeScript, **Auth.js v5** (Google OAuth, 2 tầng
  `src/auth.config.ts` edge + `src/auth.ts` node — giống decks/price-engine), **node-postgres** (không
  ORM), **CSS thường** (`globals.css`, theme indigo `#4338ca`). Không Tailwind, không jose (chỉ dùng
  phiên Auth.js JWT). Typecheck: `npm run build` hoặc `npm run typecheck` (cd okr-portal).
- **Postgres `btmh_data` DÙNG CHUNG** với price-engine/decks, prefix bảng `okr_`. App runtime = user
  `btmh_app` (đã GRANT). DDL bằng superuser postgres. Đọc `pe_*` / `pe_cf_budget` để tự kéo KPI actual.
- Viết code/comment tiếng Việt theo phong cách hiện có.

## Mô hình dữ liệu (db/001_okr_core.sql — idempotent)
- `okr_units`: cây tổ chức company→division→department (đệ quy `parent_id`).
- `okr_users`: allowlist Google email + `role` (exec/division_lead/dept_lead/staff) + `unit_id`.
- `okr_periods`: kỳ quý/năm, `is_current` (chỉ 1 kỳ hiện tại — partial unique index).
- `okr_objectives`: Objective, `level`, `unit_id`/`owner_email`, `parent_id` (alignment/cascade),
  `progress` (cache roll-up).
- `okr_key_results`: KR (start→current→target, `direction`, `metric_type`, `weight`, `kpi_source`, `progress`).
- `okr_initiatives`: kế hoạch hành động gắn KR/Objective + `budget_planned`/`budget_actual`/`budget_source`.
- `okr_checkins`: cập nhật tiến độ + `confidence`. `okr_audit_log`: nhật ký.

## Logic quan trọng (src/lib/)
- `okr.ts`: `computeKrProgress` (theo hướng tăng/giảm, clamp 0..100), `recomputeUp` (lan tiến độ
  KR→Objective→cha, bình quân theo weight; không KR thì bình quân con). `canManageObjective`/`canCreateAt`.
- `rbac.ts` + `org.ts`: vai trò + `manageScope` (subtree đơn vị của lead). `subtreeIds`/`ancestorIds`/`buildTree`.
- `kpi.ts`: registry `KPI_SOURCES` (key→fetch từ Postgres, best-effort try/catch) + `syncKpiSources()`.
  Thêm nguồn KPI mới ⇒ thêm entry vào `KPI_SOURCES`. BigQuery (doanh thu/lãi gộp) nối qua API
  price-engine ở phase sau (chưa làm).
- `initiatives.ts`: `budgetSummaryForObjective` gộp ngân sách theo Objective (gồm KR con).
- Quyền ĐỌC minh bạch (mọi user xem hết OKR); quyền SỬA giới hạn theo `canManageObjective`.
  Admin hệ thống (users/org/periods) chỉ `exec` (`canAdmin`), guard không xoá exec cuối/chính mình.

## Trang (src/app/)
- `/` dashboard (tiến độ công ty + OKR công ty/khối) · `/objectives` cây OKR toàn kỳ + tạo mới ·
  `/objectives/[id]` chi tiết (KR + check-in + initiatives + ngân sách + OKR con + lịch sử) ·
  `/my` OKR & việc của tôi · `/admin` + `/admin/{users,org,periods}` (chỉ exec) · `/login` Google.
- Server Actions ở `src/app/objectives/actions.ts` + `src/app/admin/actions.ts` (đều `requireUser`/
  `requireExec` + kiểm quyền trước khi ghi).

## Deploy (ĐÃ LIVE 31/07/2026 — https://okr.consultx.vn)
- VPS `45.77.247.185`, biên host nginx + certbot (giống deck/price/ideas). Container Docker
  **`okr-portal`** (Dockerfile standalone, build context = thư mục `okr-portal/`), port 3000→host
  **`127.0.0.1:8640`** (8630 đã bị `ideas-portal` chiếm), `--restart unless-stopped`,
  `--add-host=host.docker.internal:host-gateway` để tới DB `:5435`.
- **Nguồn trên VPS = git worktree** `/home/thang/okr-portal-src` (checkout nhánh
  `claude/okr-kpi-tracking-system-ugv41q` của repo decks, worktree từ `/home/thang/decks-portal`).
  `.env` ngoài git (DATABASE_URL lấy từ decks `.env` = btmh_app/btmh_data; GOOGLE_*, AUTH_SECRET tự sinh,
  AUTH_URL=https://okr.consultx.vn).
- nginx vhost `/etc/nginx/sites-available/okr.consultx.vn.conf` → `127.0.0.1:8640`, cert Let's Encrypt
  `okr.consultx.vn` (certbot --nginx). Google OAuth redirect URI đã whitelist:
  `https://okr.consultx.vn/api/auth/callback/google`.
- **Deploy/redeploy = chạy tay workflow n8n "OKR Deploy — manual (SSH VPS)" (id `S2sxTDJOSjQ3Yd39`)**:
  node SSH (cred "SSH - VPS deploy") — fetch nhánh + `git reset --hard` worktree + `docker build` +
  chạy lại container + migrate (idempotent). Đổi command của node cho từng bước (build vs nginx). Thao
  tác root (nginx/certbot) qua container privileged: `docker run --rm --privileged --pid=host
  --network host -v /:/host nginx:latest ...` (BẮT BUỘC `--pid=host` để `nginx -s reload` gửi được tín hiệu).
- Migration đã chạy: `db/001_okr_core.sql` + `002_grants.sql` + `010_seed_example.sql` bằng superuser
  (`docker exec wg8owogscc4ogog8ccgw0ok8 psql -U postgres -d btmh_data`). Seed exec = `vanthang81@gmail.com`.

## Nguyên tắc làm việc với CFO
Tự động làm hết, tự tra mọi nguồn, tự review kỹ vài vòng; xong & chắc mới báo. Chỉ hỏi khi cần
quyết định nghiệp vụ/bí mật/quyền mà không tự vượt được.
