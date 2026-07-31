-- 140: Seed một số DỰ ÁN thực tế (xuyên nhiều OKR) + gắn các task liên quan.
-- Dựa trên chiến lược BTMH 2026: IPO, mở rộng NSO, dịch chuyển 24K, chuyển đổi số, bán qua app NH.
-- Idempotent: chỉ tạo project nếu chưa có (theo code PRJ-0x); gắn task theo code (unique).
-- Chủ trì tạm để CFO (vanthang81@gmail.com); đơn vị chủ trì = khối dẫn dắt.

DO $$
DECLARE
  pid uuid := (SELECT id FROM okr_periods WHERE kind='year' AND name LIKE '%2026%' ORDER BY starts_on LIMIT 1);
BEGIN
  -- 1) IPO & Niêm yết 2027
  INSERT INTO okr_projects (code, period_id, name, description, owner_email, unit_id, status, start_on, due_on, created_by)
  SELECT 'PRJ-01', pid, 'Chuẩn bị IPO & Niêm yết 2027',
         'Dự án xuyên khối chuẩn bị nền tảng IPO (niêm yết Q1/2027): kiểm soát tài chính, quản trị dữ liệu/báo cáo, an ninh thông tin & pháp lý trọng điểm.',
         'vanthang81@gmail.com', (SELECT id FROM okr_units WHERE code='TC'),
         'active', DATE '2026-01-01', DATE '2027-03-31', 'seed_projects'
  WHERE NOT EXISTS (SELECT 1 FROM okr_projects WHERE code='PRJ-01');

  -- 2) Mở rộng mạng lưới 68 cửa hàng (NSO 2026)
  INSERT INTO okr_projects (code, period_id, name, description, owner_email, unit_id, status, start_on, due_on, created_by)
  SELECT 'PRJ-02', pid, 'Mở rộng mạng lưới 68 cửa hàng (NSO 2026)',
         'Mở mới 68 cửa hàng: phát triển điểm bán, thẩm định FS & hiệu quả đầu tư, pháp lý mặt bằng, hạ tầng CNTT điểm bán, checklist mở mới & điều phối hàng NSO.',
         'vanthang81@gmail.com', (SELECT id FROM okr_units WHERE code='DB'),
         'active', DATE '2026-01-01', DATE '2026-12-31', 'seed_projects'
  WHERE NOT EXISTS (SELECT 1 FROM okr_projects WHERE code='PRJ-02');

  -- 3) Dịch chuyển cơ cấu sang Trang sức 24K
  INSERT INTO okr_projects (code, period_id, name, description, owner_email, unit_id, status, start_on, due_on, created_by)
  SELECT 'PRJ-03', pid, 'Dịch chuyển cơ cấu sang Trang sức 24K',
         'Đẩy tỷ trọng Trang sức 24K: phát triển BST & thiết kế, nguồn cung NCC trang sức, sản xuất thử nghiệm, chiến dịch ra mắt & bán tại cửa hàng/Ecom.',
         'vanthang81@gmail.com', (SELECT id FROM okr_units WHERE code='SP'),
         'active', DATE '2026-01-01', DATE '2026-12-31', 'seed_projects'
  WHERE NOT EXISTS (SELECT 1 FROM okr_projects WHERE code='PRJ-03');

  -- 4) Chuyển đổi số — SAP/ERP & Nền tảng dữ liệu
  INSERT INTO okr_projects (code, period_id, name, description, owner_email, unit_id, status, start_on, due_on, created_by)
  SELECT 'PRJ-04', pid, 'Chuyển đổi số — SAP/ERP & Nền tảng dữ liệu',
         'Triển khai SAP/ERP & Odoo, app mobile bán hàng, chuẩn hóa dữ liệu & hệ thống dashboard điều hành xuyên khối.',
         'vanthang81@gmail.com', (SELECT id FROM okr_units WHERE code='CN'),
         'active', DATE '2026-01-01', DATE '2026-12-31', 'seed_projects'
  WHERE NOT EXISTS (SELECT 1 FROM okr_projects WHERE code='PRJ-04');

  -- 5) Bán vàng qua App Ngân hàng (BIDV & MB)
  INSERT INTO okr_projects (code, period_id, name, description, owner_email, unit_id, status, start_on, due_on, created_by)
  SELECT 'PRJ-05', pid, 'Bán vàng qua App Ngân hàng (BIDV & MB)',
         'Go-live bán vàng qua app BIDV & MB (mục tiêu 779 tỷ): phối hợp B2B & Công nghệ theo từng giai đoạn tích hợp.',
         'vanthang81@gmail.com', (SELECT id FROM okr_units WHERE code='B2B'),
         'active', DATE '2026-01-01', DATE '2026-08-31', 'seed_projects'
  WHERE NOT EXISTS (SELECT 1 FROM okr_projects WHERE code='PRJ-05');
END $$;

-- Gắn task vào dự án theo mã (mỗi task đúng 1 dự án).
UPDATE okr_initiatives SET project_id=(SELECT id FROM okr_projects WHERE code='PRJ-01'), updated_at=now()
 WHERE code IN ('PC-O2.H04','TC-O1.H05','TC-O1.H01','TC-KH-O1.H09','CN-O1.H07','CN-O2.H02','PC-O1.H05');

UPDATE okr_initiatives SET project_id=(SELECT id FROM okr_projects WHERE code='PRJ-02'), updated_at=now()
 WHERE code IN ('BL-O1.H11','DB-O1.H06','DB-O1.H03','DB-O1.H07','DB-O1.H09','TC-O1.H04','TC-O1.H03','CN-O2.H03','PC-O2.H01','VH-O1.H12','CU-O1.H06');

UPDATE okr_initiatives SET project_id=(SELECT id FROM okr_projects WHERE code='PRJ-03'), updated_at=now()
 WHERE code IN ('BL-O1.H10','MKT-O1.H01','MKT-O2.H01','SP-O1.H04','SP-O1.H05','SP-O1.H06','CU-O1.H05','SX-O1.H08');

UPDATE okr_initiatives SET project_id=(SELECT id FROM okr_projects WHERE code='PRJ-04'), updated_at=now()
 WHERE code IN ('CN-O1.H01','CN-O1.H02','CN-O1.H06','TC-KH-O1.H06','TC-KH-O1.H08','BL-O1.H15','BL-O1.H14','CU-O1.H03','SX-O1.H10');

UPDATE okr_initiatives SET project_id=(SELECT id FROM okr_projects WHERE code='PRJ-05'), updated_at=now()
 WHERE code IN ('B2B-O1.H16','B2B-O1.H05','B2B-O1.H04','CN-O1.H03','CN-O1.H04','CN-O1.H05');
