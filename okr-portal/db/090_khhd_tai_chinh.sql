-- ============================================================================
-- OKR Portal — KHHĐ 2026 Khối TÀI CHÍNH KẾ TOÁN (từ Drive: KPI NĂM M-xx + KHHĐ NĂM H-xx)
-- Objective khối (Năm 2026, unit TC) + 4 KR (M-01..M-04) + 5 dự án (H-01..H-05, PIC Mr Thắng).
-- Align lên OKR công ty "2026: Hoàn thành Kế hoạch Kinh doanh (ĐHCĐ)".
-- Idempotent: created_by='seed_khhd_TC'. Chạy SUPERUSER postgres.
-- ============================================================================

BEGIN;

DO $$
DECLARE y26 uuid; tc uuid; own text; parent uuid; obj uuid;
BEGIN
  SELECT id INTO y26 FROM okr_periods WHERE name='Năm 2026';
  SELECT id INTO tc FROM okr_units WHERE code='TC';
  SELECT id INTO parent FROM okr_objectives
    WHERE title='2026: Hoàn thành Kế hoạch Kinh doanh (ĐHCĐ)' AND created_by='seed_strategy' LIMIT 1;
  own := (SELECT email FROM okr_users WHERE email='nguyenvanthang@baotinmanhhai.vn');

  DELETE FROM okr_objectives WHERE created_by='seed_khhd_TC';

  INSERT INTO okr_objectives(period_id,parent_id,level,unit_id,owner_email,title,description,status,okr_type,created_by)
    VALUES(y26,parent,'division',tc,own,
      '2026 — Khối Tài chính kế toán: Quản trị KQKD & Kiểm soát chi phí (chuẩn IPO)',
      'Nâng độ chính xác dự báo (chi phí, LNT ±10%), quản lý hiệu quả đầu tư cửa hàng theo FS/Target và kiểm soát tổng chi phí trong ngân sách phê duyệt — nền tảng số liệu chuẩn IPO.',
      'active','committed','seed_khhd_TC') RETURNING id INTO obj;

  -- KR (M-01..M-04)
  INSERT INTO okr_key_results(objective_id,title,metric_type,direction,unit_label,start_value,target_value,current_value,indicator) VALUES
    (obj,'M-01: Forecast chi phí sai số ≤ ±10%','boolean','increase',NULL,0,1,0,'lagging'),
    (obj,'M-02: Forecast lợi nhuận thuần sai số ≤ ±10%','boolean','increase',NULL,0,1,0,'lagging'),
    (obj,'M-03: Hiệu quả đầu tư cửa hàng theo FS/Target','percent','increase','%',0,80,0,'lagging'),
    (obj,'M-04: Tổng chi phí không vượt ngân sách phê duyệt','boolean','increase',NULL,0,1,0,'lagging');

  -- Dự án / Hành động năm (H-01..H-05), kind='project' (cho phép thêm hành động tháng sau)
  INSERT INTO okr_initiatives(objective_id,kind,title,description,owner_email,status,priority,start_on,due_on,created_by) VALUES
    (obj,'project','H-01: Thiết lập mô hình dự báo chi phí theo Cost Center',
      'KPI M-01. Kết quả cần đạt: sai số dự báo chi phí thực tế so với kế hoạch trong ±10%. Tỷ trọng 40%.',
      own,'in_progress','high','2026-01-01','2026-05-31','seed_khhd_TC'),
    (obj,'project','H-02: Xây dựng công cụ phân tích độ nhạy Lợi nhuận thuần',
      'KPI M-02. Phân tích độ nhạy LNT theo biến động doanh thu/giá vốn. Kết quả: sai số dự báo trong ±10%.',
      own,'in_progress','medium','2026-03-01','2026-03-01','seed_khhd_TC'),
    (obj,'project','H-03: Đánh giá FS các địa điểm mới',
      'KPI M-03. Kết quả cần đạt: đủ thông tin để ra quyết định đầu tư.',
      own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_TC'),
    (obj,'project','H-04: Quản lý hiệu quả đầu tư từng cửa hàng',
      'KPI M-03. Kết quả cần đạt: so sánh hiệu quả thực tế với FS/Target đầu kỳ.',
      own,'in_progress','high','2026-01-01','2026-12-31','seed_khhd_TC'),
    (obj,'project','H-05: Thẩm định ngân sách hàng tháng các Đơn vị',
      'KPI M-04. Kết quả cần đạt: bảng thẩm định ngân sách tháng trước ngày T+5. Tỷ trọng 15%.',
      own,'in_progress','medium','2026-01-01','2026-12-31','seed_khhd_TC');
END $$;

COMMIT;
