-- 200: Bỏ tiền tố tên KHỐI/PHÒNG trong tiêu đề Objective (CFO 01/08).
-- Thông tin đơn vị đã có ở field "Đơn vị phụ trách" (+ icon) → không lặp trong tiêu đề.
-- VD: "Khối Cung ứng: Chất lượng…" → "Chất lượng…";
--     "Phòng Kiểm soát tuân thủ: Khung KSTT…" → "Khung KSTT…".
-- Idempotent: chạy lại không khớp gì nữa.
BEGIN;
-- LƯU Ý: Postgres regex dùng \y cho ranh giới từ ('\b' = backspace) → dùng \s+ cho chắc.
UPDATE okr_objectives
   SET title = btrim(regexp_replace(title, '^\s*(Khối|Phòng|Ban|Bộ phận)\s+[^:]{0,80}:\s*', ''))
 WHERE title ~ '^\s*(Khối|Phòng|Ban|Bộ phận)\s+[^:]{0,80}:\s*';
COMMIT;
