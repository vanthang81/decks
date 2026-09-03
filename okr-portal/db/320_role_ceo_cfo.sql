-- 320_role_ceo_cfo.sql — TÁCH vai trò gộp "CEO/CFO" (role='exec') thành 2 vai trò riêng: 'ceo' và 'cfo'.
-- Chạy bằng superuser postgres. Idempotent (re-run mỗi lần deploy).
--
-- ⚠ RÀNG BUỘC role KHÔNG còn đặt ở đây nữa (CFO 03/09): deploy re-run MỌI migration ≥320 mỗi lần,
-- mà `ALTER TABLE ADD CONSTRAINT` re-validate TOÀN bảng ngay lập tức. Nếu file này re-add CHECK với
-- tập role CŨ (thiếu function_lead…) trong khi bảng đã có dòng dùng role mới → ADD vỡ ("violated by
-- some row") và (vì DROP ở câu trước đã autocommit) constraint bị mất. ⇒ CHECK role nay có DUY NHẤT
-- MỘT CHỦ ở migration MỚI NHẤT (db/570_role_function_lead.sql) với ĐỦ tập role hiện hành. Thêm role
-- mới ⇒ SỬA file 570 đó, KHÔNG re-add ở đây.

-- Chuyển các user 'exec' hiện có sang 'cfo' (đều là CFO theo chức danh) → bỏ nhãn gộp "CEO/CFO".
-- CEO/CFO có thể chỉnh lại từng người (CEO hay CFO) ở màn Người dùng → nút "Sửa".
UPDATE okr_users SET role = 'cfo', updated_at = now() WHERE role = 'exec';
