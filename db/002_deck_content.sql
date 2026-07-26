-- Deck content lưu trong DB (cho phép tạo/sửa deck ngay trên admin, KHÔNG cần rebuild image).
-- Nguồn nội dung khi render: DB content (nếu có) > file content/decks/<slug>.html (fallback).
-- Chạy bằng superuser postgres qua docker exec. Idempotent.

ALTER TABLE deck_decks ADD COLUMN IF NOT EXISTS content text;
