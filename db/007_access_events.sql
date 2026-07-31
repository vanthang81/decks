-- Mở rộng CHECK của deck_access_log.event: bổ sung pw_ok/pw_fail (mật khẩu deck) đã dùng trong code
-- nhưng bị CHECK cũ chặn (log âm thầm rớt), và link_resend (tự gửi lại link cá nhân qua email ở trang gate).
-- Idempotent: drop CHECK cũ (tên mặc định) rồi thêm lại bản đầy đủ.
BEGIN;
ALTER TABLE deck_access_log DROP CONSTRAINT IF EXISTS deck_access_log_event_check;
ALTER TABLE deck_access_log ADD CONSTRAINT deck_access_log_event_check
  CHECK (event IN ('link_open','otp_sent','otp_ok','view','slide','denied','revoked_hit','pw_ok','pw_fail','link_resend'));
COMMIT;
