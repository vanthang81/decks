-- KHHĐ 2026 Khối KẾ HOẠCH & QLDA (14 KPI + 25 HĐ, PIC Mr Thắng, đơn vị TC-KH). created_by='seed_khhd_KH'
BEGIN;
DO $$
DECLARE y26 uuid; u uuid; parent uuid; obj uuid; own text;
BEGIN
  SELECT id INTO y26 FROM okr_periods WHERE name='Năm 2026';
  SELECT id INTO u FROM okr_units WHERE code='TC-KH';
  SELECT id INTO parent FROM okr_objectives WHERE title='2026: Hoàn thành Kế hoạch Kinh doanh (ĐHCĐ)' AND created_by='seed_strategy' LIMIT 1;
  own := (SELECT email FROM okr_users WHERE email='nguyenvanthang@baotinmanhhai.vn');
  DELETE FROM okr_objectives WHERE created_by='seed_khhd_KH';

  INSERT INTO okr_objectives(period_id,parent_id,level,unit_id,owner_email,title,description,status,okr_type,created_by)
    VALUES(y26,parent,'department',u,own,
      '2026 — Phòng Kế hoạch & QLDA (Khối Tài chính): Chuẩn hóa kế hoạch, kiểm soát thực thi & PMO',
      'Chuẩn hóa hệ thống lập kế hoạch & KPI (cascade), kiểm soát thực thi chiến lược (IBP/MBR/Action Tracker), quản trị danh mục dự án chiến lược (PMO), phân tích chiến lược & dashboard hỗ trợ ra quyết định.',
      'active','committed','seed_khhd_KH') RETURNING id INTO obj;

  INSERT INTO okr_key_results(objective_id,title,metric_type,direction,unit_label,start_value,target_value,current_value,indicator) VALUES
    (obj,'M-01: 100% đơn vị có KHHĐ chuẩn hóa','percent','increase','%',0,100,0,'lagging'),
    (obj,'M-02: 100% KPI phòng ban được cascade đầy đủ','percent','increase','%',0,100,0,'lagging'),
    (obj,'M-03: Forecast Accuracy doanh thu (độ lệch ≤30%)','percent','decrease','%',50,30,50,'lagging'),
    (obj,'M-04: 100% Monthly Review tổ chức đúng kế hoạch','percent','increase','%',0,100,0,'lagging'),
    (obj,'M-05: Action sau họp hoàn thành đúng hạn ≥85%','percent','increase','%',0,85,0,'lagging'),
    (obj,'M-06: Kế hoạch trọng điểm hoàn thành đúng tiến độ ≥85%','percent','increase','%',0,85,0,'lagging'),
    (obj,'M-07: Ban hành Quy chế hoạt động Phòng QLDA 100%','percent','increase','%',0,100,0,'leading'),
    (obj,'M-08: Dự án chiến lược đúng tiến độ & ngân sách ≥85%','percent','increase','%',0,85,0,'lagging'),
    (obj,'M-09: 100% dự án có đánh giá hiệu quả sau triển khai','percent','increase','%',0,100,0,'lagging'),
    (obj,'M-10: Dashboard chiến lược V1 go-live (trước 31/05)','boolean','increase',NULL,0,1,0,'lagging'),
    (obj,'M-11: ≥1 báo cáo chiến lược/tháng cho BLĐ','percent','increase','%',0,100,0,'leading'),
    (obj,'M-12: 80% các Khối có dashboard quản trị tự động','percent','increase','%',0,80,0,'lagging'),
    (obj,'M-13: Hoàn thành tài liệu 3Q khối KH&QLDA ≥80%','percent','increase','%',0,80,0,'leading'),
    (obj,'M-14: Tuyển dụng & lấp đầy định biên khối ≥80%','percent','increase','%',0,80,0,'leading');

  INSERT INTO okr_initiatives(objective_id,kind,title,description,owner_email,status,priority,start_on,due_on,created_by) VALUES
    (obj,'project','H-01: Ban hành bộ quy trình kế hoạch thống nhất toàn công ty','KPI M-01. Tỷ trọng 2,86%.',own,'in_progress','high','2026-01-01','2026-05-31','seed_khhd_KH'),
    (obj,'project','H-02: Xây dựng luồng họp Monthly IBP giữa các khối phòng ban','KPI M-01. Họp D28 hàng tháng. Tỷ trọng 2,86%.',own,'in_progress','high','2026-03-01','2026-12-31','seed_khhd_KH'),
    (obj,'project','H-03: Chuẩn hóa mẫu KHHĐ, KPI năm & dashboard theo dõi','KPI M-01. Template chung. Tỷ trọng 2,86%.',own,'in_progress','high','2026-01-01','2026-07-31','seed_khhd_KH'),
    (obj,'project','H-04: Thiết lập hệ thống Cascade KPI & KHHĐ','KPI M-02. Liên kết chiến lược → đơn vị thực thi. Tỷ trọng 2,86%.',own,'in_progress','high','2026-06-01','2026-07-31','seed_khhd_KH'),
    (obj,'project','H-05: Theo dõi & đánh giá KPI/KHHĐ các khối phòng ban','KPI M-02. Thẩm định KHHĐ/KPI tháng. Tỷ trọng 2,86%.',own,'in_progress','medium','2026-06-01','2026-07-31','seed_khhd_KH'),
    (obj,'project','H-06: Dashboard theo dõi tiến độ (RAG, cập nhật tuần)','KPI M-02. Tỷ trọng 2,86%.',own,'in_progress','medium','2026-06-01','2026-06-30','seed_khhd_KH'),
    (obj,'project','H-07: Mô hình Forecast chuẩn doanh thu từng khối KD','KPI M-03. Độ lệch ≤10%. Tỷ trọng 2,86%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_KH'),
    (obj,'project','H-08: Vận hành cơ chế Monthly IBP Meeting toàn công ty','KPI M-04. 100% đúng lịch; biên bản & action log trong 24h. Tỷ trọng 6,67%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_KH'),
    (obj,'project','H-09: Hệ thống Action Tracker sau họp điều hành','KPI M-05. ≥90% action cập nhật tuần & đúng hạn. Tỷ trọng 6,67%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_KH'),
    (obj,'project','H-10: Kiểm soát thực thi danh mục kế hoạch & dự án trọng điểm','KPI M-06. ≥90% đúng tiến độ; ≥85% KPI chiến lược đạt. Tỷ trọng 6,67%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_KH'),
    (obj,'project','H-11: Ban hành Quy chế/Quy trình/Quy định Phòng QLDA','KPI M-07. Tỷ trọng 2,86%.',own,'in_progress','medium','2026-01-01','2026-06-30','seed_khhd_KH'),
    (obj,'project','H-12: Ban hành bộ tài liệu quản trị PMO (Master Plan/RACI/Tracking)','KPI M-07. Tỷ trọng 2,86%.',own,'in_progress','medium','2026-01-01','2026-06-30','seed_khhd_KH'),
    (obj,'project','H-13: Xây dựng danh mục dự án chiến lược toàn công ty','KPI M-08. 100% dự án đăng ký/phân loại trong Portfolio PMO. Tỷ trọng 2,86%.',own,'in_progress','high','2026-01-01','2026-05-31','seed_khhd_KH'),
    (obj,'project','H-14: Hệ thống quản trị tập trung danh mục dự án','KPI M-08. ≥90% dự án cập nhật tiến độ định kỳ. Tỷ trọng 2,86%.',own,'in_progress','medium','2026-01-01','2026-06-30','seed_khhd_KH'),
    (obj,'project','H-15: Vận hành cơ chế Project Review định kỳ','KPI M-08. 100% kỳ review theo lịch. Tỷ trọng 2,86%.',own,'in_progress','medium','2026-01-01','2026-06-30','seed_khhd_KH'),
    (obj,'project','H-16: Cơ chế đánh giá hiệu quả dự án (PIR)','KPI M-09. Bộ tiêu chí PIR ban hành. Tỷ trọng 2,86%.',own,'in_progress','medium','2026-01-01','2026-06-30','seed_khhd_KH'),
    (obj,'project','H-17: Đánh giá hiệu quả dự án chiến lược sau triển khai','KPI M-09. ≥90% dự án có báo cáo & bài học. Tỷ trọng 2,86%.',own,'in_progress','medium','2026-01-01','2026-06-30','seed_khhd_KH'),
    (obj,'project','H-18: Chuẩn hóa hệ thống dữ liệu quản trị (Data Dictionary)','KPI M-10. Chuẩn hóa KD/TC/SX/NS. Tỷ trọng 5%.',own,'in_progress','high','2026-01-01','2026-07-31','seed_khhd_KH'),
    (obj,'project','H-19: Xây dựng Dashboard CEO Level V1 (go-live trước 31/05)','KPI M-10. KPI doanh thu/lợi nhuận/cửa hàng. Tỷ trọng 5%.',own,'in_progress','high','2026-05-01','2026-05-31','seed_khhd_KH'),
    (obj,'project','H-20: Phối hợp Tài chính xây dự báo PNL tháng/quý/năm','KPI M-11. ≥1 báo cáo/tháng. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_KH'),
    (obj,'project','H-21: Hệ thống Dashboard quản trị cho các khối','KPI M-12. 100% khối có dashboard cập nhật tự động. Tỷ trọng 5%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_KH'),
    (obj,'project','H-22: Bộ tài liệu quản trị vận hành Phòng Kế hoạch (3Q)','KPI M-13. 100% trước 30/06. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-07-31','seed_khhd_KH'),
    (obj,'project','H-23: Tuyển dụng & hoàn thiện cơ cấu Phòng Kế hoạch','KPI M-14. 100% định biên trước 30/06. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-06-30','seed_khhd_KH'),
    (obj,'project','H-24: Bộ tài liệu quản trị PMO (3Q)','KPI M-13. 100% trước 30/06. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-06-30','seed_khhd_KH'),
    (obj,'project','H-25: Tuyển dụng & hoàn thiện cơ cấu Phòng QLDA','KPI M-14. 100% định biên trước 30/06. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-06-30','seed_khhd_KH');
END $$;
COMMIT;
