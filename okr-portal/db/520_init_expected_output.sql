-- 520: KẾT QUẢ ĐẦU RA (Definition of Done) cho công việc (initiative).
-- Ghi rõ "xong là ra cái gì" — tiêu chí nghiệm thu, đi kèm Link minh chứng (evidence_url).
ALTER TABLE okr_initiatives ADD COLUMN IF NOT EXISTS expected_output text;
