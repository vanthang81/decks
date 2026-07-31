-- KHHĐ 2026 Khối SẢN XUẤT (6 KPI + 13 HĐ, PIC Ms Trang). created_by='seed_khhd_SX'
BEGIN;
DO $$
DECLARE y26 uuid; sx uuid; own text; parent uuid; obj uuid;
BEGIN
  SELECT id INTO y26 FROM okr_periods WHERE name='Năm 2026';
  SELECT id INTO sx FROM okr_units WHERE code='SX';
  SELECT id INTO parent FROM okr_objectives WHERE title='2026: Hoàn thành Kế hoạch Kinh doanh (ĐHCĐ)' AND created_by='seed_strategy' LIMIT 1;
  own := (SELECT email FROM okr_users WHERE email='lethihongtrang@baotinmanhhai.vn');
  DELETE FROM okr_objectives WHERE created_by='seed_khhd_SX';

  INSERT INTO okr_objectives(period_id,parent_id,level,unit_id,owner_email,title,description,status,okr_type,created_by)
    VALUES(y26,parent,'division',sx,own,
      '2026 — Khối Sản xuất: Vận hành ổn định, chất lượng & tối ưu chi phí',
      'Giao hàng đúng hạn 98–100%, chất lượng SP (lỗi trả về <1%), cắt giảm lãng phí/hao hụt NVL, quản trị rủi ro vận hành, cải tiến nhà máy và chuyển đổi số.',
      'active','committed','seed_khhd_SX') RETURNING id INTO obj;

  INSERT INTO okr_key_results(objective_id,title,metric_type,direction,unit_label,start_value,target_value,current_value,indicator) VALUES
    (obj,'M-01: Tỷ lệ giao hàng đúng hạn 98–100%','percent','increase','%',0,98,0,'lagging'),
    (obj,'M-02: Hàng lỗi bị trả về < 1%','percent','decrease','%',3,1,3,'lagging'),
    (obj,'M-03: Hao hụt NVL trong định mức','boolean','increase',NULL,0,1,0,'lagging'),
    (obj,'M-04: Số vụ thất thoát tài sản < 3/năm','number','decrease','vụ',5,3,5,'lagging'),
    (obj,'M-05: 12 hoạt động cải tiến nhà máy','number','increase','hoạt động',0,12,0,'leading'),
    (obj,'M-06: Số hóa/tự động hóa theo tiến độ dự án','boolean','increase',NULL,0,1,0,'leading');

  INSERT INTO okr_initiatives(objective_id,kind,title,description,owner_email,status,priority,start_on,due_on,created_by) VALUES
    (obj,'project','H-01: Sản xuất đáp ứng sản lượng bán theo KHKD','KPI M-01. Giao hàng đúng hạn 98–100%. Tỷ trọng 30%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_SX'),
    (obj,'project','H-02: Kiểm tra chất lượng nguyên liệu đầu vào (IQC)','KPI M-02. 100% NVL đầu vào được kiểm tra. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_SX'),
    (obj,'project','H-03: Kiểm soát chất lượng trên chuyền (PQC)','KPI M-02. KCS 2 công đoạn (sau đột phôi & hàn). Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_SX'),
    (obj,'project','H-04: Kiểm soát chất lượng đầu ra (OQC)','KPI M-02. Lỗi đầu ra <1%. Tỷ trọng 10%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_SX'),
    (obj,'project','H-05: Thống kê & đánh giá lỗi điển hình trong sản xuất','KPI M-03. Bảng thống kê lỗi theo nhóm SP. Tỷ trọng 10%.',own,'in_progress','medium','2026-06-01','2026-12-31','seed_khhd_SX'),
    (obj,'project','H-06: Bộ tài liệu chuẩn thao tác nghiệp vụ (15 tài liệu)','KPI M-05. 15 HD thao tác chuẩn ban hành. Tỷ trọng 5%.',own,'in_progress','medium','2026-06-01','2026-06-30','seed_khhd_SX'),
    (obj,'project','H-07: Đào tạo nâng cao tay nghề (bộ tiêu chuẩn đào tạo)','KPI M-05. Ban hành tiêu chuẩn đào tạo tay nghề thợ. Tỷ trọng 5%.',own,'in_progress','medium','2026-06-01','2026-06-30','seed_khhd_SX'),
    (obj,'project','H-08: Cải tiến quy trình sản xuất nâng sản lượng','KPI M-01. Năng suất công đoạn cải tiến +≥20%. Tỷ trọng 10%.',own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_SX'),
    (obj,'project','H-09: Kiểm soát hao hụt các công đoạn (bảng thống kê)','KPI M-03. Bảng thống kê hao hụt từng công đoạn. Tỷ trọng 5%.',own,'in_progress','medium','2026-05-01','2026-07-31','seed_khhd_SX'),
    (obj,'project','H-11: Ban hành quy định tỷ lệ hao hụt trong định mức','KPI M-03. Tỷ trọng 5%.',own,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_SX'),
    (obj,'project','H-12: Sản xuất SP thử nghiệm theo chiến dịch sản phẩm','KPI M-01. 100% SP thử nghiệm đúng thời gian. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_SX'),
    (obj,'project','H-13: Giảm rủi ro trong vận hành (an ninh nhà máy)','KPI M-04. 100% CBNV tuân thủ quy định an ninh. Tỷ trọng 5%.',own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_SX'),
    (obj,'project','H-14: Tham gia các dự án chuyển đổi số','KPI M-06. Hoàn thành theo tiến độ dự án. Tỷ trọng 5%.',own,'in_progress','medium','2026-06-01','2026-12-31','seed_khhd_SX');
END $$;
COMMIT;
