-- 600: LIÊN KẾT DỰ ÁN ↔ OKR (CFO 08/09) — OKR gắn ở CẤP DỰ ÁN (điều lệ), không bắt từng việc.
-- 1 dự án có thể đóng góp cho NHIỀU objective (vd taskforce Nam Tiến ↔ nhiều CTY-O). Việc trong dự án
-- chỉ cần thuộc dự án; OKR liên quan khai 1 lần ở đây. Chạy superuser (deploy glob ≥320). Idempotent.
CREATE TABLE IF NOT EXISTS okr_project_objectives (
  project_id   uuid NOT NULL REFERENCES okr_projects(id) ON DELETE CASCADE,
  objective_id uuid NOT NULL REFERENCES okr_objectives(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, objective_id)
);
CREATE INDEX IF NOT EXISTS okr_project_objectives_obj_idx ON okr_project_objectives (objective_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON okr_project_objectives TO btmh_app;
