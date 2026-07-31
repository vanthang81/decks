-- ============================================================================
-- #1 Loại OKR (cam kết/khát vọng/học hỏi) · #2 Nhãn KR (leading/lagging)
-- #4 Bảng cấu hình hệ thống (okr_settings) — cho nhắc check-in.
-- Idempotent. Chạy bằng superuser postgres.
-- ============================================================================
BEGIN;

ALTER TABLE okr_objectives
  ADD COLUMN IF NOT EXISTS okr_type text NOT NULL DEFAULT 'committed';
DO $$ BEGIN
  ALTER TABLE okr_objectives ADD CONSTRAINT okr_obj_type_ck
    CHECK (okr_type IN ('committed','aspirational','learning'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE okr_key_results
  ADD COLUMN IF NOT EXISTS indicator text NOT NULL DEFAULT 'lagging';
DO $$ BEGIN
  ALTER TABLE okr_key_results ADD CONSTRAINT okr_kr_indicator_ck
    CHECK (indicator IN ('leading','lagging'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS okr_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON okr_settings TO btmh_app;

COMMIT;
