-- 220_kpi_library.sql — THƯ VIỆN KPI (okr_kpis): chỉ số đo dùng lại, đo đa cấp.
-- Idempotent. Chạy bằng superuser postgres. App user btmh_app được GRANT ở cuối.
-- Mỗi KPI mang đủ thuộc tính để phục vụ CẢ lens BSC LẪN scorecard vận hành 3 tầng:
--   viễn cảnh BSC · module (KRA) · tầng+trọng số · nguồn (auto/tay) · ngưỡng W/A/E · 2 owner.

CREATE TABLE IF NOT EXISTS okr_kpis (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text UNIQUE,                         -- KPI-01… (tự sinh)
  name             text NOT NULL,
  description      text,
  unit_label       text,                                -- đơn vị đo: đ, %, chỉ, lượt…
  bsc_perspective  text CHECK (bsc_perspective IS NULL OR bsc_perspective IN ('financial','customer','process','learning')),
  module           text,                                -- KRA / module chức năng (Control Tower)
  tier             text CHECK (tier IS NULL OR tier IN ('result','driver','enabler')),  -- Kết quả/Động cơ/Bộ máy
  weight           int  NOT NULL DEFAULT 0,             -- trọng số điểm scorecard
  direction        text NOT NULL DEFAULT 'up' CHECK (direction IN ('up','down')),       -- hướng tốt
  agg              text NOT NULL DEFAULT 'last' CHECK (agg IN ('sum','avg','last')),     -- cách gộp lên cấp trên
  source           text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','bigquery','postgres')),
  source_ref       text,                                -- metric key / công thức tham chiếu
  unit_id          uuid REFERENCES okr_units(id) ON DELETE SET NULL,  -- đơn vị chủ (KRA)
  business_owner   text,                                -- email người tạo kết quả
  measurement_owner text,                               -- email người đo
  cadence          text,                                -- daily/weekly/monthly/quarterly
  threshold_watch    numeric,                           -- ngưỡng Watch
  threshold_alert    numeric,                           -- ngưỡng Alert
  threshold_escalate numeric,                           -- ngưỡng Escalate
  is_active        boolean NOT NULL DEFAULT true,
  created_by       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS okr_kpis_active_idx ON okr_kpis(is_active);
CREATE INDEX IF NOT EXISTS okr_kpis_bsc_idx ON okr_kpis(bsc_perspective);

GRANT SELECT, INSERT, UPDATE, DELETE ON okr_kpis TO btmh_app;
