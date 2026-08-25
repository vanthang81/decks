-- 550: liên kết CÔNG VIỆC với DÒNG "[]" trong biên bản họp (Lark-style inline task).
-- minutes_key = thẻ ngắn (vd 'T1','T2') nhúng cuối dòng "[]" để đồng bộ 2 chiều
-- (sửa dòng trong biên bản ↔ cập nhật việc bên dưới). Duy nhất theo từng cuộc họp.
-- Idempotent.
ALTER TABLE okr_initiatives ADD COLUMN IF NOT EXISTS minutes_key text;
CREATE UNIQUE INDEX IF NOT EXISTS okr_init_minutes_key_uidx
  ON okr_initiatives(meeting_id, minutes_key) WHERE minutes_key IS NOT NULL;
