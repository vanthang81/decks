-- 510: Link MINH CHỨNG cho công việc (initiative) — giống check-in KR (okr_checkins.evidence_url).
-- Cho phép đính 1 URL http/https làm bằng chứng hoàn thành/tiến độ khi cập nhật công việc.
ALTER TABLE okr_initiatives ADD COLUMN IF NOT EXISTS evidence_url text;
