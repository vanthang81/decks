-- ============================================================================
-- OKR Portal — Seed OKR CHIẾN LƯỢC công ty BTMH (đỉnh tháp)
-- 5 trụ chiến lược 2026–2030 (multiyear) + 5 Objective Năm 2026 (alignment lên trụ).
-- Nguồn: KB BTMH (FM 5 năm & Định hướng 2030, equity story, biên bản HĐQT).
-- Idempotent: xoá theo created_by='seed_strategy' rồi chèn lại. Chạy SUPERUSER postgres.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  my uuid; y26 uuid; own text;
  p_ipo uuid; p_net uuid; p_24k uuid; p_ops uuid; p_esg uuid;
  a_ipo uuid; a_net uuid; a_24k uuid; a_biz uuid; a_ops uuid;
BEGIN
  SELECT id INTO my  FROM okr_periods WHERE name='Chiến lược 2026–2030';
  SELECT id INTO y26 FROM okr_periods WHERE name='Năm 2026';
  IF EXISTS (SELECT 1 FROM okr_users WHERE email='vanthang81@gmail.com')
    THEN own := 'vanthang81@gmail.com'; ELSE own := NULL; END IF;

  DELETE FROM okr_objectives WHERE created_by='seed_strategy';

  -- ===== 5 TRỤ CHIẾN LƯỢC 2026–2030 (multiyear) =====
  INSERT INTO okr_objectives(period_id,level,title,description,status,okr_type,owner_email,created_by)
    VALUES(my,'company','IPO thành công & Quản trị chuẩn niêm yết',
      'Niêm yết (định hướng Q1/2027) với hồ sơ minh bạch; dựng cơ chế kiểm soát độc lập (kiểm toán Grant Thornton + tư vấn checklist theo giai đoạn).',
      'active','committed',own,'seed_strategy') RETURNING id INTO p_ipo;
  INSERT INTO okr_objectives(period_id,level,title,description,status,okr_type,owner_email,created_by)
    VALUES(my,'company','Dẫn đầu bán lẻ VBĐQ — mở rộng mạng lưới có kỷ luật',
      'Ưu tiên CHẤT LƯỢNG/hiệu quả cửa hàng hơn số lượng; chuẩn hóa & nhân bản Winning Model; bám ngưỡng quản trị 20→50→100→200 cửa hàng; Revenue per store là chỉ số trục.',
      'active','aspirational',own,'seed_strategy') RETURNING id INTO p_net;
  INSERT INTO okr_objectives(period_id,level,title,description,status,okr_type,owner_email,created_by)
    VALUES(my,'company','Dịch chuyển cơ cấu sang Trang sức 24K hàm lượng cao',
      'Học mô hình Trung Quốc (24K ~40–45% ở peer); nâng tỷ trọng 24K + quà tặng trong doanh thu từ ~3% lên ~12,9% (mix-shift equity story), mở rộng biên lợi nhuận.',
      'active','committed',own,'seed_strategy') RETURNING id INTO p_24k;
  INSERT INTO okr_objectives(period_id,level,title,description,status,okr_type,owner_email,created_by)
    VALUES(my,'company','Nâng năng lực vận hành & con người',
      'Chuẩn hóa mô hình vận hành trước khi tăng tốc; nâng năng lực quản trị theo ngưỡng mạng lưới; xử lý sớm nút thắt con người trong chuyển đổi.',
      'active','committed',own,'seed_strategy') RETURNING id INTO p_ops;
  INSERT INTO okr_objectives(period_id,level,title,description,status,okr_type,owner_email,created_by)
    VALUES(my,'company','ESG 2030 — Quản trị là chuẩn vàng mới',
      'Triển khai khung ESG & quản trị doanh nghiệp làm nền tảng tái định giá và phát triển bền vững đến 2030.',
      'active','aspirational',own,'seed_strategy') RETURNING id INTO p_esg;

  -- KR cho các trụ (giá trị mốc do CFO cập nhật qua check-in)
  INSERT INTO okr_key_results(objective_id,title,metric_type,direction,unit_label,start_value,target_value,current_value,indicator) VALUES
    (p_ipo,'Hoàn tất niêm yết IPO','boolean','increase',NULL,0,1,0,'lagging'),
    (p_ipo,'Điểm quản trị theo checklist tư vấn độc lập','percent','increase','%',0,100,0,'leading'),
    (p_net,'Số cửa hàng đạt chuẩn Winning Model','number','increase','cửa hàng',20,100,20,'lagging'),
    (p_net,'Chuẩn hóa & nhân bản Winning Model cửa hàng','boolean','increase',NULL,0,1,0,'leading'),
    (p_24k,'Tỷ trọng 24K + quà tặng trong doanh thu','percent','increase','%',3,12.9,3,'lagging'),
    (p_ops,'Chuẩn hóa mô hình vận hành & năng lực quản trị ngưỡng mới','boolean','increase',NULL,0,1,0,'leading'),
    (p_esg,'Triển khai khung ESG & quản trị doanh nghiệp','boolean','increase',NULL,0,1,0,'leading');

  -- ===== 5 OBJECTIVE NĂM 2026 (alignment lên trụ) =====
  INSERT INTO okr_objectives(period_id,parent_id,level,title,description,status,okr_type,owner_email,created_by)
    VALUES(y26,p_ipo,'company','2026: Chuẩn bị nền tảng IPO (niêm yết Q1/2027)',
      'Hoàn tất due diligence (HSC/TCBS), Investment Memorandum, chốt advisor & cấu trúc chào bán; đóng sổ & chuẩn hóa số liệu IPO.',
      'active','committed',own,'seed_strategy') RETURNING id INTO a_ipo;
  INSERT INTO okr_objectives(period_id,parent_id,level,title,description,status,okr_type,owner_email,created_by)
    VALUES(y26,p_net,'company','2026: Chuẩn hóa Winning Model & review NSO',
      'Đánh giá hiệu quả cửa hàng mới (NSO), chốt phương pháp luận Winning Model, tách lớp nhóm cửa hàng hiệu quả thấp để giải trình.',
      'active','committed',own,'seed_strategy') RETURNING id INTO a_net;
  INSERT INTO okr_objectives(period_id,parent_id,level,title,description,status,okr_type,owner_email,created_by)
    VALUES(y26,p_24k,'company','2026: Chủ động dịch chuyển cơ cấu sang Trang sức 24K',
      'Can thiệp mẫu mã/thiết kế + marketing để dịch chuyển cơ cấu (doanh thu 2026 giảm là GIẢM CHỦ ĐỘNG); đối chuẩn 18K/24K với PNJ & peer Trung Quốc.',
      'active','committed',own,'seed_strategy') RETURNING id INTO a_24k;
  INSERT INTO okr_objectives(period_id,parent_id,level,title,description,status,okr_type,owner_email,created_by)
    VALUES(y26,p_net,'company','2026: Hoàn thành Kế hoạch Kinh doanh (ĐHCĐ)',
      'Đạt kế hoạch doanh thu & lợi nhuận gộp cả năm 2026 theo bản ĐHCĐ (KR tự đồng bộ từ BigQuery).',
      'active','committed',own,'seed_strategy') RETURNING id INTO a_biz;
  INSERT INTO okr_objectives(period_id,parent_id,level,title,description,status,okr_type,owner_email,created_by)
    VALUES(y26,p_ops,'company','2026: Kiện toàn tổ chức & năng lực đội ngũ',
      'Kiện toàn cơ cấu khối/phòng, tuyển & phát triển nhân sự cho ngưỡng quản trị mới (đầu mối Store Development); nâng năng lực quản trị.',
      'active','committed',own,'seed_strategy') RETURNING id INTO a_ops;

  -- KR 2026: mục tiêu kinh doanh dùng KPI TỰ ĐỘNG từ BigQuery (target=ĐHCĐ cả năm, current=thực hiện)
  INSERT INTO okr_key_results(objective_id,title,metric_type,direction,unit_label,start_value,target_value,current_value,kpi_source,indicator) VALUES
    (a_biz,'Doanh thu 2026 (kế hoạch ĐHCĐ vs thực hiện)','currency','increase','tỷ',0,0,0,'revenue','lagging'),
    (a_biz,'Lợi nhuận gộp 2026 (kế hoạch vs thực hiện)','currency','increase','tỷ',0,0,0,'gross_profit','lagging');
  INSERT INTO okr_key_results(objective_id,title,metric_type,direction,unit_label,start_value,target_value,current_value,indicator) VALUES
    (a_ipo,'Hoàn tất due diligence + IM + chốt advisor','boolean','increase',NULL,0,1,0,'lagging'),
    (a_net,'Số cửa hàng đạt Winning Model trong 2026','number','increase','cửa hàng',20,40,20,'lagging'),
    (a_24k,'Tỷ trọng 24K + quà tặng /doanh thu 2026','percent','increase','%',3,8,3,'lagging'),
    (a_ops,'Tỷ lệ vị trí quản trị ngưỡng mới được kiện toàn','percent','increase','%',0,80,0,'leading');
END $$;

COMMIT;
