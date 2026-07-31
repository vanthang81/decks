-- KHHĐ 2026 Khối PC&KSTT — 2 phòng: Pháp chế (Mr Quang) + KSTT (Ms Xuân Anh).
-- created_by='seed_khhd_PCPC' / 'seed_khhd_PCKS'
BEGIN;
DO $$
DECLARE y26 uuid; pc uuid; parent uuid; obj uuid; o_quang text; o_xa text;
BEGIN
  SELECT id INTO y26 FROM okr_periods WHERE name='Năm 2026';
  SELECT id INTO pc FROM okr_units WHERE code='PC';
  SELECT id INTO parent FROM okr_objectives WHERE title='2026: Chuẩn bị nền tảng IPO (niêm yết Q1/2027)' AND created_by='seed_strategy' LIMIT 1;
  o_quang := (SELECT email FROM okr_users WHERE email='luongngocquang@baotinmanhhai.vn');
  o_xa := (SELECT email FROM okr_users WHERE email='tranthixuananh@baotinmanhhai.vn');
  DELETE FROM okr_objectives WHERE created_by IN ('seed_khhd_PCPC','seed_khhd_PCKS');

  -- Phòng Pháp chế
  INSERT INTO okr_objectives(period_id,parent_id,level,unit_id,owner_email,title,description,status,okr_type,created_by)
    VALUES(y26,parent,'division',pc,o_quang,
      '2026 — Phòng Pháp chế: Tuân thủ pháp lý & dự án pháp lý trọng điểm (IPO)',
      'Tuân thủ pháp lý hợp đồng cửa hàng mới, quản trị rủi ro pháp lý & vụ việc, SLA hỗ trợ pháp lý nội bộ, hoàn thành dự án pháp lý trọng điểm 2026 (IPO, VSDC, dữ liệu cá nhân).',
      'active','committed','seed_khhd_PCPC') RETURNING id INTO obj;
  INSERT INTO okr_key_results(objective_id,title,metric_type,direction,unit_label,start_value,target_value,current_value,indicator) VALUES
    (obj,'M-01: Tuân thủ pháp lý hợp đồng cửa hàng mới 100%','percent','increase','%',0,100,0,'lagging'),
    (obj,'M-02: Vụ việc pháp lý được giải quyết ≥ 90%','percent','increase','%',0,90,0,'lagging'),
    (obj,'M-03: Hoàn thành SLA hỗ trợ pháp lý ≥ 90%','percent','increase','%',0,90,0,'lagging'),
    (obj,'M-04: Hoàn thành dự án pháp lý trọng điểm 2026 ≥ 95%','percent','increase','%',0,95,0,'lagging');
  INSERT INTO okr_initiatives(objective_id,kind,title,description,owner_email,status,priority,start_on,due_on,created_by) VALUES
    (obj,'project','H-01: Checklist pháp lý & thẩm định 100% hồ sơ mở mới cửa hàng','KPI M-01. Mẫu HĐ thuê chuẩn, hậu kiểm ≥2 lần/năm, dashboard phê duyệt. OKR ≥98% đúng quy trình. Tỷ trọng 20%.',o_quang,'in_progress','high','2026-03-01','2026-04-10','seed_khhd_PCPC'),
    (obj,'project','H-02: Quản trị rủi ro pháp lý & xử lý vụ việc','KPI M-02. Phân loại rủi ro & SLA, họp đánh giá tháng, báo cáo BĐH. OKR ≥95% đúng hạn. Tỷ trọng 30%.',o_quang,'in_progress','high','2026-04-01','2026-07-31','seed_khhd_PCPC'),
    (obj,'project','H-03: Chuẩn hóa SLA & hệ thống ticket hỗ trợ pháp lý nội bộ','KPI M-03. Đo thời gian phản hồi, khảo sát hài lòng quý. OKR ≥95% đúng cam kết. Tỷ trọng 30%.',o_quang,'in_progress','medium','2026-04-01','2026-07-31','seed_khhd_PCPC'),
    (obj,'project','H-04: Quản lý dự án pháp lý trọng điểm 2026 (IPO/VSDC/dữ liệu cá nhân)','KPI M-04. Kế hoạch chi tiết, theo dõi tháng, báo cáo BTGĐ quý. OKR hoàn thành ≥90%. Tỷ trọng 20%.',o_quang,'in_progress','high','2026-05-01','2026-12-31','seed_khhd_PCPC');

  -- Phòng KSTT
  INSERT INTO okr_objectives(period_id,parent_id,level,unit_id,owner_email,title,description,status,okr_type,created_by)
    VALUES(y26,parent,'division',pc,o_xa,
      '2026 — Phòng Kiểm soát tuân thủ: Khung KSTT & kiểm soát toàn hệ thống',
      'Kiện toàn hệ thống văn bản nội bộ 3Q, xây dựng bộ khung KSTT, triển khai kiểm soát tuân thủ khối cửa hàng & phòng ban, đào tạo nâng cao nhận thức tuân thủ.',
      'active','committed','seed_khhd_PCKS') RETURNING id INTO obj;
  INSERT INTO okr_key_results(objective_id,title,metric_type,direction,unit_label,start_value,target_value,current_value,indicator) VALUES
    (obj,'M-01: Kiện toàn hệ thống văn bản nội bộ 3Q 100% (hạn 31/07)','percent','increase','%',0,100,0,'lagging'),
    (obj,'M-02: Hoàn thành bộ khung KSTT 100% (hạn 31/07)','percent','increase','%',0,100,0,'lagging'),
    (obj,'M-03: Hoàn thành các đợt KSTT theo kế hoạch tháng 100%','percent','increase','%',0,100,0,'lagging'),
    (obj,'M-04: Triển khai đào tạo KSTT theo yêu cầu 100%','percent','increase','%',0,100,0,'leading');
  INSERT INTO okr_initiatives(objective_id,kind,title,description,owner_email,status,priority,start_on,due_on,created_by) VALUES
    (obj,'project','H-01: Xây dựng Thư viện tài liệu thông tin toàn công ty','KPI M-01. Chuẩn hóa cấu trúc VB, phân quyền, quy định quản lý. Tỷ trọng 5%.',o_xa,'in_progress','medium','2026-03-01','2026-04-10','seed_khhd_PCKS'),
    (obj,'project','H-02: Chuẩn hóa 3Q — rà soát toàn bộ quy trình/quy định','KPI M-01. 100% tài liệu hiện hành được rà soát. Tỷ trọng 5%.',o_xa,'in_progress','medium','2026-04-01','2026-07-31','seed_khhd_PCKS'),
    (obj,'project','H-03: Xây dựng bộ khung KSTT (quy chế/quy trình/checklist/rủi ro)','KPI M-02. Checklist KSTT cửa hàng + báo cáo rủi ro theo khối/phòng. Tỷ trọng 10%.',o_xa,'in_progress','high','2026-04-01','2026-07-31','seed_khhd_PCKS'),
    (obj,'project','H-04: Kiểm soát tuân thủ khối cửa hàng','KPI M-03. KH kiểm tra định kỳ, checklist tuân thủ, CSDL vi phạm. Tỷ trọng 40%.',o_xa,'in_progress','high','2026-05-01','2026-12-31','seed_khhd_PCKS'),
    (obj,'project','H-05: Kiểm soát tuân thủ các khối phòng ban','KPI M-03. Kiểm tra theo chuyên đề, đánh giá tuân thủ quy trình. Tỷ trọng 30%.',o_xa,'in_progress','high','2026-06-01','2026-12-31','seed_khhd_PCKS'),
    (obj,'project','H-06: Đào tạo & truyền thông nội bộ về tuân thủ','KPI M-04. Tài liệu đào tạo, kỷ yếu tuân thủ hàng tháng. Tỷ trọng 10%.',o_xa,'in_progress','medium','2026-05-01','2026-12-31','seed_khhd_PCKS');
END $$;
COMMIT;
