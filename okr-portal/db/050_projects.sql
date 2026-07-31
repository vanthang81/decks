-- ============================================================================
-- OKR Portal — Quản trị dự án gắn OKR (Đợt 1: phân cấp Dự án → Tiểu dự án → Công việc)
-- Tái dùng bảng okr_initiatives (đã có status/owner/dates/budget/progress) + thêm:
--   - parent_id : tự tham chiếu → cây phân cấp
--   - kind      : 'project' (dự án) | 'subproject' (tiểu dự án) | 'action' (công việc/hành động)
-- An toàn chạy lại (idempotent). Chạy bằng SUPERUSER postgres.
-- ============================================================================

BEGIN;

ALTER TABLE okr_initiatives
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES okr_initiatives(id) ON DELETE CASCADE;

ALTER TABLE okr_initiatives
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'action';

-- CHECK cho kind (thêm rời để idempotent — bỏ qua nếu đã có).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'okr_init_kind_ck'
  ) THEN
    ALTER TABLE okr_initiatives
      ADD CONSTRAINT okr_init_kind_ck CHECK (kind IN ('project','subproject','action'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS okr_init_parent_idx ON okr_initiatives (parent_id);

-- btmh_app đã có quyền DML trên okr_initiatives (GRANT ở 002) — cột mới kế thừa, không cần GRANT lại.

COMMIT;
