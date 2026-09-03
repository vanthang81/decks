-- 570_role_function_lead.sql — NỚI CHECK role cho phép 'function_lead' (Quản lý chức năng).
-- BỐI CẢNH: vai trò 'function_lead' đã thêm ở code (src/lib/rbac.ts) nhưng CHECK constraint
-- okr_users_role_check (đặt ở 320_role_ceo_cfo.sql) CHƯA có → lưu người dùng vai trò "Quản lý
-- chức năng" bị lỗi ràng buộc (staff/các vai trò cũ vẫn lưu được). Migration này bổ sung.
-- Chạy bằng superuser postgres (ALTER CONSTRAINT cần chủ bảng). Idempotent.
ALTER TABLE okr_users DROP CONSTRAINT IF EXISTS okr_users_role_check;
ALTER TABLE okr_users
  ADD CONSTRAINT okr_users_role_check
  CHECK (role IN ('exec', 'ceo', 'cfo', 'division_lead', 'dept_lead', 'function_lead', 'staff'));
