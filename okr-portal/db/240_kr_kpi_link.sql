-- 240_kr_kpi_link.sql — Gắn KR với KPI thư viện (KR lấy số từ KPI, khỏi nhập trùng).
-- Idempotent. Chạy bằng superuser postgres. btmh_app đã có quyền cột trên okr_key_results.

ALTER TABLE okr_key_results ADD COLUMN IF NOT EXISTS kpi_id uuid REFERENCES okr_kpis(id) ON DELETE SET NULL;
