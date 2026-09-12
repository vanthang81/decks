-- 660_task_change_events.sql — Thông báo THAY ĐỔI công việc (CFO 12/09).
-- Ghi lại mỗi lần 1 công việc đổi TRẠNG THÁI/NỘI DUNG → tổng hợp gửi cho Người giao (created_by)
-- + Chủ trì OKR gốc (objective owner), theo tuỳ chọn kênh/giờ/ngày của từng người.
-- Chạy bằng superuser postgres (idempotent). GRANT cho btmh_app.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS okr_task_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES okr_initiatives(id) ON DELETE CASCADE,
  task_title  text NOT NULL,                    -- ảnh chụp tên việc tại thời điểm thay đổi
  actor_email text,                             -- người thực hiện thay đổi (loại khỏi người nhận)
  actor_name  text,
  kind        text NOT NULL DEFAULT 'content',  -- 'status' | 'content'
  summary     text NOT NULL,                    -- mô tả ngắn: "Trạng thái: Đang làm → Xong" …
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS okr_task_events_created_idx ON okr_task_events (created_at);
CREATE INDEX IF NOT EXISTS okr_task_events_task_idx ON okr_task_events (task_id);
GRANT SELECT, INSERT, DELETE ON okr_task_events TO btmh_app;

-- Tuỳ chọn nhận thông báo thay đổi công việc (per-user):
--   { channel:'both'|'app'|'email'|'off', times:['08:00',…], days:[1..6] }  (0=CN..6=T7, giờ VN)
-- NULL = mặc định: channel 'both', times ['08:00'], days [1,2,3,4,5,6] (8h sáng T2–T7).
ALTER TABLE okr_users ADD COLUMN IF NOT EXISTS task_change_prefs jsonb;
-- Mốc gửi digest gần nhất (để gom "thay đổi kể từ lần gửi trước" + tránh gửi trùng slot).
ALTER TABLE okr_users ADD COLUMN IF NOT EXISTS task_change_last_sent timestamptz;
