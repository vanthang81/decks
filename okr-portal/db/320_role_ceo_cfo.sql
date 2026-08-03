-- 320_role_ceo_cfo.sql — TÁCH vai trò gộp "CEO/CFO" (role='exec') thành 2 vai trò riêng: 'ceo' và 'cfo'.
-- Chạy bằng superuser postgres (ALTER CONSTRAINT cần chủ bảng). Idempotent.
-- 1) Nới CHECK role cho phép ceo/cfo (vẫn giữ 'exec' cũ để không vỡ dữ liệu lịch sử).
ALTER TABLE okr_users DROP CONSTRAINT IF EXISTS okr_users_role_check;
ALTER TABLE okr_users
  ADD CONSTRAINT okr_users_role_check
  CHECK (role IN ('exec', 'ceo', 'cfo', 'division_lead', 'dept_lead', 'staff'));

-- 2) Chuyển các user 'exec' hiện có sang 'cfo' (đều là CFO theo chức danh) → bỏ nhãn gộp "CEO/CFO".
--    CEO/CFO có thể chỉnh lại từng người (CEO hay CFO) ở màn Người dùng → nút "Sửa".
UPDATE okr_users SET role = 'cfo', updated_at = now() WHERE role = 'exec';
