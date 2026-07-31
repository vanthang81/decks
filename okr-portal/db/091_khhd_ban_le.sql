-- ============================================================================
-- OKR Portal — KHHĐ 2026 Khối KINH DOANH BÁN LẺ (Drive: 6 KPI M-xx + 21 hành động H-xx)
-- Objective khối (Năm 2026, unit BL, PIC Ms Thanh) + 6 KR + 21 dự án. Align lên
-- "2026: Hoàn thành Kế hoạch Kinh doanh (ĐHCĐ)". Idempotent created_by='seed_khhd_BL'.
-- ============================================================================
BEGIN;
DO $$
DECLARE y26 uuid; bl uuid; own text; parent uuid; obj uuid;
BEGIN
  SELECT id INTO y26 FROM okr_periods WHERE name='Năm 2026';
  SELECT id INTO bl FROM okr_units WHERE code='BL';
  SELECT id INTO parent FROM okr_objectives WHERE title='2026: Hoàn thành Kế hoạch Kinh doanh (ĐHCĐ)' AND created_by='seed_strategy' LIMIT 1;
  own := (SELECT email FROM okr_users WHERE email='phamthiminhthanh@baotinmanhhai.vn');

  DELETE FROM okr_objectives WHERE created_by='seed_khhd_BL';

  INSERT INTO okr_objectives(period_id,parent_id,level,unit_id,owner_email,title,description,status,okr_type,created_by)
    VALUES(y26,parent,'division',bl,own,
      '2026 — Khối Kinh doanh Bán lẻ: Tăng trưởng doanh thu & vận hành xuất sắc',
      'Tăng trưởng doanh thu & thị phần, nâng trải nghiệm khách hàng (NPS≥86%), kiện toàn vận hành chuỗi, vận hành xuất sắc & tuân thủ, phát triển con người và chuyển đổi số bán lẻ.',
      'active','committed','seed_khhd_BL') RETURNING id INTO obj;

  INSERT INTO okr_key_results(objective_id,title,metric_type,direction,unit_label,start_value,target_value,current_value,indicator) VALUES
    (obj,'M-01: Doanh thu thuần bán lẻ đạt ≥90% kế hoạch (KH 66,7 nghìn tỷ; tích luỹ 95% / trang sức 5%)','percent','increase','%',0,90,0,'lagging'),
    (obj,'M-02: NPS toàn hệ thống bán lẻ ≥ 86%','percent','increase','%',0,86,0,'lagging'),
    (obj,'M-03: Ban hành & đào tạo 100% Sổ tay vận hành (31 quy trình + 13 checklist)','percent','increase','%',0,100,0,'lagging'),
    (obj,'M-04: Nâng tỷ lệ cửa hàng đạt chuẩn (+5%/tháng)','percent','increase','%',0,90,0,'leading'),
    (obj,'M-05: ≥80% đội ngũ đạt chuẩn năng lực','percent','increase','%',0,80,0,'leading'),
    (obj,'M-06: 01 Dashboard điều hành bán lẻ tích hợp','boolean','increase',NULL,0,1,0,'lagging');

  INSERT INTO okr_initiatives(objective_id,kind,title,description,owner_email,status,priority,start_on,due_on,created_by) VALUES
    (obj,'project','H-01: Mở mới 68 cửa hàng theo kế hoạch năm','KPI M-01. OKR: 68 cửa hàng khai trương đúng KH; doanh thu NSO ≥80% KH sau 3 tháng. Tỷ trọng 10%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_BL'),
    (obj,'project','H-02: Tăng trưởng doanh thu cửa hàng hiện hữu (LFL Growth)','KPI M-01. OKR: doanh thu cửa hàng hiện hữu tăng ≥20% so cùng kỳ. Tỷ trọng 15%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_BL'),
    (obj,'project','H-03: Phát triển nhóm sản phẩm chiến lược (KGB, TKC, TS 24K)','KPI M-01. OKR: doanh thu tích luỹ + TS 24K đạt 98% cơ cấu doanh thu. Tỷ trọng 5%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_BL'),
    (obj,'project','H-04: Nâng cao năng suất bán hàng (CR, ATV, UPT)','KPI M-01. OKR: hoàn thành KPI vận hành bán hàng toàn hệ thống. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_BL'),
    (obj,'project','H-05: Đảm bảo đủ hàng cho kinh doanh & mùa vụ cao điểm','KPI M-01. OKR: tỷ lệ đáp ứng hàng hoá >98%; không thiếu hàng trọng yếu. Tỷ trọng 5%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_BL'),
    (obj,'project','H-06: Chuẩn hóa trải nghiệm khách hàng theo tiêu chuẩn dịch vụ BTMH','KPI M-02. OKR: 100% cửa hàng tuân thủ tiêu chuẩn dịch vụ; NPS≥86%. Tỷ trọng 10%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_BL'),
    (obj,'project','H-07: Nâng cao chất lượng xử lý phản hồi, khiếu nại khách hàng','KPI M-02. OKR: ≥90% vụ việc xử lý đúng SLA; giảm khiếu nại nghiêm trọng. Tỷ trọng 3%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_BL'),
    (obj,'project','H-08: Cơ chế đo lường, giám sát & cải tiến NPS định kỳ','KPI M-02. OKR: NPS theo dõi WBR/MBR; 100% cửa hàng có KH cải thiện khi dưới chuẩn. Tỷ trọng 3%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_BL'),
    (obj,'project','H-09: Nâng năng lực đội ngũ TVV, CHT về tư vấn, bán hàng & dịch vụ','KPI M-02. OKR: điểm đánh giá dịch vụ tăng; giảm phản hồi tiêu cực. Tỷ trọng 3%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_BL'),
    (obj,'project','H-10: Xây dựng & ban hành Sổ tay vận hành cửa hàng, SOP, Checklist','KPI M-03. OKR: ban hành 100% danh mục tài liệu vận hành. Tỷ trọng 5%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_BL'),
    (obj,'project','H-11: Đào tạo & triển khai áp dụng trên toàn hệ thống','KPI M-03. OKR: 100% ASM, NS cửa hàng được đào tạo & áp dụng. Tỷ trọng 3%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_BL'),
    (obj,'project','H-12: Kiểm tra, đánh giá mức độ áp dụng định kỳ','KPI M-03. OKR: tỷ lệ áp dụng thực tế ≥90%. Tỷ trọng 3%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_BL'),
    (obj,'project','H-13: Chương trình kiểm tra định kỳ & đột xuất toàn hệ thống','KPI M-04. OKR: 100% cửa hàng được kiểm tra theo kế hoạch. Tỷ trọng 3%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_BL'),
    (obj,'project','H-14: Nâng tỷ lệ tuân thủ quy trình & quản lý tài sản','KPI M-04. OKR: tỷ lệ tuân thủ ≥95%; giảm sự cố & mất mát. Tỷ trọng 3%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_BL'),
    (obj,'project','H-15: Cơ chế cảnh báo & khắc phục vi phạm','KPI M-04. OKR: 95% vi phạm được xử lý & đóng khắc phục đúng hạn. Tỷ trọng 3%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_BL'),
    (obj,'project','H-16: Khung năng lực & tiêu chuẩn năng lực cho ASM, CHT','KPI M-05. OKR: 100% vị trí có bộ tiêu chuẩn năng lực. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_BL'),
    (obj,'project','H-17: Đào tạo, coaching & phát triển đội ngũ kế cận (CHT)','KPI M-05. OKR: ≥80% nhân sự đạt chuẩn năng lực. Tỷ trọng 3%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_BL'),
    (obj,'project','H-18: Xây dựng nguồn nhân sự kế cận phục vụ mở rộng hệ thống','KPI M-05. OKR: đảm bảo nguồn nhân sự cho 100% cửa hàng mở mới. Tỷ trọng 3%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_BL'),
    (obj,'project','H-19: Xây dựng Dashboard điều hành bán lẻ tích hợp','KPI M-06. OKR: hoàn thành 01 Dashboard vận hành tập trung. Tỷ trọng 5%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_BL'),
    (obj,'project','H-20: Chuẩn hóa dữ liệu vận hành, kinh doanh & nhân sự bán lẻ','KPI M-06. OKR: 100% dữ liệu được kết nối & cập nhật định kỳ. Tỷ trọng 2%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_BL'),
    (obj,'project','H-21: Ứng dụng Dashboard trong WBR, MBR & quản trị hiệu suất','KPI M-06. OKR: 100% cuộc họp điều hành dùng Dashboard làm nguồn dữ liệu chính. Tỷ trọng 3%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_BL');
END $$;
COMMIT;
