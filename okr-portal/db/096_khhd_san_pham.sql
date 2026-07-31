-- KHHĐ 2026 Khối QUẢN LÝ SẢN PHẨM (6 KPI + 20 HĐ; PIC Trang/Đức/Jady). created_by='seed_khhd_SP'
BEGIN;
DO $$
DECLARE y26 uuid; sp uuid; own text; parent uuid; obj uuid;
  o_trang text; o_duc text; o_jady text;
BEGIN
  SELECT id INTO y26 FROM okr_periods WHERE name='Năm 2026';
  SELECT id INTO sp FROM okr_units WHERE code='SP';
  SELECT id INTO parent FROM okr_objectives WHERE title='2026: Chủ động dịch chuyển cơ cấu sang Trang sức 24K' AND created_by='seed_strategy' LIMIT 1;
  own := (SELECT email FROM okr_users WHERE email='chanhoiyeevicky@baotinmanhhai.vn');
  o_trang := (SELECT email FROM okr_users WHERE email='dinhkimtrang@baotinmanhhai.vn');
  o_duc := (SELECT email FROM okr_users WHERE email='nguyenminhduc@baotinmanhhai.vn');
  o_jady := (SELECT email FROM okr_users WHERE email='jadycheung@baotinmanhhai.vn');
  DELETE FROM okr_objectives WHERE created_by='seed_khhd_SP';

  INSERT INTO okr_objectives(period_id,parent_id,level,unit_id,owner_email,title,description,status,okr_type,created_by)
    VALUES(y26,parent,'division',sp,own,
      '2026 — Khối Quản lý Sản phẩm: Kế hoạch SP, danh mục & phát triển sản phẩm',
      'Xây dựng & giám sát Kế hoạch Sản phẩm 2026 (align Commercial/Marketing/Supply Chain), chuẩn hóa Product Master & danh mục theo kênh, tối ưu SKU chậm, phát triển concept/2D/3D sản phẩm mới.',
      'active','committed','seed_khhd_SP') RETURNING id INTO obj;

  INSERT INTO okr_key_results(objective_id,title,metric_type,direction,unit_label,start_value,target_value,current_value,indicator) VALUES
    (obj,'M-01: Đạt chỉ tiêu doanh thu/đầu ra sản phẩm của khối','boolean','increase',NULL,0,1,0,'lagging'),
    (obj,'M-02: Chi phí thực tế trong kế hoạch (tối ưu SKU chậm <15% tồn kho)','boolean','increase',NULL,0,1,0,'lagging'),
    (obj,'M-03: Chất lượng dịch vụ & trải nghiệm khách hàng (CSAT/SLA)','boolean','increase',NULL,0,1,0,'lagging'),
    (obj,'M-04: Tuân thủ quy trình/SLA','boolean','increase',NULL,0,1,0,'leading'),
    (obj,'M-05: Đội ngũ đạt chuẩn năng lực','boolean','increase',NULL,0,1,0,'leading'),
    (obj,'M-06: Số hóa/tự động hóa quản lý sản phẩm','boolean','increase',NULL,0,1,0,'leading');

  INSERT INTO okr_initiatives(objective_id,kind,title,description,owner_email,status,priority,start_on,due_on,created_by) VALUES
    -- Phòng Kế hoạch sản phẩm (PIC Trang)
    (obj,'project','H-01: Xây dựng Kế hoạch Sản phẩm 2026 (thống nhất nội bộ Merchandise)','KPI M-01. Build 2026 Product Plan. Tỷ trọng 5%.',o_trang,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_SP'),
    (obj,'project','H-02: Align Kế hoạch SP 2026 với Commercial/Marketing/Supply Chain','KPI M-01. Tỷ trọng 2%.',o_trang,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_SP'),
    (obj,'project','H-03: Cập nhật/điều chỉnh Kế hoạch SP theo chiến lược & thị trường','KPI M-01. Tỷ trọng 2%.',o_trang,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_SP'),
    (obj,'project','H-04: Theo dõi (monitor) Kế hoạch Sản phẩm 2026','KPI M-01. Tỷ trọng 3%.',o_trang,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_SP'),
    (obj,'project','H-05: Cung cấp product brief cho Marketing/Commercial/Training trước ra mắt','KPI M-01. Tỷ trọng 5%.',o_trang,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_SP'),
    (obj,'project','H-06: Review định kỳ với Commercial/Marketing/Supply Chain','KPI M-01. Tỷ trọng 2%.',o_trang,'in_progress','low','2026-01-01','2026-12-31','seed_khhd_SP'),
    (obj,'project','H-07: Khảo sát trải nghiệm KH & đánh giá BST mới — gửi khảo sát','KPI M-01. Báo cáo trải nghiệm theo quý. Tỷ trọng 2%.',o_trang,'in_progress','low','2026-01-01','2026-12-31','seed_khhd_SP'),
    (obj,'project','H-08: Phân tích dữ liệu trải nghiệm khách hàng','KPI M-01. Tỷ trọng 2%.',o_trang,'in_progress','low','2026-01-01','2026-12-31','seed_khhd_SP'),
    (obj,'project','H-09: Báo cáo trải nghiệm KH & đánh giá BST','KPI M-01. Tỷ trọng 2%.',o_trang,'in_progress','low','2026-01-01','2026-12-31','seed_khhd_SP'),
    (obj,'project','H-10: Product zoning sơ bộ cửa hàng mới (nội bộ ≤5 ngày)','KPI M-01. Tỷ trọng 2%.',o_trang,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_SP'),
    (obj,'project','H-11: Thống nhất product zoning với Thương mại (≤7 ngày)','KPI M-01. Tỷ trọng 2%.',o_trang,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_SP'),
    (obj,'project','H-12: Ban hành product zoning & thông báo các phòng','KPI M-01. Tỷ trọng 1%.',o_trang,'in_progress','low','2026-01-01','2026-12-31','seed_khhd_SP'),
    -- Phòng Quản lý Danh mục SP (PIC Đức)
    (obj,'project','H-13: Xây Product Master + bộ KPI hiệu suất (100% SKU chuẩn hóa)','KPI M-01. Tỷ trọng 10%.',o_duc,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_SP'),
    (obj,'project','H-14: Theo dõi hiệu suất sản phẩm (báo cáo trước ngày 25 hàng tháng)','KPI M-01. Tỷ trọng 5%.',o_duc,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_SP'),
    (obj,'project','H-15: Theo dõi thường xuyên mặt hàng bán chậm','KPI M-02. Tỷ trọng 5%.',o_duc,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_SP'),
    (obj,'project','H-16: Rút lọc SKU không hiệu quả (SKU chậm <15% tồn kho)','KPI M-02. Tỷ trọng 5%.',o_duc,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_SP'),
    (obj,'project','H-17: Xây danh mục SP (assortment) theo kênh bán (100% SKU phân bổ)','KPI M-01. Tỷ trọng 15%.',o_duc,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_SP'),
    -- Phòng Phát triển sản phẩm (PIC Jady)
    (obj,'project','H-18: Phát triển concept thiết kế & được phê duyệt','KPI M-01. Theo Kế hoạch SP 2026. Tỷ trọng 10%.',o_jady,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_SP'),
    (obj,'project','H-19: Thiết kế 2D chi tiết theo concept đã duyệt','KPI M-01. Tỷ trọng 10%.',o_jady,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_SP'),
    (obj,'project','H-20: File sản xuất 3D theo thiết kế đã phê duyệt','KPI M-01. Tỷ trọng 10%.',o_jady,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_SP');
END $$;
COMMIT;
