-- 450: LỊCH SỬ CƠ CẤU TỔ CHỨC theo thời gian (effective-dated org).
-- Mỗi thay đổi đơn vị (đổi tên/mã/thứ tự/trực thuộc/ẩn-hiện, hoặc thêm mới) ghi 1 "phiên bản" kèm
-- NGÀY HIỆU LỰC. okr_units GIỮ ẢNH HIỆN TẠI (phiên bản hiệu lực ≤ hôm nay mới nhất) → mọi truy vấn
-- hiện có KHÔNG đổi. Xem "cơ cấu tại thời điểm X" = lấy phiên bản hiệu lực ≤ X mới nhất cho từng đơn vị.
-- type (company/division/department) KHÔNG đổi theo thời gian nên giữ ở okr_units.

CREATE TABLE IF NOT EXISTS okr_unit_versions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id        uuid NOT NULL REFERENCES okr_units(id) ON DELETE CASCADE,
  effective_from date NOT NULL,
  name           text NOT NULL,
  code           text,
  parent_id      uuid,            -- tham chiếu LOGIC (đơn vị cha có thể đã đổi ở kỳ khác) → không FK cứng
  sort           int  NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  note           text,
  created_by     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS okr_unit_versions_unit_idx ON okr_unit_versions (unit_id, effective_from DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON okr_unit_versions TO btmh_app;

-- Seed: 1 phiên bản khởi tạo cho mỗi đơn vị hiện có (hiệu lực từ 01/01/2026 = đầu kỳ chiến lược).
INSERT INTO okr_unit_versions (unit_id, effective_from, name, code, parent_id, sort, is_active, note, created_by)
SELECT id, DATE '2026-01-01', name, code, parent_id, sort, is_active, 'seed cơ cấu ban đầu', 'system'
  FROM okr_units u
 WHERE NOT EXISTS (SELECT 1 FROM okr_unit_versions v WHERE v.unit_id = u.id);
