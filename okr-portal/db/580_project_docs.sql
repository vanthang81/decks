-- 580: THƯ VIỆN TÀI LIỆU DỰ ÁN — tạm thời lưu LINK tài liệu (chưa hỗ trợ upload file).
-- Mỗi dự án có nhiều link (tiêu đề + URL + ghi chú). Xoá dự án → cascade xoá link.
-- Chạy bằng superuser postgres (deploy auto glob db/*.sql ≥320). Idempotent.
CREATE TABLE IF NOT EXISTS okr_project_docs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES okr_projects(id) ON DELETE CASCADE,
  title       text NOT NULL,
  url         text NOT NULL,
  note        text,
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS okr_project_docs_project_idx ON okr_project_docs (project_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON okr_project_docs TO btmh_app;
