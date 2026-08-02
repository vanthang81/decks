-- 300_strategy_national_gold.sql — Cập nhật Tầm nhìn/Sứ mệnh (theo bộ nhận diện BTMH) +
-- Lộ trình chiến lược 2026–2030 (số cửa hàng LẤY THEO FM Project Imperial v52.1: 80·159·208·241·261,
-- KHÔNG dùng số trong slide truyền thông) + thêm Objective cấp Công ty đến 2030 "Thương hiệu vàng Quốc dân".
-- Idempotent. CEO/CFO có thể sửa lại ở trang Chiến lược / chi tiết OKR.

-- 1) Chiến lược công ty: Tầm nhìn · Sứ mệnh · Khát vọng · Giá trị · Lộ trình theo năm.
INSERT INTO okr_settings (key, value) VALUES ('company_strategy', $strat$
{
  "horizon": "2026–2030",
  "vision": "Trở thành \"Thương hiệu vàng Quốc dân\" có quy mô doanh thu lớn nhất Việt Nam, dẫn dắt thị trường vàng 24K.",
  "mission": "Gìn giữ và phát huy những giá trị trân bảo truyền đời của vàng và văn hoá Việt Nam, đem đến sự thịnh vượng, may mắn và nâng tầm sự tự tin & tự tôn của người Việt.",
  "ambition": "Trở thành \"Thương hiệu vàng Quốc dân — Sản phẩm quốc dân\" vào 2030: dẫn dắt thị phần vàng 24K toàn quốc, phục vụ ~6,5 triệu khách hàng, đạt giá trị vốn hoá ~2,2 tỷ USD. Theo Financial Model Project Imperial v52.1: mạng lưới ~261 cửa hàng, doanh thu thuần ~180.346 tỷ và lợi nhuận sau thuế ~5.015 tỷ vào 2030; IPO trên HOSE Q4/2026.",
  "values": [
    "Tín nhiệm trên hết — \"Giữ tín nhiệm hơn giữ vàng\"",
    "Quản trị chuẩn định chế — minh bạch, tuân thủ, công bố đầy đủ (sẵn sàng niêm yết)",
    "Nguồn cung có trách nhiệm — truy xuất nguồn gốc & liêm chính chuỗi cung",
    "Khách hàng là trọng tâm — cam kết mua lại, đồng hành qua nhiều thế hệ",
    "Dẫn dắt & đặt chuẩn cho ngành vàng Việt Nam",
    "Xuất sắc vận hành & đổi mới — dữ liệu, công nghệ, mạng lưới"
  ],
  "roadmap": [
    { "year": "2026", "market": "Top 1 thị phần Hà Nội", "customers": ">1 triệu khách hàng", "capitalization": "~500 triệu USD", "stores": "80 cửa hàng" },
    { "year": "2027", "market": "Top 1 Hà Nội · Top 2 TP.HCM", "customers": ">2 triệu khách hàng", "capitalization": "~1,2 tỷ USD", "stores": "159 cửa hàng" },
    { "year": "2028", "market": "Top 1 thị phần lớn nhất Việt Nam", "customers": ">3 triệu khách hàng", "capitalization": "~1,4 tỷ USD", "stores": "208 cửa hàng" },
    { "year": "2029", "market": "Top 1 thị phần lớn nhất Việt Nam", "customers": ">5 triệu khách hàng", "capitalization": "~1,7 tỷ USD", "stores": "241 cửa hàng" },
    { "year": "2030", "market": "Thương hiệu vàng Quốc dân · Sản phẩm quốc dân", "customers": "6,5 triệu khách hàng", "capitalization": "~2,2 tỷ USD", "stores": "261 cửa hàng" }
  ]
}
$strat$::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- 2) Objective cấp Công ty (kỳ chiến lược 2026–2030): "Thương hiệu vàng Quốc dân".
INSERT INTO okr_objectives (code, period_id, level, unit_id, owner_email, title, description, status, okr_type, bsc_perspective, created_by, sort)
VALUES (
  'CTY-O11',
  (SELECT id FROM okr_periods WHERE kind='multiyear' LIMIT 1),
  'company',
  (SELECT id FROM okr_units WHERE type='company' LIMIT 1),
  'vanthang81@gmail.com',
  'Thương hiệu vàng Quốc dân',
  'Đích 2030: trở thành "Thương hiệu vàng Quốc dân — Sản phẩm quốc dân", dẫn dắt thị phần vàng 24K toàn quốc. Lộ trình: 2026 Top 1 Hà Nội (>1tr KH, ~500tr USD) → 2027 Top 1 HN & Top 2 TP.HCM (>2tr KH, ~1,2 tỷ USD) → 2028 Top 1 toàn quốc (>3tr KH, ~1,4 tỷ USD) → 2029 (>5tr KH, ~1,7 tỷ USD) → 2030 (6,5tr KH, ~2,2 tỷ USD). Số cửa hàng theo FM v52.1: 80·159·208·241·261.',
  'active', 'aspirational', 'customer', 'seed_strategy', 11
)
ON CONFLICT (code) WHERE code IS NOT NULL DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, okr_type = EXCLUDED.okr_type,
  bsc_perspective = EXCLUDED.bsc_perspective, status = EXCLUDED.status, updated_at = now();

-- 3) Key Results cho CTY-O11 (kết quả then chốt 2030 — thương hiệu/khách hàng/vị thế/vốn hoá).
INSERT INTO okr_key_results
  (code, objective_id, title, metric_type, direction, unit_label, start_value, current_value, target_value, weight, indicator, progress, sort)
VALUES
  ('CTY-O11.KR1', (SELECT id FROM okr_objectives WHERE code='CTY-O11'),
     'Khách hàng lũy kế phục vụ (đến 2030)', 'number', 'increase', 'triệu khách hàng', 1, 1, 6.5, 1, 'lagging', 0, 1),
  ('CTY-O11.KR2', (SELECT id FROM okr_objectives WHERE code='CTY-O11'),
     'Giá trị vốn hoá (2030)', 'number', 'increase', 'tỷ USD', 0.5, 0.5, 2.2, 1, 'lagging', 0, 2),
  ('CTY-O11.KR3', (SELECT id FROM okr_objectives WHERE code='CTY-O11'),
     'Đạt Top 1 thị phần vàng 24K toàn quốc', 'boolean', 'increase', NULL, 0, 0, 1, 1, 'lagging', 0, 3),
  ('CTY-O11.KR4', (SELECT id FROM okr_objectives WHERE code='CTY-O11'),
     'Được công nhận "Thương hiệu vàng Quốc dân / Sản phẩm quốc dân"', 'boolean', 'increase', NULL, 0, 0, 1, 1, 'lagging', 0, 4)
ON CONFLICT (code) WHERE code IS NOT NULL DO UPDATE SET
  title = EXCLUDED.title, metric_type = EXCLUDED.metric_type, unit_label = EXCLUDED.unit_label,
  start_value = EXCLUDED.start_value, current_value = EXCLUDED.current_value,
  target_value = EXCLUDED.target_value, updated_at = now();
