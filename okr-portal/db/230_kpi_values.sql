-- 230_kpi_values.sql — GIÁ TRỊ KPI theo (KPI × Kỳ × Đơn vị) = nền đo đa cấp Cty→Khối→Phòng.
-- Idempotent. Chạy bằng superuser postgres. App user btmh_app được GRANT ở cuối.

CREATE TABLE IF NOT EXISTS okr_kpi_values (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id     uuid NOT NULL REFERENCES okr_kpis(id) ON DELETE CASCADE,
  period_id  uuid NOT NULL REFERENCES okr_periods(id) ON DELETE CASCADE,
  unit_id    uuid NOT NULL REFERENCES okr_units(id) ON DELETE CASCADE,   -- cấp đo (công ty/khối/phòng)
  target     numeric,
  actual     numeric,
  note       text,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kpi_id, period_id, unit_id)
);

CREATE INDEX IF NOT EXISTS okr_kpi_values_lookup_idx ON okr_kpi_values(period_id, unit_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON okr_kpi_values TO btmh_app;
