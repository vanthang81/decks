-- 540: ghi NHẬT KÝ lưu biên bản cuộc họp — ai lưu lần cuối + lúc nào.
-- Dùng cho ô "Ghi biên bản" hiển thị "Lưu lần cuối bởi <tên> lúc <thời gian>" (kể cả tự lưu nháp).
-- Idempotent.
ALTER TABLE okr_meetings ADD COLUMN IF NOT EXISTS minutes_updated_by  text;
ALTER TABLE okr_meetings ADD COLUMN IF NOT EXISTS minutes_updated_at  timestamptz;
