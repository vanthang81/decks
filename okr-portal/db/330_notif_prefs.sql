-- 330: Tuỳ chọn thông báo CHI TIẾT theo loại (per-user) + nền cho trang "Cài đặt cá nhân".
-- notif_prefs = jsonb, CHỈ lưu các loại bị TẮT (mặc định mọi loại BẬT). Idempotent.
-- Loại: 'mention' (được @nhắc) · 'reply' (trả lời bình luận của mình) ·
--       'comment_mine' (có bình luận trên OKR/việc mình phụ trách) · 'assignment' (được giao việc).
-- Email tổng vẫn dùng cột notify_email sẵn có (db/160).
ALTER TABLE okr_users ADD COLUMN IF NOT EXISTS notif_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;
