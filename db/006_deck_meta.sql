-- Metadata phân loại deck cho thư viện: danh mục, thẻ, công ty + ảnh preview (thumbnail).
-- thumbnail = data-URI JPEG (chụp slide đầu bằng browserless), phục vụ qua /api/thumb/<id>.
ALTER TABLE deck_decks ADD COLUMN IF NOT EXISTS category  text;
ALTER TABLE deck_decks ADD COLUMN IF NOT EXISTS tags      text[] NOT NULL DEFAULT '{}';
ALTER TABLE deck_decks ADD COLUMN IF NOT EXISTS company   text   NOT NULL DEFAULT 'BTMH';
ALTER TABLE deck_decks ADD COLUMN IF NOT EXISTS thumbnail text;
