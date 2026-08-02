-- 310_apex_cascade.sql — Cho 5 OKR cấp Công ty năm 2026 "liên kết lên" (cascade) OKR apex
-- "Thương hiệu vàng Quốc dân" (CTY-O11) → CTY-O11 trở thành BOX BAO TRÙM trên sơ đồ liên kết.
-- Idempotent. (Có thể đổi lại cấp trên bất cứ lúc nào ở sơ đồ flow / chi tiết OKR.)
UPDATE okr_objectives
   SET parent_id = (SELECT id FROM okr_objectives WHERE code = 'CTY-O11'),
       updated_at = now()
 WHERE level = 'company'
   AND code IN ('CTY-O10', 'CTY-O2', 'CTY-O3', 'CTY-O4', 'CTY-O5');
