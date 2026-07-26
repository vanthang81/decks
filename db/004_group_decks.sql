-- Nhóm được "cấp quyền" một deck ĐỘC LẬP với thành viên: nhóm rỗng vẫn giữ quyền,
-- ai thêm vào nhóm sau sẽ TỰ nhận link cá nhân cho các deck nhóm được cấp.
-- (Trước đây quyền nhóm suy từ các grant của thành viên → nhóm rỗng không giữ được quyền.)
CREATE TABLE IF NOT EXISTS deck_group_decks (
  group_id   uuid NOT NULL REFERENCES deck_groups(id) ON DELETE CASCADE,
  deck_id    uuid NOT NULL REFERENCES deck_decks(id)  ON DELETE CASCADE,
  granted_by text,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, deck_id)
);
CREATE INDEX IF NOT EXISTS deck_group_decks_deck_idx ON deck_group_decks (deck_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON deck_group_decks TO btmh_app;
