-- 490: GHI THẲNG GOOGLE CALENDAR (app-side) — CFO 11/08 "code sẵn, bật quyền Console sau".
-- Lưu token OAuth (calendar.events, offline) từng người + map task/cuộc họp → event id để cập nhật/xoá.
-- Toàn bộ tính năng NGỦ (dormant) tới khi bật env GOOGLE_CALENDAR_ENABLED=1 + cấu hình scope ở Google Console.
CREATE TABLE IF NOT EXISTS okr_google_tokens (
  email         text PRIMARY KEY,
  access_token  text,
  refresh_token text,
  expiry        timestamptz,      -- thời điểm access_token hết hạn
  scope         text,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
-- Map bản ghi ứng dụng → sự kiện trên lịch (để sửa/xoá đúng sự kiện đã tạo).
ALTER TABLE okr_initiatives ADD COLUMN IF NOT EXISTS gcal_event_id text;
ALTER TABLE okr_meetings    ADD COLUMN IF NOT EXISTS gcal_event_id text;
GRANT SELECT, INSERT, UPDATE, DELETE ON okr_google_tokens TO btmh_app;
