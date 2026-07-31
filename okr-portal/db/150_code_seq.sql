-- 150: Bộ ĐẾM BỀN cho mã (O/KR/H/Dự án) — tăng đơn điệu, atomic, KHÔNG tái dùng số
-- đã cấp (kể cả sau khi xoá). Thay cách "quét max + 1" (có thể tái dùng khi xoá mục cao nhất
-- và không an toàn khi tạo đồng thời). Idempotent.

CREATE TABLE IF NOT EXISTS okr_code_seq (
  scope_key text PRIMARY KEY,
  last_val  int NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE ON okr_code_seq TO btmh_app;

-- Seed từ dữ liệu hiện có để mã mới tiếp nối, không cấp lại số đã dùng.
-- Objective: scope 'O:<prefix>' lấy n từ '<prefix>-O<n>'.
INSERT INTO okr_code_seq(scope_key, last_val)
SELECT 'O:' || substring(code from '^(.*)-O[0-9]+$'),
       max((substring(code from '-O([0-9]+)$'))::int)
FROM okr_objectives WHERE code ~ '-O[0-9]+$'
GROUP BY 1
ON CONFLICT (scope_key) DO UPDATE SET last_val = GREATEST(okr_code_seq.last_val, EXCLUDED.last_val);

-- Key Result: scope 'KR:<objcode>'.
INSERT INTO okr_code_seq(scope_key, last_val)
SELECT 'KR:' || substring(code from '^(.*)\.KR[0-9]+$'),
       max((substring(code from '\.KR([0-9]+)$'))::int)
FROM okr_key_results WHERE code ~ '\.KR[0-9]+$'
GROUP BY 1
ON CONFLICT (scope_key) DO UPDATE SET last_val = GREATEST(okr_code_seq.last_val, EXCLUDED.last_val);

-- Initiative/công việc: scope 'H:<objcode>'.
INSERT INTO okr_code_seq(scope_key, last_val)
SELECT 'H:' || substring(code from '^(.*)\.H[0-9]+$'),
       max((substring(code from '\.H([0-9]+)$'))::int)
FROM okr_initiatives WHERE code ~ '\.H[0-9]+$'
GROUP BY 1
ON CONFLICT (scope_key) DO UPDATE SET last_val = GREATEST(okr_code_seq.last_val, EXCLUDED.last_val);

-- Dự án: scope 'PRJ' (mã PRJ-<nn> toàn cục).
INSERT INTO okr_code_seq(scope_key, last_val)
SELECT 'PRJ', max((substring(code from 'PRJ-([0-9]+)$'))::int)
FROM okr_projects WHERE code ~ 'PRJ-[0-9]+$'
HAVING count(*) > 0
ON CONFLICT (scope_key) DO UPDATE SET last_val = GREATEST(okr_code_seq.last_val, EXCLUDED.last_val);
