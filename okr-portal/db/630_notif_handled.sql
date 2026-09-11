-- 630_notif_handled.sql — Trạng thái "đã xử lý" cho thông báo (idempotent)
-- Ghi lại thông báo đã được người nhận TRẢ LỜI / DUYỆT / TỪ CHỐI ngay tại chuông →
-- hiển thị nhãn bền vững "✓ Đã trả lời / Đã duyệt / ✕ Đã từ chối" (không mất khi tải lại).
-- is_read (đã có) = đã đọc; handled_kind = hành động đã làm với thông báo.
ALTER TABLE okr_notifications ADD COLUMN IF NOT EXISTS handled_at   timestamptz;
ALTER TABLE okr_notifications ADD COLUMN IF NOT EXISTS handled_kind text; -- 'replied' | 'approved' | 'denied'
