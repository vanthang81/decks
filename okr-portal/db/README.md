# DB — OKR Portal

DB dùng chung `btmh_data` (cùng Postgres với price-engine/decks), prefix bảng `okr_`.

## Chạy migration
DDL cần **superuser** (`btmh_app` không có quyền tạo bảng). Chạy lần lượt:

```bash
# qua docker exec vào container postgres (superuser), hoặc cred "Postgres Admin BTMH" trên n8n
psql -U postgres -d btmh_data -f db/001_okr_core.sql
psql -U postgres -d btmh_data -f db/002_grants.sql
psql -U postgres -d btmh_data -f db/010_seed_example.sql   # tùy chọn, đổi email exec
```

Tất cả idempotent (chạy lại an toàn).

## Quyền đọc dữ liệu KPI/ngân sách
App đọc `pe_*` / `pe_cf_budget` để tự kéo actual. Các bảng này thường đã
`GRANT SELECT` cho `btmh_app` từ price-engine. Nếu chưa, chạy thêm:

```sql
GRANT SELECT ON pe_cf_budget TO btmh_app;
```
