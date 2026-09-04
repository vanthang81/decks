-- 590: THÀNH VIÊN DỰ ÁN — phân quyền XEM dự án (CFO 04/09: chỉ thành viên mới xem được).
-- Danh sách thành viên TƯỜNG MINH do người quản dự án thêm/bớt. Ngoài danh sách này, hệ thống
-- LUÔN cho xem: chủ trì (owner) + người tạo (created_by) + người được giao việc trong dự án
-- (assignee) + Quản trị/CEO/CFO (scope.all) + quản lý trong nhánh đơn vị của dự án.
-- Chạy bằng superuser postgres (deploy auto glob db/*.sql ≥320). Idempotent.
CREATE TABLE IF NOT EXISTS okr_project_members (
  project_id  uuid NOT NULL REFERENCES okr_projects(id) ON DELETE CASCADE,
  email       text NOT NULL,
  added_by    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, email)
);
CREATE INDEX IF NOT EXISTS okr_project_members_email_idx ON okr_project_members (lower(email));
GRANT SELECT, INSERT, UPDATE, DELETE ON okr_project_members TO btmh_app;
