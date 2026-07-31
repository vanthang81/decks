-- 130: DỰ ÁN độc lập, XUYÊN nhiều OKR (cross-OKR). Idempotent.
-- Task/công việc (okr_initiatives) trỏ vào 1 dự án qua project_id; 1 dự án gom
-- task từ nhiều OKR/khối khác nhau. Quản trị theo dự án ở trang /projects.

CREATE TABLE IF NOT EXISTS okr_projects (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text,
  period_id      uuid REFERENCES okr_periods(id) ON DELETE SET NULL,
  name           text NOT NULL,
  description    text,
  owner_email    text REFERENCES okr_users(email) ON DELETE SET NULL,
  unit_id        uuid REFERENCES okr_units(id) ON DELETE SET NULL,
  status         text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','done','paused','archived')),
  start_on       date,
  due_on         date,
  budget_planned numeric(20,2) NOT NULL DEFAULT 0,
  budget_actual  numeric(20,2) NOT NULL DEFAULT 0,
  created_by     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_okr_projects_code ON okr_projects(code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_okr_projects_period ON okr_projects(period_id);

ALTER TABLE okr_initiatives
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES okr_projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_okr_init_project ON okr_initiatives(project_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON okr_projects TO btmh_app;
