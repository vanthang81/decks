-- KHHĐ 2026 Khối DỊCH VỤ VẬN HÀNH NỘI BỘ (15 KPI + 15 HĐ; PIC Ms Phượng/Ms Thu). created_by='seed_khhd_VH'
BEGIN;
DO $$
DECLARE y26 uuid; vh uuid; parent uuid; obj uuid; own text; o_ph text; o_thu text;
BEGIN
  SELECT id INTO y26 FROM okr_periods WHERE name='Năm 2026';
  SELECT id INTO vh FROM okr_units WHERE code='VH';
  SELECT id INTO parent FROM okr_objectives WHERE title='2026: Kiện toàn tổ chức & năng lực đội ngũ' AND created_by='seed_strategy' LIMIT 1;
  own := (SELECT email FROM okr_users WHERE email='tranxuanhai@baotinmanhhai.vn');
  o_ph := (SELECT email FROM okr_users WHERE email='nguyenthiphuong@baotinmanhhai.vn');
  o_thu := (SELECT email FROM okr_users WHERE email='hoangthithu@baotinmanhhai.vn');
  DELETE FROM okr_objectives WHERE created_by='seed_khhd_VH';

  INSERT INTO okr_objectives(period_id,parent_id,level,unit_id,owner_email,title,description,status,okr_type,created_by)
    VALUES(y26,parent,'division',vh,own,
      '2026 — Khối Dịch vụ Vận hành nội bộ: Cung ứng nội bộ & Hành chính quản trị',
      'Vận hành cung ứng nội bộ (DIFOT, SLA, tối ưu chi phí mua hàng, quản trị NCC, mua sắm mở mới) và hành chính quản trị (cấp phát CCDC, văn thư, hậu cần, tài sản-kho, CSVC, chuẩn hóa 3Q, thanh toán).',
      'active','committed','seed_khhd_VH') RETURNING id INTO obj;

  INSERT INTO okr_key_results(objective_id,title,metric_type,direction,unit_label,start_value,target_value,current_value,indicator) VALUES
    (obj,'M-01: DIFOT giao hàng nội bộ ≥ 95%','percent','increase','%',0,95,0,'lagging'),
    (obj,'M-02: Tuân thủ SLA theo nhóm yêu cầu ≥ 90%','percent','increase','%',0,90,0,'lagging'),
    (obj,'M-03: Tối ưu chi phí mua hàng ≥ 5%','boolean','increase',NULL,0,1,0,'lagging'),
    (obj,'M-04: CSAT nội bộ ≥ 90%','percent','increase','%',0,90,0,'lagging'),
    (obj,'M-05: NCC đạt loại A ≥ 80%','percent','increase','%',0,80,0,'lagging'),
    (obj,'M-06: Mua sắm & bàn giao cửa hàng mới đúng tiến độ 100%','percent','increase','%',0,100,0,'lagging'),
    (obj,'M-07: Hồ sơ thanh toán CUNB đúng hạn ≥ 98%','percent','increase','%',0,98,0,'lagging'),
    (obj,'M-08: ≥1 sáng kiến/dự án số hóa triển khai thành công','number','increase','sáng kiến',0,1,0,'leading'),
    (obj,'M-09: Cấp phát CCDC đúng hạn ≥ 95%','percent','increase','%',0,95,0,'lagging'),
    (obj,'M-10: Văn thư lưu trữ đúng quy định 100%','percent','increase','%',0,100,0,'lagging'),
    (obj,'M-11: Hậu cần đáp ứng SLA ≥ 98%','percent','increase','%',0,98,0,'lagging'),
    (obj,'M-12: Quản lý tài sản - kho đúng quy định ≥ 98%','percent','increase','%',0,98,0,'lagging'),
    (obj,'M-13: Vận hành văn phòng - CSVC đúng hạn ≥ 95%','percent','increase','%',0,95,0,'lagging'),
    (obj,'M-14: Quản trị HCQT & xây dựng 3Q 100%','percent','increase','%',0,100,0,'leading'),
    (obj,'M-15: Hồ sơ thanh toán HCQT đúng hạn ≥ 98%','percent','increase','%',0,98,0,'lagging');

  INSERT INTO okr_initiatives(objective_id,kind,title,description,owner_email,status,priority,start_on,due_on,created_by) VALUES
    (obj,'project','H-01: Chuẩn hóa SLA giao hàng, phân loại NCC & theo dõi PO quá hạn','KPI M-01. SLA theo nhóm hàng/NCC, phân loại A/B/C, review PO chậm tuần. Tỷ trọng 20%.',o_ph,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_VH'),
    (obj,'project','H-02: Ban hành SLA & cảnh báo PR quá hạn','KPI M-02. Chuẩn hóa quy trình cung ứng, review PR tuần. Tỷ trọng 15%.',o_ph,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_VH'),
    (obj,'project','H-03: Tối ưu chi phí mua hàng (đàm phán giá, mua tập trung, giá chuẩn CCDC)','KPI M-03. Tỷ trọng 20%.',o_ph,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_VH'),
    (obj,'project','H-04: Khảo sát hài lòng nội bộ & cơ chế xử lý khiếu nại','KPI M-04. Tỷ trọng 6%.',o_ph,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_VH'),
    (obj,'project','H-05: Quản trị NCC (tiêu chí đánh giá, đánh giá quý, NCC backup)','KPI M-05. Tỷ trọng 13%.',o_ph,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_VH'),
    (obj,'project','H-06: Chuẩn hóa checklist & theo dõi tiến độ mở mới','KPI M-06. Họp tiến độ mở mới tuần. Tỷ trọng 10%.',o_ph,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_VH'),
    (obj,'project','H-07: Theo dõi & báo cáo chi phí mua sắm định kỳ','KPI M-07. Tỷ trọng 8%.',o_ph,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_VH'),
    (obj,'project','H-08: Tự động hóa báo cáo mua hàng & sáng kiến cải tiến','KPI M-08. Tỷ trọng 8%.',o_ph,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_VH'),
    (obj,'project','H-09: Chuẩn hóa mua sắm, cấp phát & kiểm soát tồn kho','KPI M-09. Rút ngắn thời gian xử lý yêu cầu. Tỷ trọng 15%.',o_thu,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_VH'),
    (obj,'project','H-10: Chuẩn hóa văn thư, lưu trữ & số hóa hồ sơ','KPI M-10. Hồ sơ quản lý khoa học, giảm thất lạc. Tỷ trọng 15%.',o_thu,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_VH'),
    (obj,'project','H-11: Nâng cao chất lượng dịch vụ hành chính & trải nghiệm nội bộ','KPI M-11. Tỷ trọng 15%.',o_thu,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_VH'),
    (obj,'project','H-12: Chuẩn hóa dữ liệu tài sản & nâng hiệu quả quản lý kho','KPI M-12. Dán tem đầy đủ, giảm thất thoát. Tỷ trọng 15%.',o_thu,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_VH'),
    (obj,'project','H-13: Nâng cao chất lượng vận hành CSVC & môi trường làm việc','KPI M-13. Giảm sự cố phát sinh. Tỷ trọng 15%.',o_thu,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_VH'),
    (obj,'project','H-14: Hoàn thiện hệ thống quy trình/quy định/biểu mẫu HCQT','KPI M-14. Chuẩn hóa quản trị & tuân thủ. Tỷ trọng 15%.',o_thu,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_VH'),
    (obj,'project','H-15: Tối ưu quản lý chi phí & thanh toán hành chính','KPI M-15. Kiểm soát ngân sách, thanh toán đúng hạn. Tỷ trọng 10%.',o_thu,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_VH');
END $$;
COMMIT;
