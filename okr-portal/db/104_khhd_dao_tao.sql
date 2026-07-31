-- KHHĐ 2026 Khối ĐÀO TẠO & PTVH (22 KPI + 48 HĐ). created_by='seed_khhd_DT'
-- owner khối = H.Dung; đào tạo/quản trị → Nguyệt (Phòng Đào tạo); TTNB/PTVH/MLTV → H.Dung.
BEGIN;
DO $$
DECLARE y26 uuid; dt uuid; parent uuid; obj uuid; o_dung text; o_ng text;
BEGIN
  SELECT id INTO y26 FROM okr_periods WHERE name='Năm 2026';
  SELECT id INTO dt FROM okr_units WHERE code='DT';
  SELECT id INTO parent FROM okr_objectives WHERE title='2026: Kiện toàn tổ chức & năng lực đội ngũ' AND created_by='seed_strategy' LIMIT 1;
  o_dung := (SELECT email FROM okr_users WHERE email='phanthihongdung@baotinmanhhai.vn');
  o_ng := (SELECT email FROM okr_users WHERE email='nguyenthianhnguyet@baotinmanhhai.vn');
  DELETE FROM okr_objectives WHERE created_by='seed_khhd_DT';

  INSERT INTO okr_objectives(period_id,parent_id,level,unit_id,owner_email,title,description,status,okr_type,created_by)
    VALUES(y26,parent,'division',dt,o_dung,
      '2026 — Khối Đào tạo & PTVH: Chất lượng nhân sự, văn hóa & dịch vụ khách hàng',
      'Onboarding & chuẩn hóa năng lực nhân sự (VP/CH/NM), phát triển CBLĐ/CBQL (Mini MBA, tạo nguồn QLKV/CHT, GVNB), truyền thông nội bộ, hoạt động PTVH & gắn kết, chất lượng DVKH, và quản trị học liệu/LMS.',
      'active','committed','seed_khhd_DT') RETURNING id INTO obj;

  INSERT INTO okr_key_results(objective_id,title,metric_type,direction,unit_label,start_value,target_value,current_value,indicator) VALUES
    (obj,'M-01: OB NSM Văn phòng đạt chuẩn ≥ 90%','percent','increase','%',0,90,0,'lagging'),
    (obj,'M-02: OB NSM Cửa hàng đạt chuẩn ≥ 80%','percent','increase','%',0,80,0,'lagging'),
    (obj,'M-03: OB NSM Nhà máy (thợ) đạt chuẩn ≥ 80%','percent','increase','%',0,80,0,'lagging'),
    (obj,'M-04: CBLĐ đạt chuẩn năng lực sau Mini MBA ≥ 60%','percent','increase','%',0,60,0,'lagging'),
    (obj,'M-05: CBQL (C3-5) đạt 3 năng lực ưu tiên ≥ 70%','percent','increase','%',0,70,0,'lagging'),
    (obj,'M-06: Học viên nguồn QLKV sẵn sàng bổ nhiệm ≥ 60%','percent','increase','%',0,60,0,'lagging'),
    (obj,'M-07: GVNB đạt chuẩn sau TTT ≥ 60%','percent','increase','%',0,60,0,'lagging'),
    (obj,'M-08: GVNB đứng lớp đánh giá ≥ 4,5/5 (đạt ≥80%)','percent','increase','%',0,80,0,'lagging'),
    (obj,'M-09: CBNV Văn phòng đạt chuẩn 3 năng lực ≥ 80%','percent','increase','%',0,80,0,'lagging'),
    (obj,'M-10: CBNV Cửa hàng đạt chuẩn 3 năng lực ≥ 70%','percent','increase','%',0,70,0,'lagging'),
    (obj,'M-11: CBNV Nhà máy đạt chuẩn 3 năng lực ≥ 70%','percent','increase','%',0,70,0,'lagging'),
    (obj,'M-12: Hoàn thiện & vận hành hệ kênh/tuyến TTNB ≥ 85%','percent','increase','%',0,85,0,'lagging'),
    (obj,'M-13: CBNV tiếp cận/hiểu/hữu ích nội dung TTNB ≥ 80%','percent','increase','%',0,80,0,'lagging'),
    (obj,'M-14: CBNV tham gia & đánh giá tích cực PTVH & gắn kết ≥ 80%','percent','increase','%',0,80,0,'lagging'),
    (obj,'M-15: CBNV tham gia & đánh giá tích cực sự kiện lớn ≥ 90%','percent','increase','%',0,90,0,'lagging'),
    (obj,'M-16: Hoàn thành KPI chiến dịch thi đua ≥ 80%','percent','increase','%',0,80,0,'lagging'),
    (obj,'M-17: Điểm hài lòng MTLV (ESPS) ≥ 70%','percent','increase','%',0,70,0,'lagging'),
    (obj,'M-18: CBNV đạt chuẩn DVKH BTMH ≥ 80%','percent','increase','%',0,80,0,'lagging'),
    (obj,'M-19: Điểm NPS/CSAT khách hàng ≥ 90%','percent','increase','%',0,90,0,'lagging'),
    (obj,'M-20: Tài liệu đào tạo hoàn thành & phê duyệt ≥ 80%','percent','increase','%',0,80,0,'lagging'),
    (obj,'M-21: CBNV hài lòng chương trình & LMS ≥ 90%','percent','increase','%',0,90,0,'lagging'),
    (obj,'M-22: Hoàn thành KHHĐ tháng/quý/năm ≥ 95%','percent','increase','%',0,95,0,'lagging');

  INSERT INTO okr_initiatives(objective_id,kind,title,description,owner_email,status,priority,start_on,due_on,created_by) VALUES
    (obj,'project','NSM.1: OB NSM Văn phòng (CT & NM)','KPI M-01. Tỷ trọng 2,08%.',o_ng,'in_progress','high','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','NSM.2: Chương trình OB_CHT','KPI M-02. Điểm đánh giá ≥4,7/5. Tỷ trọng 2,08%.',o_ng,'in_progress','medium','2026-08-01','2026-09-30','seed_khhd_DT'),
    (obj,'project','NSM.3: Đánh giá năng lực CHT sau OB','KPI M-02. Tỷ trọng 2,08%.',o_ng,'in_progress','medium','2026-08-01','2026-09-30','seed_khhd_DT'),
    (obj,'project','NSM.4: OB TVV (Cửa hàng)','KPI M-02. Tỷ trọng 2,08%.',o_ng,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','NSM.5: OB Thợ Nhà máy','KPI M-03. Tỷ trọng 2,08%.',o_ng,'in_progress','medium','2026-09-01','2026-11-30','seed_khhd_DT'),
    (obj,'project','NSHH.1: Triển khai Mini MBA cho CBLĐ','KPI M-04. Tỷ trọng 2,08%.',o_ng,'in_progress','high','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','NSHH.2: Coaching IDP cho CBLĐ','KPI M-04. CBLĐ hoàn thành ≥1 dự án IDP. Tỷ trọng 2,08%.',o_ng,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','NSHH.3: Chương trình phát triển CBQL (C3-5)','KPI M-05. Tỷ trọng 2,08%.',o_ng,'in_progress','high','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','NSHH.4: Study Tour CBQL','KPI M-05. Đánh giá ≥4,7/5. Tỷ trọng 2,08%.',o_ng,'in_progress','medium','2026-07-01','2026-09-01','seed_khhd_DT'),
    (obj,'project','NSHH.5: Chương trình tạo nguồn QLKV','KPI M-06. Điểm ≥4,7/5. Tỷ trọng 2,08%.',o_ng,'in_progress','high','2026-07-01','2026-11-16','seed_khhd_DT'),
    (obj,'project','NSHH.6: Chương trình bổ nhiệm thách thức QLKV','KPI M-06. Tỷ trọng 2,08%.',o_ng,'in_progress','medium','2026-07-01','2026-10-12','seed_khhd_DT'),
    (obj,'project','NSHH.7: Train The Trainer (TTT)','KPI M-07. Đạt chuẩn GVNB. Tỷ trọng 2,08%.',o_ng,'in_progress','high','2026-07-01','2026-08-17','seed_khhd_DT'),
    (obj,'project','NSHH.8: Vận hành đội ngũ GVNB','KPI M-08. Điểm ≥4,7/5. Tỷ trọng 2,08%.',o_ng,'in_progress','medium','2026-07-01','2026-12-01','seed_khhd_DT'),
    (obj,'project','NSHH.9: Training Camp GVNB','KPI M-08. Đánh giá ≥4,8/5. Tỷ trọng 2,08%.',o_ng,'in_progress','medium','2026-07-01','2026-09-30','seed_khhd_DT'),
    (obj,'project','NSHH.10: Chuẩn hóa đội ngũ VP — cập nhật năng lực','KPI M-09. Tỷ trọng 2,08%.',o_ng,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','NSHH.11: Chuẩn hóa đội ngũ VP — củng cố năng lực','KPI M-09. Tỷ trọng 2,08%.',o_ng,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','NSHH.12: Chuẩn hóa đội ngũ CH — cập nhật năng lực','KPI M-10. Tỷ trọng 2,08%.',o_ng,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','NSHH.13: Chuẩn hóa đội ngũ CH — củng cố năng lực','KPI M-10. Tỷ trọng 2,08%.',o_ng,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','NSHH.14: Chuẩn hóa đội ngũ NM — cập nhật năng lực','KPI M-11. Tỷ trọng 2,08%.',o_ng,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','NSHH.15: Chuẩn hóa đội ngũ NM — củng cố năng lực','KPI M-11. Tỷ trọng 2,08%.',o_ng,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','TTNB.1: Quy hoạch hệ thống TTNB','KPI M-12. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','TTNB.2: Vận hành hệ thống kênh TTNB','KPI M-12. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','TTNB.3: Vận hành tuyến "Dẫn đường"','KPI M-13. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','TTNB.4: Vận hành tuyến "Nhịp đập thị trường"','KPI M-13. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','TTNB.5: Vận hành tuyến "Quản trị xuất sắc"','KPI M-13. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','TTNB.6: Vận hành tuyến "Người BTMH"','KPI M-13. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','PTVH.1: Hoạt động CLB Văn thể mỹ','KPI M-14. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','PTVH.2: Hoạt động gắn kết định kỳ','KPI M-14. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','PTVH.3: Chương trình Nghỉ hè HST','KPI M-15. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-07-01','2026-07-31','seed_khhd_DT'),
    (obj,'project','PTVH.4: Sinh nhật Công ty/Tập đoàn','KPI M-15. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-07-01','2026-11-14','seed_khhd_DT'),
    (obj,'project','PTVH.5: Chiến dịch nâng cao hiệu quả KD & VH','KPI M-16. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','MLTV.1: Khảo sát hài lòng MTLV','KPI M-17. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','DVKH.1: Xây dựng & chuẩn hóa tài liệu DVKH','KPI M-18. Tỷ trọng 2,08%.',o_ng,'in_progress','medium','2026-07-01','2026-07-30','seed_khhd_DT'),
    (obj,'project','DVKH.2: Chuẩn hóa năng lực DVKH','KPI M-18. Tỷ trọng 2,08%.',o_ng,'in_progress','medium','2026-07-01','2026-09-30','seed_khhd_DT'),
    (obj,'project','DVKH.3: Đánh giá tác động đào tạo tới trải nghiệm KH','KPI M-19. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','QT.1: Quy hoạch danh mục học liệu 2026','KPI M-20. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-06-04','2026-12-31','seed_khhd_DT'),
    (obj,'project','QT.2: Bộ học liệu OB_VP','KPI M-20. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-07-01','2026-08-31','seed_khhd_DT'),
    (obj,'project','QT.3: Bộ học liệu OB_CHT','KPI M-20. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','QT.4: Bộ học liệu OB_TVV','KPI M-20. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','QT.5: Bộ học liệu OB_NM','KPI M-20. Tỷ trọng 2,08%.',o_ng,'in_progress','medium','2026-07-01','2026-07-31','seed_khhd_DT'),
    (obj,'project','QT.6: Bộ học liệu Mini MBA (CBLĐ C5+)','KPI M-20. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-07-01','2026-08-15','seed_khhd_DT'),
    (obj,'project','QT.7: Bộ học liệu CBQL (C3-5)','KPI M-20. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-07-01','2026-08-31','seed_khhd_DT'),
    (obj,'project','QT.8: Bộ học liệu QLKV','KPI M-20. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-08-01','2026-09-30','seed_khhd_DT'),
    (obj,'project','QT.9: Bộ Văn hóa làm việc TĐ Bảo Tín','KPI M-20. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-07-01','2026-08-31','seed_khhd_DT'),
    (obj,'project','QT.10: Nâng cấp hệ thống LMS','KPI M-21. Tỷ trọng 2,08%.',o_ng,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','QT.11: Xây dựng ngân hàng học liệu số (Elearning)','KPI M-21. Tỷ trọng 2,08%.',o_ng,'in_progress','medium','2026-07-01','2026-09-30','seed_khhd_DT'),
    (obj,'project','QT.12: Lập kế hoạch hành động Năm/Quý/Tháng','KPI M-22. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT'),
    (obj,'project','QT.13: Thực thi KHHĐ & báo cáo kết quả T/Q/N','KPI M-22. Tỷ trọng 2,08%.',o_dung,'in_progress','medium','2026-07-01','2026-12-31','seed_khhd_DT');
END $$;
COMMIT;
