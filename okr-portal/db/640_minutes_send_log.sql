-- 640_minutes_send_log.sql — Nhật ký GỬI BIÊN BẢN HỌP qua email (CFO 12/09, idempotent)
-- Ghi mỗi lần bấm "Gửi biên bản": khi nào, ai gửi, bao nhiêu người, thành công/thất bại →
-- hiển thị note nhỏ cạnh nút để mọi người nắm BB đã gửi chưa / mấy lần / kết quả.
CREATE TABLE IF NOT EXISTS okr_meeting_minutes_sends (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id   uuid NOT NULL REFERENCES okr_meetings(id) ON DELETE CASCADE,
  sent_at      timestamptz NOT NULL DEFAULT now(),
  sent_by      text,
  sent_by_name text,
  recipients   int NOT NULL DEFAULT 0,   -- tổng người nhận
  ok_count     int NOT NULL DEFAULT 0,   -- số gửi thành công
  fail_count   int NOT NULL DEFAULT 0,   -- số gửi lỗi
  note         text                       -- lời nhắn kèm (nếu có)
);
CREATE INDEX IF NOT EXISTS okr_mm_sends_meeting_idx ON okr_meeting_minutes_sends(meeting_id, sent_at DESC);
GRANT SELECT, INSERT ON okr_meeting_minutes_sends TO btmh_app;
