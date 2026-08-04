-- Nhật ký lỗi hệ thống: bắt các lỗi server/render (digest) để tự phát hiện & sửa nhanh.
-- Client (error boundary) POST /api/errlog → ghi vào đây; admin xem ở /admin/errors.
-- Gộp theo digest (unique) để không phình khi 1 lỗi lặp — chỉ tăng `count` + cập nhật thời điểm.
BEGIN;

CREATE TABLE IF NOT EXISTS okr_error_log (
  id          bigserial PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  kind        text NOT NULL DEFAULT 'client',   -- 'client' (báo từ trình duyệt) / 'server'
  path        text,
  digest      text,                              -- mã digest Next.js để đối chiếu log container
  message     text,
  detail      text,
  user_email  text,
  count       integer NOT NULL DEFAULT 1,
  resolved    boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS okr_error_log_created_idx ON okr_error_log (created_at DESC);
-- Gộp theo digest (khi có): cùng digest → tăng count thay vì thêm dòng mới.
CREATE UNIQUE INDEX IF NOT EXISTS okr_error_log_digest_uidx ON okr_error_log (digest) WHERE digest IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON okr_error_log TO btmh_app;
GRANT USAGE, SELECT ON SEQUENCE okr_error_log_id_seq TO btmh_app;

COMMIT;
