-- App OKR (btmh_app) cần ĐỌC config Metabase để query BigQuery (bigquery.ts).
-- pe_pricing_config thường đã GRANT SELECT cho btmh_app từ price-engine; grant lại cho chắc.
-- Chạy bằng superuser postgres.
BEGIN;
GRANT SELECT ON pe_pricing_config TO btmh_app;
COMMIT;
