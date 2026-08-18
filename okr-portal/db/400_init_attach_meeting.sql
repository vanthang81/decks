-- 400: Nới ràng buộc GẮN KẾT của công việc (okr_initiatives) — cho phép việc gắn CUỘC HỌP
-- hoặc DỰ ÁN mà KHÔNG cần gắn OKR (vd "next action" thuần của cuộc họp). Trước đây bắt buộc
-- objective_id HOẶC key_result_id → chặn việc thuần cuộc họp. Idempotent (drop rồi add lại).
--
-- ⚠ ĐỒNG BỘ với 440_personal_task_anchor: PHẢI kèm điều kiện `owner_email IS NOT NULL` (việc cá
--   nhân). Vì các migration chạy LẠI theo thứ tự MỖI lần deploy (400 trước 440), nếu 400 add bản
--   CHẶT (thiếu owner_email) thì khi ĐÃ có việc cá nhân, ADD CONSTRAINT ở 400 sẽ bị VI PHẠM bởi
--   các dòng đó → deploy hỏng NGAY ở bước migrate (chưa tới 440). Giữ 400 = 440 để mọi thứ tự đều hợp lệ.

ALTER TABLE okr_initiatives DROP CONSTRAINT IF EXISTS okr_init_attach_ck;
ALTER TABLE okr_initiatives ADD CONSTRAINT okr_init_attach_ck
  CHECK (objective_id IS NOT NULL OR key_result_id IS NOT NULL
         OR meeting_id IS NOT NULL OR project_id IS NOT NULL
         OR owner_email IS NOT NULL);
