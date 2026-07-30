-- GRANT quyền runtime cho user app btmh_app trên các bảng okr_*.
-- Chạy bằng superuser postgres SAU khi chạy 001_okr_core.sql.

BEGIN;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  okr_units, okr_users, okr_periods, okr_objectives,
  okr_key_results, okr_initiatives, okr_checkins, okr_audit_log
TO btmh_app;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO btmh_app;

-- App CHỈ ĐỌC dữ liệu tài chính/kpi có sẵn (không ghi).
-- (pe_cf_budget, pe_* thường đã GRANT SELECT cho btmh_app từ price-engine.)
-- GRANT SELECT ON pe_cf_budget TO btmh_app;

COMMIT;
