-- 480: LỜI MỜI NGƯỜI DÙNG (invite-by-email) — cho phép ở mọi màn hình đề xuất thêm 1 email chưa có
-- trong hệ thống; cần người có quyền 'user.approve' (Duyệt người dùng) DUYỆT thì mới tạo user thật.
CREATE TABLE IF NOT EXISTS okr_user_invites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL,
  display_name text,
  role         text NOT NULL DEFAULT 'staff',      -- vai trò đề xuất khi duyệt
  unit_id      uuid REFERENCES okr_units(id) ON DELETE SET NULL,
  note         text,
  invited_by   text NOT NULL,
  status       text NOT NULL DEFAULT 'pending',      -- pending | approved | rejected
  decided_by   text,
  decided_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
-- Chỉ 1 lời mời PENDING cho mỗi email (tránh trùng); đã duyệt/từ chối thì cho mời lại.
CREATE UNIQUE INDEX IF NOT EXISTS okr_user_invites_pending_uidx
  ON okr_user_invites (lower(email)) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS okr_user_invites_status_idx ON okr_user_invites (status, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON okr_user_invites TO btmh_app;
