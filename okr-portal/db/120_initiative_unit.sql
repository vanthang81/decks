-- 120: Gắn Dự án/Công việc (initiative) với Đơn vị phụ trách (Khối/Phòng).
-- Cho phép khai báo + liên kết dự án với khối/phòng ban (owner_email = cá nhân đã có sẵn).
-- Idempotent.

ALTER TABLE okr_initiatives
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES okr_units(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_okr_init_unit ON okr_initiatives(unit_id);
