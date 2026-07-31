-- KHHĐ 2026 Khối MARKETING — Ecom+Growth (7 KPI + 19 HĐ, PIC Mr Tuấn=PGĐ). created_by='seed_khhd_MKTEG'
BEGIN;
DO $$
DECLARE y26 uuid; mkt uuid; own text; parent uuid; obj uuid;
BEGIN
  SELECT id INTO y26 FROM okr_periods WHERE name='Năm 2026';
  SELECT id INTO mkt FROM okr_units WHERE code='MKT';
  SELECT id INTO parent FROM okr_objectives WHERE title='2026: Hoàn thành Kế hoạch Kinh doanh (ĐHCĐ)' AND created_by='seed_strategy' LIMIT 1;
  own := (SELECT email FROM okr_users WHERE email='phamthanhtuan@baotinmanhhai.vn');
  DELETE FROM okr_objectives WHERE created_by='seed_khhd_MKTEG';

  INSERT INTO okr_objectives(period_id,parent_id,level,unit_id,owner_email,title,description,status,okr_type,created_by)
    VALUES(y26,parent,'division',mkt,own,
      '2026 — Marketing (Ecom + Growth): Doanh thu Ecom 1.255 tỷ & 50.000 KH online mới',
      'Tăng doanh thu kênh Ecom (Sàn/Website), tăng trưởng 50.000 KH online (Growth Loop O2O/O2O), Hero SKU cho Sàn, mảng 24K Ecom, độ phủ social/SEO, nền tảng Martech (Website/CDP/CEP/Chatbot) và chuyển khách Sàn về Website.',
      'active','committed','seed_khhd_MKTEG') RETURNING id INTO obj;

  INSERT INTO okr_key_results(objective_id,title,metric_type,direction,unit_label,start_value,target_value,current_value,indicator) VALUES
    (obj,'M-01: Doanh thu kênh Ecom đạt 1.255 tỷ','number','increase','tỷ',0,1255,0,'lagging'),
    (obj,'M-02: 50.000 khách hàng mới trên kênh Online (Growth)','number','increase','KH',0,50000,0,'lagging'),
    (obj,'M-03: 100–150 Hero SKU lên sàn (biên LNG sau phí sàn >10%)','number','increase','SKU',0,100,0,'leading'),
    (obj,'M-04: Ra mắt 10–15 SKU Trang sức 24K/Quà tặng Ecom','number','increase','SKU',0,10,0,'leading'),
    (obj,'M-05: User Traffic Website đạt 13,6 triệu (từ 4,0 triệu)','number','increase','lượt',4019124,13600000,4019124,'lagging'),
    (obj,'M-06: Golive 4 dự án Martech đúng hạn (Website/CDP/CEP/Chatbot)','boolean','increase',NULL,0,1,0,'lagging'),
    (obj,'M-07: ≥400 Lead chất lượng/tháng từ Sàn về Website','number','increase','lead/tháng',0,400,0,'leading');

  INSERT INTO okr_initiatives(objective_id,kind,title,description,owner_email,status,priority,start_on,due_on,created_by) VALUES
    (obj,'project','H-01: Vận hành bán hàng theo dự báo & tối ưu chuyển đổi toàn kênh Ecom','KPI M-01. Đạt DT 1.255 tỷ đúng cơ cấu dòng SP. Tỷ trọng 14%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_MKTEG'),
    (obj,'project','H-02: Tối ưu Merchandise & chính sách giá theo dòng SP','KPI M-01. Tối đa AOV & tỷ trọng SP biên cao. Tỷ trọng 4%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_MKTEG'),
    (obj,'project','H-03: Quản trị giao vận – kho – đổi trả','KPI M-01. Giao thành công ≥95%; huỷ/hoàn <5%. Tỷ trọng 2%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_MKTEG'),
    (obj,'project','H-04: Vòng lặp tăng trưởng Online-to-Online (SEO/Content/Email/Referral)','KPI M-02. ≥30.000 KH mới (60%). Tỷ trọng 15%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_MKTEG'),
    (obj,'project','H-05: Vòng lặp tăng trưởng Online-to-Offline','KPI M-02. 20.000 KH mới còn lại (40%). Tỷ trọng 10%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_MKTEG'),
    (obj,'project','H-06: Triển khai công cụ Martech nền tảng Growth Loop','KPI M-02. Golive & ≥80% điểm chạm tự động hoá. Tỷ trọng 10%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_MKTEG'),
    (obj,'project','H-07: Bộ Hero SKU chuyên biệt cho Sàn (Shopee/TikTok)','KPI M-03. 100–150 SKU sẵn sàng lên sàn. Tỷ trọng 2%.',own,'in_progress','medium','2026-01-01','2026-08-31','seed_khhd_MKTEG'),
    (obj,'project','H-08: Tối ưu giá – phí sàn – khuyến mãi bảo vệ biên LNG','KPI M-03. Biên LNG >25%/tháng. Tỷ trọng 1%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_MKTEG'),
    (obj,'project','H-09: Đàm phán chính sách fee sàn (Shopee/TikTok)','KPI M-03. Giảm phí sàn 5–10%. Tỷ trọng 2%.',own,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_MKTEG'),
    (obj,'project','H-10: Phát triển & ra mắt BST Trang sức 24K/Quà tặng Ecom','KPI M-04. 10–15 SKU triển khai bán. Tỷ trọng 3%.',own,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_MKTEG'),
    (obj,'project','H-11: Kịch bản bán hàng & truyền thông cho SP 24K/Quà tặng','KPI M-04. Đạt doanh số nhóm SP mới Q3-Q4. Tỷ trọng 2%.',own,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_MKTEG'),
    (obj,'project','H-12: Media/Amplification đa điểm chạm bán kính 1km quanh cửa hàng','KPI M-05. Reach 55%, Fre>2, ER~4%, 8tr KH/tháng. Tỷ trọng 4%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_MKTEG'),
    (obj,'project','H-13: SEO & Content Website (300 từ khóa vàng tích luỹ/24K)','KPI M-05. Traffic 13,6tr; Top3–5 tìm kiếm tự nhiên. Tỷ trọng 4%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_MKTEG'),
    (obj,'project','H-14: Phát triển Zalo OA & Fanpage Facebook','KPI M-05. Zalo >100K follower; FB >700K pagelike. Tỷ trọng 3%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_MKTEG'),
    (obj,'project','H-15: Triển khai dự án Website Ecommerce mới','KPI M-06. Golive đúng tiến độ (04/2026). Tỷ trọng 6%.',own,'in_progress','high','2026-01-01','2026-08-31','seed_khhd_MKTEG'),
    (obj,'project','H-16: Triển khai CDP & CEP','KPI M-06. Golive đúng tiến độ (06/2026). Tỷ trọng 9%.',own,'in_progress','high','2026-07-01','2026-12-31','seed_khhd_MKTEG'),
    (obj,'project','H-17: Triển khai Chatbot AI','KPI M-06. Golive 08/2026. Tỷ trọng 5%.',own,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_MKTEG'),
    (obj,'project','H-18: Luồng ưu đãi dẫn khách từ Sàn về Website','KPI M-07. ≥500 Lead chất lượng/tháng. Tỷ trọng 3%.',own,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_MKTEG'),
    (obj,'project','H-19: Remarketing/Retention khách đã mua trên Sàn','KPI M-07. ≥20% khách Sàn mua lại trên Website. Tỷ trọng 2%.',own,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_MKTEG');
END $$;
COMMIT;
