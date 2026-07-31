-- ============================================================================
-- Cây tổ chức THẬT của BTMH (theo sơ đồ CCTC cấp công ty) — thay data mẫu.
-- 13 Khối (division) + các Phòng (department). Idempotent (ON CONFLICT code).
-- Chạy bằng superuser postgres trên btmh_data.
-- ============================================================================
BEGIN;

-- Bỏ khối mẫu "Khối Kinh doanh" (code KD) + phòng con (cascade). Các code TC/VH
-- trùng với khối thật sẽ được upsert đổi tên bên dưới.
DELETE FROM okr_units WHERE code = 'KD';

-- Đảm bảo có node công ty gốc.
INSERT INTO okr_units (name, code, type, sort)
VALUES ('Bảo Tín Mạnh Hải', 'BTMH', 'company', 0)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, type = 'company';

-- ---- 13 KHỐI (division) ----
INSERT INTO okr_units (name, code, type, parent_id, sort)
SELECT v.name, v.code, 'division', c.id, v.sort
FROM (VALUES
  ('Khối Kinh doanh Bán lẻ',                 'BL',  1),
  ('Khối Kinh doanh B2B & Phát triển đối tác','B2B', 2),
  ('Khối Quản lý Sản phẩm',                  'SP',  3),
  ('Khối Marketing',                         'MKT', 4),
  ('Khối Sản xuất',                          'SX',  5),
  ('Khối Cung ứng',                          'CU',  6),
  ('Khối Phát triển Hệ thống Điểm bán',      'DB',  7),
  ('Khối Công nghệ',                         'CN',  8),
  ('Khối Tài chính',                         'TC',  9),
  ('Khối Nhân sự',                           'NS',  10),
  ('Khối Đào tạo & Phát triển Văn hóa',      'DT',  11),
  ('Khối Dịch vụ Vận hành',                  'VH',  12),
  ('Khối Pháp chế & Kiểm soát Tuân thủ',     'PC',  13)
) AS v(name, code, sort)
CROSS JOIN (SELECT id FROM okr_units WHERE code = 'BTMH') c
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name, type = 'division',
      parent_id = EXCLUDED.parent_id, sort = EXCLUDED.sort;

-- ---- Các PHÒNG (department), gắn theo mã khối cha ----
INSERT INTO okr_units (name, code, type, parent_id, sort)
SELECT d.name, d.code, 'department', p.id, d.sort
FROM (VALUES
  -- Khối Kinh doanh Bán lẻ
  ('Quản lý khu vực - ASM',              'BL-ASM',   'BL',  1),
  ('Cửa hàng',                           'BL-CH',    'BL',  2),
  -- Khối KD B2B & Phát triển đối tác
  ('Phòng Kinh doanh bán buôn',          'B2B-BB',   'B2B', 1),
  ('Phòng Phát triển đối tác và nhượng quyền','B2B-DT','B2B', 2),
  -- Khối Quản lý Sản phẩm
  ('Phòng Phát triển sản phẩm',          'SP-PTSP',  'SP',  1),
  ('Phòng Kế hoạch sản phẩm',            'SP-KHSP',  'SP',  2),
  ('Phòng Quản lý danh mục SP',          'SP-DMSP',  'SP',  3),
  -- Khối Marketing
  ('Phòng Thương hiệu và Truyền thông',  'MKT-TH',   'MKT', 1),
  ('Phòng Trade Marketing',              'MKT-TRADE','MKT', 2),
  ('Phòng Thiết kế và Sáng tạo nội dung','MKT-TK',   'MKT', 3),
  ('Phòng Trải nghiệm khách hàng',       'MKT-CX',   'MKT', 4),
  ('Phòng Growth Marketing',             'MKT-GROWTH','MKT',5),
  ('Phòng Thương mại điện tử',           'MKT-ECOM', 'MKT', 6),
  -- Khối Sản xuất
  ('Xưởng 1',                            'SX-X1',    'SX',  1),
  -- Khối Cung ứng
  ('Phòng Mua hàng tích lũy',            'CU-MHTL',  'CU',  1),
  ('Phòng Mua hàng trang sức',           'CU-MHTS',  'CU',  2),
  ('Phòng Logistic',                     'CU-LOG',   'CU',  3),
  ('Phòng Quản lý chất lượng',           'CU-QC',    'CU',  4),
  ('Phòng Phát triển nguồn cung',        'CU-NC',    'CU',  5),
  -- Khối Phát triển Hệ thống Điểm bán
  ('Phòng Phát triển điểm bán',          'DB-PT',    'DB',  1),
  ('Phòng Setup & Bảo trì',              'DB-SETUP', 'DB',  2),
  -- Khối Công nghệ
  ('Phòng Triển khai giải pháp',         'CN-GP',    'CN',  1),
  ('Phòng Vận hành CNTT',                'CN-VH',    'CN',  2),
  ('Phòng Dữ liệu và AI',                'CN-DATA',  'CN',  3),
  -- Khối Tài chính
  ('Phòng Tài chính',                    'TC-TC',    'TC',  1),
  ('Phòng Kế toán',                      'TC-KT',    'TC',  2),
  ('Phòng Kế hoạch & QLDA',              'TC-KH',    'TC',  3),
  -- Khối Nhân sự
  ('Phòng Đối tác nhân sự',              'NS-DT',    'NS',  1),
  ('Phòng Tuyển dụng',                   'NS-TD',    'NS',  2),
  ('Phòng C&B và Dịch vụ nhân sự',       'NS-CB',    'NS',  3),
  -- Khối Đào tạo & Phát triển Văn hóa
  ('Phòng Đào tạo',                      'DT-DAOTAO','DT',  1),
  ('Phòng Phát triển văn hóa',           'DT-VH',    'DT',  2),
  -- Khối Dịch vụ Vận hành
  ('Phòng Hành chính Quản trị',          'VH-HC',    'VH',  1),
  ('Phòng Mua sắm nội bộ',               'VH-MS',    'VH',  2),
  -- Khối Pháp chế & Kiểm soát Tuân thủ
  ('Phòng Pháp chế',                     'PC-PC',    'PC',  1),
  ('Phòng Kiểm soát và tuân thủ',        'PC-KS',    'PC',  2)
) AS d(name, code, divcode, sort)
JOIN okr_units p ON p.code = d.divcode
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name, type = 'department',
      parent_id = EXCLUDED.parent_id, sort = EXCLUDED.sort;

-- Dọn phòng mẫu cũ nếu còn (đã cascade theo KD, nhưng chắc chắn):
DELETE FROM okr_units WHERE code IN ('KD-BL','KD-MKT');

-- Gán exec (CFO) về công ty gốc.
UPDATE okr_users SET unit_id = (SELECT id FROM okr_units WHERE code='BTMH')
WHERE lower(email) = 'vanthang81@gmail.com';

COMMIT;
