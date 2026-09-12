-- 650_user_chairman.sql — Sửa vai trò ông Vũ Hùng Sơn thành "Chủ tịch" (chairman).
-- Bối cảnh (CFO 12/09): vuhungson@baotinmanhhai.vn là CHỦ TỊCH nhưng đang hiển thị "CEO" → sai chức danh.
-- Role 'chairman' đã được CHECK cho phép ở db/570_role_function_lead.sql (chủ constraint role).
-- Idempotent: chỉ đổi khi đang là 'ceo'/'exec' (không ghi đè nếu sau này đã chỉnh khác). Chạy bằng superuser postgres.
UPDATE okr_users
   SET role = 'chairman', updated_at = now()
 WHERE lower(email) = 'vuhungson@baotinmanhhai.vn'
   AND role IN ('ceo', 'exec');
