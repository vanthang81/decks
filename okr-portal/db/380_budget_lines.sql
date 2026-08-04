-- 380: Sổ CHI TIẾT NGÂN SÁCH (cost lines) — mỗi dự án có thể tách ngân sách thành nhiều dòng
-- theo HẠNG MỤC (category): kế hoạch + thực chi + ghi chú + nguồn. Dùng cho:
--   • popup "chi tiết" theo khối/đơn vị & theo dự án (trace-back cơ cấu chi phí),
--   • import/template CSV (ghi dòng theo mã dự án + hạng mục),
--   • đồng bộ THỰC CHI từ BigQuery (source='bigquery') — plumbing sẵn, chờ BI chốt nguồn.
-- Idempotent. Chạy bằng superuser postgres.

CREATE TABLE IF NOT EXISTS okr_budget_lines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid REFERENCES okr_projects(id) ON DELETE CASCADE,
  category    text NOT NULL DEFAULT 'Khác',   -- hạng mục chi phí
  planned     numeric NOT NULL DEFAULT 0,     -- kế hoạch (VND)
  actual      numeric NOT NULL DEFAULT 0,     -- thực chi (VND)
  note        text,
  source      text NOT NULL DEFAULT 'manual', -- manual | import | bigquery
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS okr_budget_lines_project_idx ON okr_budget_lines (project_id);
-- 1 hạng mục / dự án là duy nhất → import upsert được theo (project, category).
CREATE UNIQUE INDEX IF NOT EXISTS okr_budget_lines_proj_cat_uidx
  ON okr_budget_lines (project_id, category);

GRANT SELECT, INSERT, UPDATE, DELETE ON okr_budget_lines TO btmh_app;
