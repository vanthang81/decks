-- Lưu thêm mật khẩu deck ở dạng ĐỌC ĐƯỢC (chỉ admin xem ở trang quản trị) để có thể xem lại / gửi lại.
-- Mật khẩu deck là "mã cửa" dùng chung admin chủ động phát — KHÁC mật khẩu đăng nhập cá nhân. Vẫn giữ
-- password_hash để verify. Cột này KHÔNG nằm trong DECK_COLS nên không lộ ở list/gallery, chỉ đọc qua
-- getDeckPassword() ở trang chi tiết deck (đã gác admin is_active).
ALTER TABLE deck_decks ADD COLUMN IF NOT EXISTS password_plain text;
