-- 180: Dọn TIỀN TỐ MÃ/PREFIX thủ công trong tiêu đề (CFO 01/08).
-- Mã O/KR/H nay do hệ thống TỰ SINH (codes.ts, hiện dạng badge, vd CU-01.KR4).
-- Người dùng chỉ viết TEXT → bỏ các tiền tố cũ nhúng trong title:
--   Objective: "2026 — ...", "2026: ..."   → bỏ tiền tố năm
--   Key Result: "M-01: ...", "M-24: ..."    → bỏ tiền tố M-xx
--   Initiative/Action: "H-01: ...", "H-02: " → bỏ tiền tố H-xx
-- Idempotent: chạy lại không khớp gì nữa (đã sạch).
BEGIN;

UPDATE okr_objectives
   SET title = btrim(regexp_replace(title, '^\s*[0-9]{4}\s*(—|–|-|:)\s*', ''))
 WHERE title ~ '^\s*[0-9]{4}\s*(—|–|-|:)\s*';

UPDATE okr_key_results
   SET title = btrim(regexp_replace(title, '^\s*M-?[0-9]+\s*:\s*', ''))
 WHERE title ~ '^\s*M-?[0-9]+\s*:\s*';

UPDATE okr_initiatives
   SET title = btrim(regexp_replace(title, '^\s*H-?[0-9]+\s*:\s*', ''))
 WHERE title ~ '^\s*H-?[0-9]+\s*:\s*';

COMMIT;
