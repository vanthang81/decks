-- 500: tuỳ chọn MỖI NGƯỜI bật/tắt tự thêm vào Google Calendar (mặc định BẬT). Công tắc TOÀN CỤC
-- (admin) lưu ở okr_settings key 'calendar_sync' (mặc định true) — không cần cột riêng.
ALTER TABLE okr_users ADD COLUMN IF NOT EXISTS calendar_enabled boolean NOT NULL DEFAULT true;
