-- 270_kr_kpi_links.sql — GẮN KPI thư viện cho các KR có chỉ số KHỚP RÕ RÀNG (đo lường).
-- CHỈ set liên kết `kpi_id` (traceability KR↔KPI), KHÔNG kéo số → không đụng start/target/current
-- đã seed của KR. Khớp theo MÃ (ổn định). Idempotent (chạy lại ra cùng kết quả).
-- Chỉ chọn KR mà chỉ số trùng đúng 1 KPI trong Thư viện; KR dạng cột mốc/dự án KHÔNG gắn.
-- Chạy bằng superuser postgres (hoặc btmh_app — đã có quyền UPDATE).

UPDATE okr_key_results kr
   SET kpi_id = k.id, updated_at = now()
  FROM (VALUES
    ('B2B-O1.KR1','M-08'),   -- NPS B2B → NPS
    ('BL-O1.KR2','M-08'),    -- NPS bán lẻ → NPS
    ('MKT-O2.KR6','M-08'),   -- NPS ≥90 → NPS
    ('BL-O1.KR3','OPS-01'),  -- Doanh thu thuần bán lẻ → Doanh thu (bán lẻ)
    ('NS-O1.KR2','M-14'),    -- Turnover toàn công ty → Tỷ lệ nghỉ việc
    ('NS-O1.KR3','M-14'),    -- Turnover CBLĐ → Tỷ lệ nghỉ việc
    ('CN-O1.KR3','M-13'),    -- Gián đoạn CNTT (phần mềm) ≤1% → Uptime hệ thống
    ('CN-O2.KR4','M-13'),    -- Gián đoạn CNTT (hạ tầng) ≤1% → Uptime hệ thống
    ('CU-O1.KR3','T1-05'),   -- DIO trong ngưỡng → Vòng quay tồn / DIO
    ('CU-O1.KR4','M-05')     -- DIFOT giao vận → OTIF (giao đúng hẹn & đủ)
  ) AS m(kr_code, kpi_code)
  JOIN okr_kpis k ON k.code = m.kpi_code
 WHERE kr.code = m.kr_code;
