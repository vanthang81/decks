-- 370: Bổ sung "LAYER 2" dưới CTY-011 "Thương hiệu vàng Quốc dân":
--   Khách hàng · Cửa hàng · Doanh thu — 3 OKR con (parent_id=CTY-011), mỗi cái 1 KR mốc theo
--   Financial Model "Project Imperial v52.1" (2026). CFO có thể chỉnh mục tiêu năm sau khi tạo.
-- Idempotent: bỏ qua nếu đã có code CTY-012/013/014.
DO $$
DECLARE
  parent_id uuid; p_period uuid; p_unit uuid; p_owner text; oid uuid;
BEGIN
  SELECT id, period_id, unit_id, owner_email INTO parent_id, p_period, p_unit, p_owner
    FROM okr_objectives WHERE code = 'CTY-011' LIMIT 1;
  IF parent_id IS NULL THEN
    RAISE NOTICE 'CTY-011 not found — skip layer seed';
    RETURN;
  END IF;

  -- 1) Khách hàng
  IF NOT EXISTS (SELECT 1 FROM okr_objectives WHERE code = 'CTY-012') THEN
    INSERT INTO okr_objectives (code, period_id, parent_id, level, unit_id, owner_email, title, description, status)
    VALUES ('CTY-012', p_period, parent_id, 'company', p_unit, p_owner,
      'Mở rộng tệp khách hàng',
      'Tăng số lượng khách hàng — nền của "Thương hiệu vàng Quốc dân". Mốc 2030 ~6,5 triệu KH (FM); mục tiêu năm CFO chỉnh theo lộ trình.',
      'active')
    RETURNING id INTO oid;
    INSERT INTO okr_key_results (objective_id, code, title, metric_type, direction, unit_label, start_value, target_value, current_value)
    VALUES (oid, 'CTY-012.KR1', 'Số lượng khách hàng luỹ kế', 'number', 'increase', 'khách', 0, 1500000, 0);
  END IF;

  -- 2) Cửa hàng
  IF NOT EXISTS (SELECT 1 FROM okr_objectives WHERE code = 'CTY-013') THEN
    INSERT INTO okr_objectives (code, period_id, parent_id, level, unit_id, owner_email, title, description, status)
    VALUES ('CTY-013', p_period, parent_id, 'company', p_unit, p_owner,
      'Mở rộng mạng lưới cửa hàng',
      'Tăng số điểm bán (Total Cumulative). FM: 2026 = 80 cửa hàng → 2030 = 261.',
      'active')
    RETURNING id INTO oid;
    INSERT INTO okr_key_results (objective_id, code, title, metric_type, direction, unit_label, start_value, target_value, current_value)
    VALUES (oid, 'CTY-013.KR1', 'Số cửa hàng luỹ kế', 'number', 'increase', 'cửa hàng', 0, 80, 0);
  END IF;

  -- 3) Doanh thu
  IF NOT EXISTS (SELECT 1 FROM okr_objectives WHERE code = 'CTY-014') THEN
    INSERT INTO okr_objectives (code, period_id, parent_id, level, unit_id, owner_email, title, description, status)
    VALUES ('CTY-014', p_period, parent_id, 'company', p_unit, p_owner,
      'Tăng trưởng doanh thu',
      'Doanh thu thuần theo FM: 2025 ~27.891 tỷ → 2026 ~73.841 tỷ → 2030 ~180.346 tỷ.',
      'active')
    RETURNING id INTO oid;
    INSERT INTO okr_key_results (objective_id, code, title, metric_type, direction, unit_label, start_value, target_value, current_value)
    VALUES (oid, 'CTY-014.KR1', 'Doanh thu thuần cả năm', 'currency', 'increase', 'tỷ', 0, 73841, 0);
  END IF;
END $$;
