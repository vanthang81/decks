-- 170: Lưu avatar Google của user (cập nhật mỗi lần đăng nhập) để hiển thị ở
-- bình luận / thông báo / gợi ý @mention. Idempotent.
ALTER TABLE okr_users ADD COLUMN IF NOT EXISTS avatar_url text;
