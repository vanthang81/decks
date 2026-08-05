-- Phụ thuộc giữa các CÔNG VIỆC (waterfall): việc A phải xong trước thì việc B mới nên chạy.
-- task_id (B, successor) PHỤ THUỘC vào depends_on_id (A, predecessor). Nhiều predecessor/việc.
-- Idempotent — chạy lại an toàn.
CREATE TABLE IF NOT EXISTS okr_initiative_deps (
  task_id       uuid NOT NULL REFERENCES okr_initiatives(id) ON DELETE CASCADE,
  depends_on_id uuid NOT NULL REFERENCES okr_initiatives(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, depends_on_id),
  CHECK (task_id <> depends_on_id)  -- không tự phụ thuộc chính mình
);
CREATE INDEX IF NOT EXISTS okr_initiative_deps_dep_idx ON okr_initiative_deps(depends_on_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON okr_initiative_deps TO btmh_app;
