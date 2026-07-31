-- KHHĐ 2026 Khối MARKETING — Brand+Trade+CSKH (8 KPI + 15 HĐ, PIC Ms Quỳnh=GĐK). created_by='seed_khhd_MKTBT'
BEGIN;
DO $$
DECLARE y26 uuid; mkt uuid; own text; parent uuid; obj uuid;
BEGIN
  SELECT id INTO y26 FROM okr_periods WHERE name='Năm 2026';
  SELECT id INTO mkt FROM okr_units WHERE code='MKT';
  SELECT id INTO parent FROM okr_objectives WHERE title='2026: Hoàn thành Kế hoạch Kinh doanh (ĐHCĐ)' AND created_by='seed_strategy' LIMIT 1;
  own := (SELECT email FROM okr_users WHERE email='tranvuthuquynh@baotinmanhhai.vn');
  DELETE FROM okr_objectives WHERE created_by='seed_khhd_MKTBT';

  INSERT INTO okr_objectives(period_id,parent_id,level,unit_id,owner_email,title,description,status,okr_type,created_by)
    VALUES(y26,parent,'division',mkt,own,
      '2026 — Marketing (Brand + Trade + CSKH): Thương hiệu TOP2 & trải nghiệm KH',
      'Tăng trưởng khách hàng & foot traffic, nâng độ yêu thích thương hiệu (TOP2 SOV/NSR), chất lượng dịch vụ (NPS≥90), sản xuất creative, ROI Marketing và loyalty/VIP.',
      'active','committed','seed_khhd_MKTBT') RETURNING id INTO obj;

  INSERT INTO okr_key_results(objective_id,title,metric_type,direction,unit_label,start_value,target_value,current_value,indicator) VALUES
    (obj,'M-01: Hỗ trợ đạt 1.200.000 KH (H1) / 480.901 KH lũy kế (H2)','number','increase','KH',0,1200000,0,'lagging'),
    (obj,'M-02: Foot traffic 1.700.000 lượt (H2)','number','increase','lượt',0,1700000,0,'lagging'),
    (obj,'M-03: Thương hiệu TOP2 SOV & NSR; Top of mind TOP4 HN/TOP6 HCM','boolean','increase',NULL,0,1,0,'lagging'),
    (obj,'M-04: NPS ≥ 90 (khiếu nại <1%, giữ chân KH ≥35%)','number','increase','điểm',88,90,88,'lagging'),
    (obj,'M-05: 1.300 thiết kế + 4.200 ảnh sản phẩm (H2)','number','increase','thiết kế',0,1300,0,'leading'),
    (obj,'M-06: 40% KH cân nhắc chọn thương hiệu khi mua','percent','increase','%',39,40,39,'lagging'),
    (obj,'M-07: ROI Marketing H2 = 311','number','increase','lần',0,311,0,'lagging'),
    (obj,'M-08: 0,8% KH chuyển đổi lên nhóm VIP','percent','increase','%',0,0.8,0,'lagging');

  INSERT INTO okr_initiatives(objective_id,kind,title,description,owner_email,status,priority,start_on,due_on,created_by) VALUES
    (obj,'project','H-01: Chiến dịch lớn (Brand Day) H2 tăng nhận diện & thu hút KH mới','KPI M-01. Hỗ trợ đạt mục tiêu KH năm. Tỷ trọng 5%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_MKTBT'),
    (obj,'project','H-02: Chiến dịch theo mùa (Festival cưới, 20/10, Black Friday, Giáng Sinh)','KPI M-01. Thu hút KH mới & thúc đẩy trang sức. Tỷ trọng 5%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_MKTBT'),
    (obj,'project','H-03: Chiến dịch ra mắt SP Trang sức & Quà tặng mới','KPI M-01. Tăng nhận diện & giao dịch KH. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_MKTBT'),
    (obj,'project','H-04: Chiến dịch ra mắt SP Vàng Tích Lũy mới','KPI M-01. Tăng nhận diện & giao dịch KH. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_MKTBT'),
    (obj,'project','H-05: Chiến dịch push sale, affiliate & khai thác KH cũ','KPI M-06. Retention/referral; 40% KH cân nhắc chọn thương hiệu. Tỷ trọng 10%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_MKTBT'),
    (obj,'project','H-06: Chiến dịch tối ưu ROI Marketing','KPI M-07. ROI H1=413 / H2=311. Tỷ trọng 10%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_MKTBT'),
    (obj,'project','H-07: Partnership đối tác cùng tệp KH (áo cưới, nhà hàng cưới, FMCG)','KPI M-03. Bán chéo & lan tỏa thương hiệu. Tỷ trọng 3%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_MKTBT'),
    (obj,'project','H-08: Tài trợ hoạt động tăng nhận diện với giới trẻ & cộng đồng','KPI M-03. Tỷ trọng 3%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_MKTBT'),
    (obj,'project','H-09: Tham gia các giải thưởng uy tín trong nước & thế giới','KPI M-03. Tăng giá trị thương hiệu. Tỷ trọng 3%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_MKTBT'),
    (obj,'project','H-10: Xây mạng lưới Friend of house (chuyên gia, KOL, KOC)','KPI M-03. Truyền thông tự nhiên; đẩy trang sức 24K. Tỷ trọng 3%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_MKTBT'),
    (obj,'project','H-11: Hệ sinh thái nội dung BTMH đa nền tảng (Hub content, seeding, Podcast, TikTok)','KPI M-04. Top of mind & SOV/NSR TOP2. Tỷ trọng 3%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_MKTBT'),
    (obj,'project','H-12: Nâng chất lượng dịch vụ & trải nghiệm KH toàn hệ thống','KPI M-05→NPS. NPS≥90; khiếu nại <1%; giữ chân ≥35%. Tỷ trọng 10%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_MKTBT'),
    (obj,'project','H-13: Triển khai chương trình Loyalty (H2)','KPI M-08. 0,8% KH lên nhóm VIP. Tỷ trọng 10%.',own,'in_progress','high','2026-07-01','2026-12-31','seed_khhd_MKTBT'),
    (obj,'project','H-14: Hệ thống sáng tạo & quản trị sản xuất Creative chuyên nghiệp','KPI M-06→thiết kế. 1.300 thiết kế + 4.200 ảnh SP (H2). Tỷ trọng 10%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_MKTBT'),
    (obj,'project','H-15: Chương trình thúc đẩy bán & hoạt náo/event tại điểm bán','KPI M-02. Foot traffic H1 883K / H2 1.700K lượt. Tỷ trọng 15%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_MKTBT');
END $$;
COMMIT;
