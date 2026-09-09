-- Backfill ĐƠN VỊ cho công việc đang TRỐNG đơn vị nhưng ĐÃ có người phụ trách (CFO 09/09):
-- điền unit_id = phòng của người được giao. Idempotent (chỉ đụng dòng unit_id IS NULL) → deploy
-- re-run vô hại. Từ nay createInitiative/editInitiative/updateInitiative cũng tự điền theo owner.
UPDATE okr_initiatives i
   SET unit_id = u.unit_id, updated_at = now()
  FROM okr_users u
 WHERE lower(i.owner_email) = lower(u.email)
   AND i.unit_id IS NULL
   AND u.unit_id IS NOT NULL;
