-- ============================================================================
-- OKR Portal — Seed khung thời gian BTMH 2026–2030 (idempotent theo name UNIQUE)
-- Chiến lược 2026–2030 (multiyear) → Năm 2026..2030 → Quý 2026 (Q1–Q4) → Tháng 2026 (T1–T12)
-- Kỳ hiện tại (mặc định hiển thị) = Năm 2026 (nơi chứa KPI/OKR năm). Chạy SUPERUSER postgres.
-- ============================================================================

BEGIN;

DO $$
DECLARE my uuid; y26 uuid; q1 uuid; q2 uuid; q3 uuid; q4 uuid;
BEGIN
  -- 1) Multiyear
  INSERT INTO okr_periods(name,kind,starts_on,ends_on,status)
    VALUES('Chiến lược 2026–2030','multiyear','2026-01-01','2030-12-31','active')
    ON CONFLICT (name) DO NOTHING;
  SELECT id INTO my FROM okr_periods WHERE name='Chiến lược 2026–2030';

  -- 2) Năm 2026..2030
  INSERT INTO okr_periods(name,kind,starts_on,ends_on,status) VALUES
    ('Năm 2026','year','2026-01-01','2026-12-31','active'),
    ('Năm 2027','year','2027-01-01','2027-12-31','planning'),
    ('Năm 2028','year','2028-01-01','2028-12-31','planning'),
    ('Năm 2029','year','2029-01-01','2029-12-31','planning'),
    ('Năm 2030','year','2030-01-01','2030-12-31','planning')
    ON CONFLICT (name) DO NOTHING;
  UPDATE okr_periods SET parent_id=my, kind='year'
    WHERE name IN ('Năm 2026','Năm 2027','Năm 2028','Năm 2029','Năm 2030');
  SELECT id INTO y26 FROM okr_periods WHERE name='Năm 2026';

  -- 3) Quý 2026
  INSERT INTO okr_periods(name,kind,starts_on,ends_on,status) VALUES
    ('Q1-2026','quarter','2026-01-01','2026-03-31','closed'),
    ('Q2-2026','quarter','2026-04-01','2026-06-30','closed'),
    ('Q3-2026','quarter','2026-07-01','2026-09-30','active'),
    ('Q4-2026','quarter','2026-10-01','2026-12-31','planning')
    ON CONFLICT (name) DO NOTHING;
  UPDATE okr_periods SET parent_id=y26, kind='quarter'
    WHERE name IN ('Q1-2026','Q2-2026','Q3-2026','Q4-2026');
  SELECT id INTO q1 FROM okr_periods WHERE name='Q1-2026';
  SELECT id INTO q2 FROM okr_periods WHERE name='Q2-2026';
  SELECT id INTO q3 FROM okr_periods WHERE name='Q3-2026';
  SELECT id INTO q4 FROM okr_periods WHERE name='Q4-2026';

  -- 4) Tháng 2026 (gắn vào quý tương ứng)
  INSERT INTO okr_periods(name,kind,parent_id,starts_on,ends_on,status) VALUES
    ('T1-2026','month',q1,'2026-01-01','2026-01-31','closed'),
    ('T2-2026','month',q1,'2026-02-01','2026-02-28','closed'),
    ('T3-2026','month',q1,'2026-03-01','2026-03-31','closed'),
    ('T4-2026','month',q2,'2026-04-01','2026-04-30','closed'),
    ('T5-2026','month',q2,'2026-05-01','2026-05-31','closed'),
    ('T6-2026','month',q2,'2026-06-01','2026-06-30','closed'),
    ('T7-2026','month',q3,'2026-07-01','2026-07-31','active'),
    ('T8-2026','month',q3,'2026-08-01','2026-08-31','planning'),
    ('T9-2026','month',q3,'2026-09-01','2026-09-30','planning'),
    ('T10-2026','month',q4,'2026-10-01','2026-10-31','planning'),
    ('T11-2026','month',q4,'2026-11-01','2026-11-30','planning'),
    ('T12-2026','month',q4,'2026-12-01','2026-12-31','planning')
    ON CONFLICT (name) DO NOTHING;
  UPDATE okr_periods SET kind='month', parent_id=q1 WHERE name IN ('T1-2026','T2-2026','T3-2026');
  UPDATE okr_periods SET kind='month', parent_id=q2 WHERE name IN ('T4-2026','T5-2026','T6-2026');
  UPDATE okr_periods SET kind='month', parent_id=q3 WHERE name IN ('T7-2026','T8-2026','T9-2026');
  UPDATE okr_periods SET kind='month', parent_id=q4 WHERE name IN ('T10-2026','T11-2026','T12-2026');

  -- 5) Kỳ hiện tại = Năm 2026 (mặc định hiển thị OKR năm)
  UPDATE okr_periods SET is_current=false WHERE is_current=true;
  UPDATE okr_periods SET is_current=true, status='active' WHERE id=y26;
END $$;

COMMIT;
