-- 350: Link MINH CHỨNG (evidence) cho check-in — tùy chọn, nếu điền phải là URL hợp lệ (kiểm ở app).
ALTER TABLE okr_checkins ADD COLUMN IF NOT EXISTS evidence_url text;
