-- 410: Theo dõi ĐĂNG NHẬP người dùng (cho hồ sơ 360° — chỉ quản trị xem).
-- last_login_at = lần đăng nhập gần nhất; login_count = tổng số lần. Cập nhật ở callback signIn.
-- Idempotent. Chạy bằng superuser postgres.

ALTER TABLE okr_users ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE okr_users ADD COLUMN IF NOT EXISTS login_count integer NOT NULL DEFAULT 0;
