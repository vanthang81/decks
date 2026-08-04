-- 390: LIÊN KẾT CUỘC HỌP TRƯỚC — chuỗi cuộc họp nối tiếp (vd chuỗi check-in dự án hàng tuần).
-- okr_meetings.previous_meeting_id trỏ cuộc họp liền trước; ON DELETE SET NULL (xoá họp trước
-- không xoá họp sau, chỉ gỡ liên kết). Idempotent. Chạy bằng superuser postgres.

ALTER TABLE okr_meetings
  ADD COLUMN IF NOT EXISTS previous_meeting_id uuid REFERENCES okr_meetings(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS okr_meetings_prev_idx ON okr_meetings (previous_meeting_id);
