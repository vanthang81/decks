-- 440: Cho phép VIỆC CÁ NHÂN (không gắn OKR/dự án/cuộc họp) — mỗi người tự tạo việc riêng cho mình.
-- Trước đây okr_init_attach_ck bắt buộc gắn OKR/KR/cuộc họp/dự án → nhân viên (không sửa được OKR
-- nào, không quản dự án nào) KHÔNG có "điểm neo" hợp lệ nên không tạo nổi việc cá nhân. Nới ràng buộc:
-- việc CHỈ cần có NGƯỜI PHỤ TRÁCH (owner_email) là hợp lệ. Idempotent (drop rồi add lại).

ALTER TABLE okr_initiatives DROP CONSTRAINT IF EXISTS okr_init_attach_ck;
ALTER TABLE okr_initiatives ADD CONSTRAINT okr_init_attach_ck
  CHECK (objective_id IS NOT NULL OR key_result_id IS NOT NULL
         OR meeting_id IS NOT NULL OR project_id IS NOT NULL
         OR owner_email IS NOT NULL);
