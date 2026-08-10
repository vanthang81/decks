-- Link "Nguồn / Chat gốc" (tuỳ chọn) cho mỗi deck: để mở lại cuộc chat Claude (hoặc nguồn khác) đã tạo deck,
-- tiện điều chỉnh/cập nhật sau. Chỉ hiện ở trang quản trị (admin). Đặt tay ở admin hoặc truyền qua API/MCP.
ALTER TABLE deck_decks ADD COLUMN IF NOT EXISTS source_url text;
