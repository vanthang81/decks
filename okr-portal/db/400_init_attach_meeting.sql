-- 400: Nới ràng buộc GẮN KẾT của công việc (okr_initiatives) — cho phép việc gắn CUỘC HỌP
-- hoặc DỰ ÁN mà KHÔNG cần gắn OKR (vd "next action" thuần của cuộc họp). Trước đây bắt buộc
-- objective_id HOẶC key_result_id → chặn việc thuần cuộc họp. Idempotent (drop rồi add lại).

ALTER TABLE okr_initiatives DROP CONSTRAINT IF EXISTS okr_init_attach_ck;
ALTER TABLE okr_initiatives ADD CONSTRAINT okr_init_attach_ck
  CHECK (objective_id IS NOT NULL OR key_result_id IS NOT NULL
         OR meeting_id IS NOT NULL OR project_id IS NOT NULL);
