-- ============================================================================
-- OKR Portal — Khung thời gian ĐA CẤP cho kỳ (period hierarchy)
-- 5 năm (multiyear 2026–2030) → Năm → Quý → Tháng. (Tuần/Ngày ở cấp công việc:
-- okr_initiatives.start_on/due_on + check-in tuần.)
-- Thêm parent_id (tự tham chiếu) + mở rộng kind. Idempotent. Chạy SUPERUSER postgres.
-- ============================================================================

BEGIN;

ALTER TABLE okr_periods
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES okr_periods(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS okr_periods_parent_idx ON okr_periods (parent_id);

-- Mở rộng kind: bỏ mọi CHECK cũ trên 'kind' rồi thêm CHECK mới (multiyear/year/quarter/month).
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'okr_periods'::regclass AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%kind%'
  LOOP
    EXECUTE 'ALTER TABLE okr_periods DROP CONSTRAINT ' || quote_ident(c);
  END LOOP;
  ALTER TABLE okr_periods
    ADD CONSTRAINT okr_periods_kind_ck
    CHECK (kind IN ('multiyear','year','quarter','month'));
END $$;

COMMIT;
