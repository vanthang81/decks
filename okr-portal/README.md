# BTMH OKR Portal

Hệ thống OKR + KPI + Kế hoạch hành động + Ngân sách cho **Bảo Tín Mạnh Hải**, phân quyền theo
cây tổ chức **CEO/CFO → Giám đốc khối → Trưởng phòng → Nhân viên**. Đăng nhập bằng Google.

App Next.js độc lập (self-contained), tái sử dụng pattern của `decks-portal` / `price-engine`:
Auth.js v5 (Google OAuth, 2 tầng edge/node), Postgres `btmh_data` (prefix `okr_`), không ORM,
CSS thường. Dùng CHUNG DB với price-engine để đọc `pe_*` / `pe_cf_budget` (tự kéo KPI actual).

> App đang "ở nhờ" thư mục `okr-portal/` trong repo `decks` (chưa tạo được repo riêng). Nó hoàn
> toàn tách biệt (package.json / Dockerfile / DB schema riêng, đã loại khỏi build của decks). Khi
> có repo riêng, chỉ cần `git mv okr-portal/* <repo-mới>/` là xong.

## Tính năng V1
- **OKR cascade + phân quyền**: cây tổ chức, đăng nhập Google, 4 vai trò, tạo/liên kết Objective–KR
  theo Công ty → Khối → Phòng ban → Cá nhân, check-in tiến độ hàng tuần, tự roll-up % lên cấp trên.
- **Kế hoạch hành động (Initiatives)**: việc cụ thể gắn vào KR/Objective (chủ trì, hạn, trạng thái, %).
- **Ngân sách gắn OKR**: ngân sách kế hoạch vs thực chi cho từng initiative, tổng hợp theo Objective.
- **Tự kéo KPI actual**: KR gắn `kpi_source` tự lấy số từ Postgres (`pe_cf_*`…) — registry `src/lib/kpi.ts`.

## Chạy local
```bash
cd okr-portal
cp .env.example .env   # điền GOOGLE_*, AUTH_SECRET, DATABASE_URL
npm install
npm run dev            # http://localhost:3010
```
Chạy migration DB: xem `db/README.md`.

## Cấu trúc
- `src/auth.*`, `src/middleware.ts` — Auth.js Google OAuth + gác toàn app.
- `src/lib/` — `db`, `rbac`, `users`, `org`, `periods`, `okr`, `initiatives`, `checkins`, `kpi`, `budget/format`.
- `src/app/` — `/` dashboard, `/objectives` cây OKR, `/objectives/[id]` chi tiết, `/my`, `/admin/*`.
- `db/` — schema SQL (idempotent) + seed mẫu.

Chi tiết kiến trúc & phân quyền: `docs/ARCHITECTURE.md`.

## Deploy (đề xuất)
Docker standalone giống decks/price-engine, subdomain `okr.consultx.vn`:
```bash
docker build -t okr-portal:latest okr-portal/
docker run -d --name okr-portal --restart unless-stopped \
  --add-host=host.docker.internal:host-gateway \
  -p 127.0.0.1:8630:3000 --env-file okr-portal/.env okr-portal:latest
```
Rồi thêm vhost nginx `okr.consultx.vn → 127.0.0.1:8630` + certbot. (Cần thao tác VPS.)
