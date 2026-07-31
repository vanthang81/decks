-- KHHĐ 2026 Khối KINH DOANH B2B & PT ĐỐI TÁC (6 KPI + 16 HĐ, PIC Mr Huy). created_by='seed_khhd_B2B'
BEGIN;
DO $$
DECLARE y26 uuid; b2b uuid; own text; parent uuid; obj uuid;
BEGIN
  SELECT id INTO y26 FROM okr_periods WHERE name='Năm 2026';
  SELECT id INTO b2b FROM okr_units WHERE code='B2B';
  SELECT id INTO parent FROM okr_objectives WHERE title='2026: Hoàn thành Kế hoạch Kinh doanh (ĐHCĐ)' AND created_by='seed_strategy' LIMIT 1;
  own := (SELECT email FROM okr_users WHERE email='phamduchuy@baotinmanhhai.vn');
  DELETE FROM okr_objectives WHERE created_by='seed_khhd_B2B';

  INSERT INTO okr_objectives(period_id,parent_id,level,unit_id,owner_email,title,description,status,okr_type,created_by)
    VALUES(y26,parent,'division',b2b,own,
      '2026 — Khối Kinh doanh B2B & PT đối tác: Doanh thu 1.859 tỷ & mở rộng đối tác',
      'Tăng trưởng doanh thu B2B (đại lý, KHDN, kênh ngân hàng BIDV/MB), tối ưu chi phí & thu mua, nâng NPS, chuẩn hóa vận hành, phát triển đội ngũ và chuyển đổi số (bán vàng qua app ngân hàng).',
      'active','committed','seed_khhd_B2B') RETURNING id INTO obj;

  INSERT INTO okr_key_results(objective_id,title,metric_type,direction,unit_label,start_value,target_value,current_value,indicator) VALUES
    (obj,'M-01: Doanh thu B2B đạt 1.859 tỷ FY2026','number','increase','tỷ',0,1859,0,'lagging'),
    (obj,'M-02: ≥90% yêu cầu thu mua từ Cung ứng thực hiện thành công','percent','increase','%',0,90,0,'lagging'),
    (obj,'M-02b: Chi phí hoạt động B2B giảm ≥5% so ngân sách phê duyệt','boolean','increase',NULL,0,1,0,'lagging'),
    (obj,'M-03: NPS B2B không thấp hơn NPS trung bình công ty','boolean','increase',NULL,0,1,0,'lagging'),
    (obj,'M-04: ≥90% quy trình vận hành ban hành đúng tiến độ','percent','increase','%',0,90,0,'leading'),
    (obj,'M-05: ≥85% nhân sự đạt KPI ≥90%','percent','increase','%',0,85,0,'leading'),
    (obj,'M-06: ≥90% dự án số hóa go-live đúng tiến độ','percent','increase','%',0,90,0,'lagging');

  INSERT INTO okr_initiatives(objective_id,kind,title,description,owner_email,status,priority,start_on,due_on,created_by) VALUES
    (obj,'project','H-01: Phát triển kênh Đại lý B2B (928 tỷ)','KPI M-01. Tăng tần suất & giá trị đơn đại lý hiện hữu +20% YoY; phát triển 30 đại lý mới (HCM, miền Trung, miền Bắc ngoài HN) đến 30/10. Tỷ trọng 15%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_B2B'),
    (obj,'project','H-02: Phát triển kênh KHDN (153 tỷ)','KPI M-01. Phát triển 30 KHDN mới đến 30/10; tăng tần suất & giá trị đơn KHDN hiện hữu +20% YoY. Tỷ trọng 5%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_B2B'),
    (obj,'project','H-03: Bán vàng qua app 02 ngân hàng BIDV & MB (779 tỷ)','KPI M-01. Doanh thu ~779 tỷ FY2026. Tỷ trọng 15%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_B2B'),
    (obj,'project','H-04: Giảm 5% chi phí hoạt động khối B2B','KPI M-02b. Chi phí hoạt động B2B -5% so ngân sách phê duyệt. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_B2B'),
    (obj,'project','H-05: Thực hiện ≥90% yêu cầu thu mua từ Cung ứng','KPI M-02. Giá & sản lượng thu mua thực tế đạt kỳ vọng. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_B2B'),
    (obj,'project','H-06: NPS kênh Đại lý ≥ NPS công ty','KPI M-03. Khảo sát hài lòng kênh đại lý. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_B2B'),
    (obj,'project','H-07: NPS kênh KHDN ≥ NPS công ty','KPI M-03. Khảo sát hài lòng kênh KHDN. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_B2B'),
    (obj,'project','H-08: NPS kênh Ngân hàng ≥ NPS công ty','KPI M-03. Khảo sát hài lòng kênh ngân hàng. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_B2B'),
    (obj,'project','H-09: Ban hành quy trình vận hành kênh Đại lý (trước 30/07)','KPI M-04. ≥90% quy trình ban hành đúng tiến độ & chất lượng. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-07-30','seed_khhd_B2B'),
    (obj,'project','H-10: Ban hành quy trình vận hành kênh KHDN (trước 30/07)','KPI M-04. ≥90% quy trình ban hành đúng tiến độ. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-07-30','seed_khhd_B2B'),
    (obj,'project','H-11: Ban hành quy trình vận hành kênh Ngân hàng (trước 30/07)','KPI M-04. ≥90% quy trình ban hành đúng tiến độ. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-07-30','seed_khhd_B2B'),
    (obj,'project','H-12: 100% CBNV hoàn thành khóa học/sự kiện bắt buộc','KPI M-05. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_B2B'),
    (obj,'project','H-13: 85% nhân sự hoàn thành KPI ≥90%','KPI M-05. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_B2B'),
    (obj,'project','H-14: Dự án bán vàng qua app BIDV go-live 25/06','KPI M-06. Go-live đúng tiến độ. Tỷ trọng 5%.',own,'in_progress','high','2026-01-01','2026-06-25','seed_khhd_B2B'),
    (obj,'project','H-15: Dự án bán vàng qua app MB go-live trước 15/08','KPI M-06. Go-live đúng tiến độ. Tỷ trọng 5%.',own,'in_progress','high','2026-01-01','2026-08-15','seed_khhd_B2B'),
    (obj,'project','H-16: Dự án Cửa hàng không giấy nghiệm thu trước 30/07','KPI M-06. Bán lẻ nghiệm thu đúng tiến độ. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-07-30','seed_khhd_B2B');
END $$;
COMMIT;
