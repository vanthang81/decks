-- KHHĐ 2026 Khối CUNG ỨNG (10 KPI M-xx + 10 hành động H-xx, PIC Mr Quốc). created_by='seed_khhd_CU'
BEGIN;
DO $$
DECLARE y26 uuid; cu uuid; own text; parent uuid; obj uuid;
BEGIN
  SELECT id INTO y26 FROM okr_periods WHERE name='Năm 2026';
  SELECT id INTO cu FROM okr_units WHERE code='CU';
  SELECT id INTO parent FROM okr_objectives WHERE title='2026: Hoàn thành Kế hoạch Kinh doanh (ĐHCĐ)' AND created_by='seed_strategy' LIMIT 1;
  own := (SELECT email FROM okr_users WHERE email='trancuuquoc@baotinmanhhai.vn');
  DELETE FROM okr_objectives WHERE created_by='seed_khhd_CU';

  INSERT INTO okr_objectives(period_id,parent_id,level,unit_id,owner_email,title,description,status,okr_type,created_by)
    VALUES(y26,parent,'division',cu,own,
      '2026 — Khối Cung ứng: Chất lượng, luân chuyển & nguồn cung tối ưu',
      'Giảm lỗi sau KCS <1%, tối ưu luân chuyển tồn kho (DIO), an toàn giao vận (DIFOT>80%), đảm bảo cung ứng >95% dự báo bán & khai trương NSO, mở rộng NCC và số hóa quy trình.',
      'active','committed','seed_khhd_CU') RETURNING id INTO obj;

  INSERT INTO okr_key_results(objective_id,title,metric_type,direction,unit_label,start_value,target_value,current_value,indicator) VALUES
    (obj,'M-01: Sản phẩm lỗi sau KCS < 1%','percent','decrease','%',5,1,5,'lagging'),
    (obj,'M-02: DIO trong ngưỡng (<150% DIO target mỗi ngành)','boolean','increase',NULL,0,1,0,'lagging'),
    (obj,'M-03: DIFOT giao vận > 80%','percent','increase','%',0,80,0,'lagging'),
    (obj,'M-04: Cung ứng > 95% dự báo bán (VHKD)','percent','increase','%',0,95,0,'lagging'),
    (obj,'M-05: Cung ứng > 95% nhu cầu khai trương NSO','percent','increase','%',0,95,0,'lagging'),
    (obj,'M-06: Ký mới ≥ 5 NCC trang sức','number','increase','NCC',0,5,0,'lagging'),
    (obj,'M-07: Ký mới ≥ 4 NCC nguyên liệu vàng/bạc','number','increase','NCC',0,4,0,'lagging'),
    (obj,'M-08: Golive công cụ KCS trên ERP trước 2027','boolean','increase',NULL,0,1,0,'leading'),
    (obj,'M-09: Golive công cụ cung ứng version 1 trước 2027','boolean','increase',NULL,0,1,0,'leading'),
    (obj,'M-10: Xây xong KPI nhân viên các phòng trước 2027','boolean','increase',NULL,0,1,0,'leading');

  INSERT INTO okr_initiatives(objective_id,kind,title,description,owner_email,status,priority,start_on,due_on,created_by) VALUES
    (obj,'project','H-01: Xây dựng & triển khai quy trình kiểm soát chất lượng (KCS)','KPI M-01. OKR: sản phẩm lỗi sau KCS <1%. Phòng QLCL. Tỷ trọng 10%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_CU'),
    (obj,'project','H-02: Xây dựng bộ DIO từng nhóm ngành & áp dụng','KPI M-02. OKR: không vượt 50% DIO mỗi ngành. Phòng kho vận. Tỷ trọng 10%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_CU'),
    (obj,'project','H-03: Nguyên tắc giao hàng & hợp tác dịch vụ giao chuyên nghiệp','KPI M-03. OKR: DIFOT >80%. Phòng kho vận. Tỷ trọng 10%.',own,'in_progress','medium','2026-06-01','2026-12-31','seed_khhd_CU'),
    (obj,'project','H-04: Nguyên tắc, công cụ & quy trình đặt hàng','KPI M-04. OKR: cung ứng >95% dự báo bán. Các phòng mua hàng. Tỷ trọng 10%.',own,'in_progress','high','2026-06-01','2026-12-31','seed_khhd_CU'),
    (obj,'project','H-05: Điều phối & luân chuyển hàng cho NSO','KPI M-05. OKR: cung ứng >95% nhu cầu khai trương NSO. Tỷ trọng 10%.',own,'in_progress','high','2026-06-01','2026-12-31','seed_khhd_CU'),
    (obj,'project','H-06: Ký hợp tác ≥5 NCC trang sức mới','KPI M-06. Phòng mua hàng trang sức. Tỷ trọng 10%.',own,'in_progress','medium','2026-06-01','2026-12-31','seed_khhd_CU'),
    (obj,'project','H-07: Ký hợp tác ≥4 NCC nguyên liệu vàng/bạc mới','KPI M-07. Phòng mua hàng tích lũy. Tỷ trọng 10%.',own,'in_progress','medium','2026-06-01','2026-12-31','seed_khhd_CU'),
    (obj,'project','H-08: Bộ công cụ kiểm soát chất lượng trên ERP','KPI M-08. OKR: golive quy trình KCS trước 2027. Tỷ trọng 10%.',own,'in_progress','medium','2026-06-01','2026-12-31','seed_khhd_CU'),
    (obj,'project','H-09: Công cụ liên hoàn theo dõi tồn, dự phóng, luân chuyển, đặt hàng','KPI M-09. OKR: golive version 1 trước 2027. Tỷ trọng 10%.',own,'in_progress','medium','2026-06-01','2026-12-31','seed_khhd_CU'),
    (obj,'project','H-10: Xây bộ checklist & KPI cho từng phòng trong khối','KPI M-10. OKR: hoàn thành KPI nhân viên trước 2027. Tỷ trọng 10%.',own,'in_progress','medium','2026-06-01','2026-12-31','seed_khhd_CU');
END $$;
COMMIT;
