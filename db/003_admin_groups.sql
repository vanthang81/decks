-- 003: Nhóm người xem + phân quyền deck theo nhóm (quản trị viên đã có ở deck_admins).
-- Chạy bằng superuser postgres qua docker exec. Idempotent.

-- Nhóm người xem (gom khán giả để cấp deck theo lô)
CREATE TABLE IF NOT EXISTS deck_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS deck_groups_name_uidx ON deck_groups (lower(name));

-- Thành viên nhóm (người xem thuộc nhóm)
CREATE TABLE IF NOT EXISTS deck_group_members (
  group_id  uuid NOT NULL REFERENCES deck_groups(id)  ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES deck_viewers(id) ON DELETE CASCADE,
  added_by  text,
  added_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, viewer_id)
);
CREATE INDEX IF NOT EXISTS deck_group_members_viewer_idx ON deck_group_members (viewer_id);

-- Đánh dấu grant nào phát sinh từ 1 nhóm (để thu hồi cả nhóm + hiển thị nguồn)
ALTER TABLE deck_grants ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES deck_groups(id) ON DELETE SET NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON deck_groups, deck_group_members TO btmh_app;
