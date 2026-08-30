-- Nhật ký hoạt động hệ thống (ai đăng nhập/làm gì) — dùng lại bảng okr_audit_log.
-- Thêm index cho lọc theo NGƯỜI + theo HÀNH ĐỘNG (trang /admin/activity), và cấp quyền DELETE
-- cho user runtime btmh_app để tự dọn log (retention: xoá thủ công + cron tự xoá sau N ngày).
-- Chạy bằng SUPERUSER postgres (docker exec). Idempotent.

CREATE INDEX IF NOT EXISTS okr_audit_actor_idx  ON okr_audit_log (actor, created_at DESC);
CREATE INDEX IF NOT EXISTS okr_audit_action_idx ON okr_audit_log (action, created_at DESC);

GRANT DELETE ON okr_audit_log TO btmh_app;
