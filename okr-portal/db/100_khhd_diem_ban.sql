-- KHHĐ 2026 Khối PHÁT TRIỂN HỆ THỐNG ĐIỂM BÁN (10 KPI + 10 HĐ, PIC Hạ/Huy/Khôi). created_by='seed_khhd_DB'
BEGIN;
DO $$
DECLARE y26 uuid; db uuid; parent uuid; obj uuid; o_ha text; o_huy text; o_khoi text;
BEGIN
  SELECT id INTO y26 FROM okr_periods WHERE name='Năm 2026';
  SELECT id INTO db FROM okr_units WHERE code='DB';
  SELECT id INTO parent FROM okr_objectives WHERE title='2026: Chuẩn hóa Winning Model & review NSO' AND created_by='seed_strategy' LIMIT 1;
  o_ha := (SELECT email FROM okr_users WHERE email='nguyenkhacha@baotinmanhhai.vn');
  o_huy := (SELECT email FROM okr_users WHERE email='nguyennhathuy@baotinmanhhai.vn');
  o_khoi := (SELECT email FROM okr_users WHERE email='nguyenhoangkhoi@baotinmanhhai.vn');
  DELETE FROM okr_objectives WHERE created_by='seed_khhd_DB';

  INSERT INTO okr_objectives(period_id,parent_id,level,unit_id,owner_email,title,description,status,okr_type,created_by)
    VALUES(y26,parent,'division',db,o_ha,
      '2026 — Khối Phát triển Hệ thống Điểm bán: Mạng lưới, Winning Model & setup',
      'Quy hoạch & mở rộng mạng lưới cửa hàng có kỷ luật (mở mới 68 CH), chuẩn hóa Winning Store Model, tối ưu suất đầu tư CAPEX & payback, setup mở mới đúng SLA, cải tạo cửa hàng LFL và kiện toàn tổ chức khối.',
      'active','aspirational','seed_khhd_DB') RETURNING id INTO obj;

  INSERT INTO okr_key_results(objective_id,title,metric_type,direction,unit_label,start_value,target_value,current_value,indicator) VALUES
    (obj,'M-01: Mạng lưới cửa hàng bán lẻ (điểm quy hoạch)','number','increase','điểm',0,80,0,'lagging'),
    (obj,'M-02: Số mặt bằng bàn giao để setup mở mới','number','increase','điểm',0,100,0,'lagging'),
    (obj,'M-03: Số mô hình cửa hàng WSM đóng gói sẵn sàng scale','number','increase','mô hình',0,3,0,'lagging'),
    (obj,'M-04: Đạt Payback Period theo mô hình (Pop-up 12/Mini 24/Standard 36 tháng)','boolean','increase',NULL,0,1,0,'lagging'),
    (obj,'M-05: Tối ưu suất đầu tư CAPEX ~20%','percent','increase','%',0,20,0,'lagging'),
    (obj,'M-06: Tiến độ setup mở mới đúng SLA ≥ 80%','percent','increase','%',0,80,0,'lagging'),
    (obj,'M-07: 8 cửa hàng LFL cải tạo chuẩn WSM','number','increase','cửa hàng',0,8,0,'lagging'),
    (obj,'M-08: Hài lòng dịch vụ nội bộ (setup & bảo trì) ≥ 80%','percent','increase','%',0,80,0,'leading'),
    (obj,'M-09: Hoàn thành tài liệu 3Q của khối 100%','percent','increase','%',0,100,0,'leading'),
    (obj,'M-10: Tuyển dụng & lấp đầy định biên khối 100%','percent','increase','%',0,100,0,'leading');

  INSERT INTO okr_initiatives(objective_id,kind,title,description,owner_email,status,priority,start_on,due_on,created_by) VALUES
    (obj,'project','H-01: Quy hoạch & sizing vùng/tuyến thị trường VBĐQ','KPI M-01. Scan thị trường, ranking tỉnh/vùng/tuyến, xác định competitors & ưu tiên. Tỷ trọng 3%.',o_ha,'in_progress','high','2026-02-15','2026-03-04','seed_khhd_DB'),
    (obj,'project','H-03: Chiến lược phát triển điểm bán & bản đồ hệ thống 2026–2030','KPI M-01. Chiến lược mở rộng, cửa hàng biểu tượng, BĐS chiến lược. Tỷ trọng 5%.',o_ha,'in_progress','high','2026-03-04','2026-03-22','seed_khhd_DB'),
    (obj,'project','H-04: Quy hoạch nguồn lực tìm kiếm/thẩm định/pháp lý mặt bằng','KPI M-02. Nguồn thuê ngoài TKMB, HĐ thuê mẫu, luồng dữ liệu CTV. Tỷ trọng 5%.',o_ha,'in_progress','high','2026-03-02','2026-05-31','seed_khhd_DB'),
    (obj,'project','H-07: Tổ chức & phát triển nguồn lực triển khai (TKMB/WSM/Setup/Bảo trì)','KPI M-10. Cơ cấu tinh gọn, tuyển CORE TEAM. Tỷ trọng 10%.',o_ha,'in_progress','high','2026-03-01','2026-06-30','seed_khhd_DB'),
    (obj,'project','H-08: Chuẩn hóa tài liệu 3Q của khối PTHTĐB','KPI M-09. Quy trình/quy định/quy chế 4 chức năng. Tỷ trọng 3%.',o_ha,'in_progress','medium','2026-04-20','2026-06-15','seed_khhd_DB'),
    (obj,'project','H-11: Cải tạo cửa hàng LFL chuẩn WSM (≥8 CH)','KPI M-07. Khảo sát, đề xuất cải tạo, thực thi & nghiệm thu. Tỷ trọng 10%.',o_khoi,'in_progress','high','2026-08-01','2026-10-31','seed_khhd_DB'),
    (obj,'project','H-12: Bảo trì, bảo dưỡng trong quá trình vận hành cửa hàng','KPI M-08. KH bảo trì định kỳ, SLA với VHBL. Tỷ trọng 5%.',o_khoi,'in_progress','medium','2026-03-01','2026-12-31','seed_khhd_DB'),
    (obj,'project','H-13: Điều chỉnh quy hoạch mở mới NSO H2.2026 (68 CH)','KPI M-01. HN 19CH, HCM 32CH, 13CH tỉnh miền Bắc; Standard/Mini 60/40. Tỷ trọng 5%.',o_huy,'in_progress','high','2026-06-29','2026-07-31','seed_khhd_DB'),
    (obj,'project','H-14: Chiến dịch tối ưu chi phí CAPEX đầu tư xây dựng','KPI M-05. Tối ưu leadtime, chi phí xây dựng/mô hình, vật liệu chuẩn hóa. Tỷ trọng 5%.',o_ha,'in_progress','high','2026-07-01','2026-11-30','seed_khhd_DB'),
    (obj,'project','H-15: Dự án mua BĐS bổ sung phương án nguồn vốn','KPI M-01. Phối hợp TCKT & Pháp chế mua BĐS (văn phòng/cửa hàng/đầu tư). Tỷ trọng 2%.',o_ha,'in_progress','medium','2026-07-01','2026-09-30','seed_khhd_DB');
END $$;
COMMIT;
