-- Mật khẩu deck (tùy chọn): 1 mật khẩu chung cho deck — ai có link + mật khẩu là xem được,
-- không cần cấp link cá nhân. Lưu SHA-256 (KHÔNG lưu mật khẩu thô), giống token/OTP.
-- Độc lập với public/protected: là một lớp khoá chồng lên (xem docs/ACCESS-CONTROL.md).
ALTER TABLE deck_decks ADD COLUMN IF NOT EXISTS password_hash text;
