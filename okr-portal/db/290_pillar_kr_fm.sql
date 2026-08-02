-- 290_pillar_kr_fm.sql — Bổ sung/cập nhật KR trụ cột chiến lược theo FM Project Imperial v52.1.
-- Số mục tiêu 2030 (FM): mạng lưới 261 CH; doanh thu thuần 180.346 tỷ; LNST 5.015 tỷ;
-- tỷ trọng Trang sức 24K + quà tặng ≈ 18,5% doanh thu (jewelry24k 17.382 + gift 16.196 ÷ tổng 181.883).
-- Idempotent theo MÃ (unique). CEO/CFO có thể sửa lại ở trang chi tiết OKR.

-- 1) Thêm 3 KR kết quả 2030 vào trụ cột tăng trưởng CTY-O6 (Dẫn đầu bán lẻ — mở rộng mạng lưới).
INSERT INTO okr_key_results
  (code, objective_id, title, metric_type, direction, unit_label, start_value, current_value, target_value, weight, indicator, progress, sort)
VALUES
  ('CTY-O6.KR3', (SELECT id FROM okr_objectives WHERE code='CTY-O6'),
     'Tổng mạng lưới cửa hàng (đến 2030)', 'number', 'increase', 'cửa hàng', 10, 10, 261, 1, 'lagging', 0, 3),
  ('CTY-O6.KR4', (SELECT id FROM okr_objectives WHERE code='CTY-O6'),
     'Doanh thu thuần (2030)', 'number', 'increase', 'tỷ đồng', 27891, 27891, 180346, 1, 'lagging', 0, 4),
  ('CTY-O6.KR5', (SELECT id FROM okr_objectives WHERE code='CTY-O6'),
     'Lợi nhuận sau thuế (2030)', 'number', 'increase', 'tỷ đồng', 774, 774, 5015, 1, 'lagging', 0, 5)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title, metric_type = EXCLUDED.metric_type, unit_label = EXCLUDED.unit_label,
  start_value = EXCLUDED.start_value, current_value = EXCLUDED.current_value,
  target_value = EXCLUDED.target_value, updated_at = now();

-- 2) Cập nhật tỷ trọng Trang sức 24K + quà tặng theo mix FM 2030 (18,5%).
UPDATE okr_key_results SET target_value = 18.5, updated_at = now() WHERE code = 'CTY-O7.KR1';
