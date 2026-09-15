-- CFO 15/09: Nhóm "Quản trị hệ thống" (system_admin) được REVIEW TOÀN CÔNG TY + edit mọi OKR.
-- Trước đây 'task.viewall' (xem mọi việc) + 'user.view360' (hồ sơ 360°) bị CHẶN CỨNG khỏi system_admin.
-- Nay là năng lực CẤU HÌNH ĐƯỢC (mặc định BẬT). Nếu cấu hình phân quyền ĐÃ LƯU trong okr_settings
-- có nhóm system_admin (lưu theo luật cũ, thiếu 2 cap này) → BỔ SUNG vào để hiệu lực ngay sau deploy.
-- Idempotent: chỉ chạy khi có key perm_groups + system_admin là mảng + CHƯA chứa đủ 2 cap.
UPDATE okr_settings
   SET value = jsonb_set(
         value,
         '{system_admin}',
         COALESCE(value->'system_admin', '[]'::jsonb) || '["task.viewall","user.view360"]'::jsonb
       ),
       updated_at = now()
 WHERE key = 'perm_groups'
   AND jsonb_typeof(value->'system_admin') = 'array'
   AND NOT (value->'system_admin' @> '["task.viewall","user.view360"]'::jsonb);
