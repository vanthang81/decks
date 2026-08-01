-- 210_bsc_perspective.sql — Viễn cảnh BSC (Balanced Scorecard) trên Objective.
-- Idempotent. Chạy bằng superuser postgres (docker exec). App user btmh_app đã có quyền cột.
-- 4 viễn cảnh: financial (Tài chính) · customer (Khách hàng) · process (Quy trình nội bộ) · learning (Học hỏi & Phát triển).

ALTER TABLE okr_objectives ADD COLUMN IF NOT EXISTS bsc_perspective text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'okr_objectives' AND constraint_name = 'okr_objectives_bsc_perspective_chk'
  ) THEN
    ALTER TABLE okr_objectives
      ADD CONSTRAINT okr_objectives_bsc_perspective_chk
      CHECK (bsc_perspective IS NULL OR bsc_perspective IN ('financial','customer','process','learning'));
  END IF;
END $$;
