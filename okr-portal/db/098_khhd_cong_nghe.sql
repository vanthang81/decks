-- KHHĐ 2026 Khối CÔNG NGHỆ — 2 nhánh: PT Ứng dụng (Mr Dương) + Hạ tầng&CNTT (Mr Bái).
-- created_by='seed_khhd_CNAPP' / 'seed_khhd_CNINFRA'
BEGIN;
DO $$
DECLARE y26 uuid; cn uuid; parent uuid; obj uuid; o_duong text; o_bai text;
BEGIN
  SELECT id INTO y26 FROM okr_periods WHERE name='Năm 2026';
  SELECT id INTO cn FROM okr_units WHERE code='CN';
  SELECT id INTO parent FROM okr_objectives WHERE title='2026: Hoàn thành Kế hoạch Kinh doanh (ĐHCĐ)' AND created_by='seed_strategy' LIMIT 1;
  o_duong := (SELECT email FROM okr_users WHERE email='trantuanduong@baotinmanhhai.vn');
  o_bai := (SELECT email FROM okr_users WHERE email='phamminhbai@baotinmanhhai.vn');
  DELETE FROM okr_objectives WHERE created_by IN ('seed_khhd_CNAPP','seed_khhd_CNINFRA');

  -- ===== Nhánh PT Ứng dụng (Mr Dương) =====
  INSERT INTO okr_objectives(period_id,parent_id,level,unit_id,owner_email,title,description,status,okr_type,created_by)
    VALUES(y26,parent,'division',cn,o_duong,
      '2026 — Công nghệ (PT Ứng dụng): Triển khai dự án CNTT & dữ liệu',
      'Vận hành ứng dụng ổn định (gián đoạn ≤1%), triển khai dự án CNTT đúng tiến độ (B2B BIDV/MB, App bán hàng, App tỉ giá, Odoo, SAP/ERP), đáp ứng yêu cầu dữ liệu.',
      'active','committed','seed_khhd_CNAPP') RETURNING id INTO obj;
  INSERT INTO okr_key_results(objective_id,title,metric_type,direction,unit_label,start_value,target_value,current_value,indicator) VALUES
    (obj,'M-01: Gián đoạn dịch vụ CNTT do lỗi phần mềm ≤ 1%','percent','decrease','%',3,1,3,'lagging'),
    (obj,'M-02: Tiến độ triển khai dự án CNTT ≥ 90%','percent','increase','%',0,90,0,'lagging'),
    (obj,'M-03: Đáp ứng yêu cầu dữ liệu đúng hạn ≥ 90%','percent','increase','%',0,90,0,'lagging'),
    (obj,'M-04: Mức hài lòng khách hàng nội bộ ≥ 90%','percent','increase','%',0,90,0,'leading');
  INSERT INTO okr_initiatives(objective_id,kind,title,description,owner_email,status,priority,start_on,due_on,created_by) VALUES
    (obj,'project','H-01: B2B BIDV — Giai đoạn 1','KPI M-02. Golive & vận hành thành công. Tỷ trọng 14%.',o_duong,'in_progress','high','2026-05-04','2026-06-30','seed_khhd_CNAPP'),
    (obj,'project','H-02: B2B BIDV — Giai đoạn 2','KPI M-02. Golive & vận hành thành công. Tỷ trọng 6%.',o_duong,'in_progress','high','2026-07-01','2026-08-31','seed_khhd_CNAPP'),
    (obj,'project','H-03: B2B MB','KPI M-02. Golive & vận hành thành công. Tỷ trọng 10%.',o_duong,'in_progress','high','2026-07-01','2026-08-31','seed_khhd_CNAPP'),
    (obj,'project','H-04: App mobile bán hàng','KPI M-02. Golive & vận hành thành công. Tỷ trọng 14%.',o_duong,'in_progress','high','2026-03-01','2026-06-30','seed_khhd_CNAPP'),
    (obj,'project','H-05: App tỉ giá','KPI M-02. Golive & vận hành thành công. Tỷ trọng 10%.',o_duong,'in_progress','medium','2026-06-01','2026-06-30','seed_khhd_CNAPP'),
    (obj,'project','H-06: Triển khai Odoo (trừ TCKT)','KPI M-02. Golive & vận hành thành công. Tỷ trọng 20%.',o_duong,'in_progress','high','2026-01-01','2026-08-31','seed_khhd_CNAPP'),
    (obj,'project','H-07: Triển khai SAP/ERP (Augges → SAP)','KPI M-02. Go-live phân hệ kế toán. Tỷ trọng 10%.',o_duong,'in_progress','high','2026-08-01','2026-12-31','seed_khhd_CNAPP'),
    (obj,'project','H-08: Đáp ứng yêu cầu cung cấp dữ liệu & báo cáo','KPI M-03. Tỷ trọng 16%.',o_duong,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_CNAPP');

  -- ===== Nhánh Hạ tầng & CNTT (Mr Bái) =====
  INSERT INTO okr_objectives(period_id,parent_id,level,unit_id,owner_email,title,description,status,okr_type,created_by)
    VALUES(y26,parent,'division',cn,o_bai,
      '2026 — Công nghệ (Hạ tầng & CNTT): Hạ tầng, an ninh bảo mật & setup điểm bán',
      'Setup CNTT điểm bán mới đúng hạn ≥99%, gián đoạn hạ tầng ≤1%, camera lưu trữ đúng quy định, phần mềm bản quyền toàn công ty, hạ tầng cho dự án CNTT 2026 (DR site, EDR, SIEM/SOC, ISO 27001).',
      'active','committed','seed_khhd_CNINFRA') RETURNING id INTO obj;
  INSERT INTO okr_key_results(objective_id,title,metric_type,direction,unit_label,start_value,target_value,current_value,indicator) VALUES
    (obj,'M-01: Setup CNTT điểm bán mới đúng hạn ≥ 99%','percent','increase','%',0,99,0,'lagging'),
    (obj,'M-02: Gián đoạn dịch vụ CNTT do hạ tầng/mạng ≤ 1%','percent','decrease','%',3,1,3,'lagging'),
    (obj,'M-03: Dữ liệu Camera lưu trữ đúng quy định (30–60 ngày)','boolean','increase',NULL,0,1,0,'lagging'),
    (obj,'M-04: Triển khai phần mềm bản quyền toàn công ty','boolean','increase',NULL,0,1,0,'leading'),
    (obj,'M-05: Triển khai hạ tầng cho các dự án CNTT 2026 đúng hạn','boolean','increase',NULL,0,1,0,'leading');
  INSERT INTO okr_initiatives(objective_id,kind,title,description,owner_email,status,priority,start_on,due_on,created_by) VALUES
    (obj,'project','H-01: Chuẩn hóa mô hình CNTT điểm bán mới & nhân rộng','KPI M-01. Đúng hạn mở bán & vận hành ổn định. Tỷ trọng 20%.',o_bai,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_CNINFRA'),
    (obj,'project','H-02: DR site + Antivirus/EDR + SIEM/SOC + ISO 27001','KPI M-02. Hoàn thành các hạng mục ANBM theo kế hoạch. Tỷ trọng 40%.',o_bai,'in_progress','high','2026-05-28','2026-08-31','seed_khhd_CNINFRA'),
    (obj,'project','H-03: Giải pháp Camera tập trung & chuẩn hóa camera cửa hàng','KPI M-03. Giám sát tập trung & lưu trữ đúng quy định. Tỷ trọng 40%.',o_bai,'in_progress','high','2026-06-01','2026-09-30','seed_khhd_CNINFRA'),
    (obj,'project','H-04: Cài phần mềm bản quyền Windows & Office (GĐ1)','KPI M-04. Toàn công ty.',o_bai,'todo','medium','2026-01-01','2026-12-31','seed_khhd_CNINFRA'),
    (obj,'project','H-05: Setup hạ tầng dự án Trân Bảo + ESS (Augges/Odoo)','KPI M-05.',o_bai,'todo','medium','2026-01-01','2026-12-31','seed_khhd_CNINFRA');
END $$;
COMMIT;
