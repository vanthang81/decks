-- KHHĐ 2026 Khối NHÂN SỰ (KR cho các M có hành động + 15 HĐ). created_by='seed_khhd_NS'
BEGIN;
DO $$
DECLARE y26 uuid; ns uuid; parent uuid; obj uuid; o_hai text; o_ly text; o_mai text; o_ngoc text;
BEGIN
  SELECT id INTO y26 FROM okr_periods WHERE name='Năm 2026';
  SELECT id INTO ns FROM okr_units WHERE code='NS';
  SELECT id INTO parent FROM okr_objectives WHERE title='2026: Kiện toàn tổ chức & năng lực đội ngũ' AND created_by='seed_strategy' LIMIT 1;
  o_hai := (SELECT email FROM okr_users WHERE email='tranxuanhai@baotinmanhhai.vn');
  o_ly := (SELECT email FROM okr_users WHERE email='nguyenthily@baotinmanhhai.vn');
  o_mai := (SELECT email FROM okr_users WHERE email='maingocmai@baotinmanhhai.vn');
  o_ngoc := (SELECT email FROM okr_users WHERE email='nguyenbichngoc@baotinmanhhai.vn');
  DELETE FROM okr_objectives WHERE created_by='seed_khhd_NS';

  INSERT INTO okr_objectives(period_id,parent_id,level,unit_id,owner_email,title,description,status,okr_type,created_by)
    VALUES(y26,parent,'division',ns,o_hai,
      '2026 — Khối Nhân sự: Phát triển tổ chức, tuyển dụng, hiệu suất & giữ chân',
      'Chuẩn hóa cơ cấu tổ chức & MTCV, lấp đầy định biên, quản trị hiệu suất (KPI), phát triển đội ngũ kế cận, chính sách QTNS, số hóa nghiệp vụ và kiểm soát turnover, tuân thủ pháp lý lao động.',
      'active','committed','seed_khhd_NS') RETURNING id INTO obj;

  INSERT INTO okr_key_results(objective_id,title,metric_type,direction,unit_label,start_value,target_value,current_value,indicator) VALUES
    (obj,'M-01: SĐTC được xây dựng/cập nhật đúng hạn ≥ 90%','percent','increase','%',0,90,0,'lagging'),
    (obj,'M-02: Vị trí có đầy đủ MTCV ≥ 90%','percent','increase','%',0,90,0,'lagging'),
    (obj,'M-03: Tỷ lệ lấp đầy định biên ≥ 95%','percent','increase','%',0,95,0,'lagging'),
    (obj,'M-04: Tỷ lệ đáp ứng nhân sự ≥ 95%','percent','increase','%',0,95,0,'lagging'),
    (obj,'M-08: Tạo nguồn cho các vị trí chủ chốt','boolean','increase',NULL,0,1,0,'leading'),
    (obj,'M-09: Vị trí có đầy đủ KPI ≥ 90%','percent','increase','%',0,90,0,'lagging'),
    (obj,'M-10: CBNV đạt hiệu quả công việc','boolean','increase',NULL,0,1,0,'lagging'),
    (obj,'M-14: Hoàn thành hệ thống chính sách QTNS ≥ 95%','percent','increase','%',0,95,0,'lagging'),
    (obj,'M-15: Nghiệp vụ nhân sự được số hóa ≥ 50%','percent','increase','%',0,50,0,'leading'),
    (obj,'M-16: Data nhân sự được chuẩn hóa 100%','percent','increase','%',0,100,0,'leading'),
    (obj,'M-20: Turnover chủ động nhóm CBLĐ ≤ 10%','percent','decrease','%',15,10,15,'lagging'),
    (obj,'M-21: Turnover chủ động toàn công ty ≤ 26%','percent','decrease','%',30,26,30,'lagging'),
    (obj,'M-24: Tuân thủ pháp lý lao động/lương/BH ≥ 80%','percent','increase','%',0,80,0,'lagging');

  INSERT INTO okr_initiatives(objective_id,kind,title,description,owner_email,status,priority,start_on,due_on,created_by) VALUES
    (obj,'project','H-01: Hoàn thành sơ đồ cơ cấu tổ chức','KPI M-01. Tỷ trọng 5%.',o_hai,'in_progress','high','2026-03-01','2026-06-30','seed_khhd_NS'),
    (obj,'project','H-02: Xây dựng MTCV cho các vị trí việc làm','KPI M-02. Tỷ trọng 5%.',o_ly,'in_progress','high','2026-04-01','2026-06-30','seed_khhd_NS'),
    (obj,'project','H-03: Xây dựng KPI cho các vị trí việc làm','KPI M-09. Tỷ trọng 5%.',o_ly,'in_progress','high','2026-05-01','2026-06-30','seed_khhd_NS'),
    (obj,'project','H-03b: Triển khai đánh giá định kỳ & hoàn thiện hệ thống đánh giá','KPI M-10. Tỷ trọng 10%.',o_ly,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_NS'),
    (obj,'project','H-04: Triển khai tuyển dụng đáp ứng mở rộng + báo cáo tháng','KPI M-03.',o_mai,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_NS'),
    (obj,'project','H-05: Tuyển dụng đáp ứng yêu cầu & báo cáo kết quả','KPI M-04. Tỷ trọng 20%.',o_mai,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_NS'),
    (obj,'project','H-06: Quy hoạch nguồn & xây chương trình đào tạo CBNV nguồn','KPI M-08. 100% vị trí chủ chốt có danh sách nhân sự nguồn. Tỷ trọng 10%.',o_ly,'in_progress','high','2026-06-01','2026-12-31','seed_khhd_NS'),
    (obj,'project','H-07: Xây dựng hệ thống chính sách Quản trị nhân sự','KPI M-14. Tỷ trọng 10%.',o_hai,'in_progress','high','2026-03-01','2026-08-31','seed_khhd_NS'),
    (obj,'project','H-08: Chính sách đãi ngộ & khung lương các vị trí','KPI M-14. Cạnh tranh, thu hút & giữ chân. Tỷ trọng 8%.',o_hai,'in_progress','high','2026-06-01','2026-06-30','seed_khhd_NS'),
    (obj,'project','H-09: Hiệu chỉnh chính sách HH (Bán lẻ/TMĐT/B2B) & lương SX','KPI M-14. Tỷ trọng 7%.',o_ly,'in_progress','medium','2026-04-01','2026-06-30','seed_khhd_NS'),
    (obj,'project','H-10: Triển khai đồng bộ tuyển dụng/KPI/lương/thưởng trên 1Office','KPI M-15. Giảm 30% thời gian thủ tục. Tỷ trọng 7%.',o_ngoc,'in_progress','medium','2026-06-01','2026-10-31','seed_khhd_NS'),
    (obj,'project','H-11: Cập nhật đầy đủ dữ liệu nhân sự trên phần mềm','KPI M-16. 100%. Tỷ trọng 3%.',o_ngoc,'in_progress','medium','2026-06-01','2026-07-31','seed_khhd_NS'),
    (obj,'project','H-12: Chuẩn hóa onboarding & dịch vụ nhân sự tập trung','KPI M-20. Turnover thấp hơn toàn công ty. Tỷ trọng 5%.',o_hai,'in_progress','medium','2026-04-01','2026-12-31','seed_khhd_NS'),
    (obj,'project','H-13: Giữ turnover rate ở mức an toàn','KPI M-21. Tỷ trọng 5%.',o_ly,'in_progress','medium','2026-04-01','2026-12-31','seed_khhd_NS'),
    (obj,'project','H-14: Bảng kiểm tuân thủ pháp lý & kiện toàn hệ thống QTNS','KPI M-24. Tỷ trọng 5%.',o_hai,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_NS');
END $$;
COMMIT;
