-- Seed mẫu để chạy thử (tùy chọn). Đổi email exec cho đúng.
BEGIN;

-- Công ty gốc
INSERT INTO okr_units (name, code, type, sort)
VALUES ('Bảo Tín Mạnh Hải', 'BTMH', 'company', 0)
ON CONFLICT (code) DO NOTHING;

-- Vài khối mẫu
INSERT INTO okr_units (name, code, type, parent_id, sort)
SELECT v.name, v.code, 'division', c.id, v.sort
FROM (VALUES
  ('Khối Kinh doanh', 'KD', 1),
  ('Khối Vận hành',   'VH', 2),
  ('Khối Tài chính',  'TC', 3)
) AS v(name, code, sort)
CROSS JOIN (SELECT id FROM okr_units WHERE code='BTMH') c
ON CONFLICT (code) DO NOTHING;

-- Phòng mẫu trong Khối Kinh doanh
INSERT INTO okr_units (name, code, type, parent_id, sort)
SELECT v.name, v.code, 'department', d.id, v.sort
FROM (VALUES
  ('Phòng Bán lẻ',       'KD-BL', 1),
  ('Phòng Marketing',    'KD-MKT', 2)
) AS v(name, code, sort)
CROSS JOIN (SELECT id FROM okr_units WHERE code='KD') d
ON CONFLICT (code) DO NOTHING;

-- Exec seed (CEO/CFO). ĐỔI email cho đúng.
INSERT INTO okr_users (email, display_name, title, role, unit_id)
SELECT 'vanthang81@gmail.com', 'Thắng Nguyễn', 'CFO', 'exec', c.id
FROM okr_units c WHERE c.code='BTMH'
ON CONFLICT (email) DO UPDATE SET role='exec';

-- Kỳ hiện tại mẫu
INSERT INTO okr_periods (name, kind, starts_on, ends_on, status, is_current)
VALUES ('Q3-2026', 'quarter', '2026-07-01', '2026-09-30', 'active', true)
ON CONFLICT (name) DO NOTHING;

COMMIT;
