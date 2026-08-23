-- 011: Bật/tắt watermark theo 3 cấp (deck / nhóm / từng người), most-specific-wins.
--   deck_decks.watermark  : mặc định của deck (true = có watermark). NOT NULL default true.
--   deck_groups.watermark : override cho nhóm (NULL = kế thừa deck).
--   deck_grants.watermark : override cho 1 (deck, người xem) (NULL = kế thừa nhóm/deck).
-- Hiệu lực khi xem = grant.watermark ?? group.watermark ?? deck.watermark.
-- "Tắt watermark" = bỏ lớp watermark HIỂN THỊ (ô chéo + thanh định danh) nhưng GIỮ kiểm soát truy cập,
-- chặn tải/in và ghi log — chỉ ẩn dấu định danh.
ALTER TABLE deck_decks  ADD COLUMN IF NOT EXISTS watermark boolean NOT NULL DEFAULT true;
ALTER TABLE deck_groups ADD COLUMN IF NOT EXISTS watermark boolean;   -- NULL = kế thừa deck
ALTER TABLE deck_grants ADD COLUMN IF NOT EXISTS watermark boolean;   -- NULL = kế thừa nhóm/deck
