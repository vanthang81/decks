-- 560_perm_new_caps.sql — Bổ sung 3 năng lực mới vào perm_groups ĐÃ LƯU (nếu có).
-- Idempotent. Chỉ THÊM (không xoá) → giữ nguyên tuỳ chỉnh cũ của CFO.
--
-- Bối cảnh: strategy.manage / meeting.manage / budget.manage là 3 năng lực MỚI. Ở tầng code,
-- DEFAULT_GROUPS đã gán sẵn cho system_admin + okr_admin, nên nếu CFO CHƯA từng bấm "Lưu phân quyền"
-- (okr_settings chưa có key 'perm_groups') thì mặc định đã áp — migration này KHÔNG cần làm gì.
-- Nếu ĐÃ có bản lưu tuỳ chỉnh, migration gộp 3 cap mới vào 2 nhóm này để áp đúng khuyến nghị.
DO $$
DECLARE
  cur jsonb;
  gk text;
  newcaps text[] := ARRAY['strategy.manage','meeting.manage','budget.manage'];
BEGIN
  SELECT value INTO cur FROM okr_settings WHERE key = 'perm_groups';
  IF cur IS NULL THEN
    RAISE NOTICE 'perm_groups chua luu — mac dinh trong code da gom 3 nang luc moi, bo qua.';
    RETURN;
  END IF;
  FOREACH gk IN ARRAY ARRAY['system_admin', 'okr_admin'] LOOP
    IF cur ? gk THEN
      cur := jsonb_set(
        cur,
        ARRAY[gk],
        (SELECT jsonb_agg(DISTINCT c) FROM (
           SELECT jsonb_array_elements_text(cur->gk) AS c
           UNION
           SELECT unnest(newcaps)
         ) s)
      );
    END IF;
  END LOOP;
  UPDATE okr_settings SET value = cur, updated_at = now() WHERE key = 'perm_groups';
  RAISE NOTICE 'Da bo sung strategy.manage/meeting.manage/budget.manage vao perm_groups (system_admin, okr_admin).';
END $$;
