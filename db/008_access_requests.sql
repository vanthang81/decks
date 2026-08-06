-- Yêu cầu xin cấp quyền xem deck (từ trang gate). 1 dòng / (deck, email); re-request thì reset pending.
-- Admin duyệt qua nút trong email (token) HOẶC ở trang chi tiết deck; duyệt = cấp grant + gửi link.
BEGIN;
CREATE TABLE IF NOT EXISTS deck_access_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id           uuid NOT NULL REFERENCES deck_decks(id) ON DELETE CASCADE,
  email             text NOT NULL,
  name              text,
  message           text,
  ip                text,
  user_agent        text,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
  action_token_hash text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  decided_at        timestamptz,
  decided_by        text
);
CREATE UNIQUE INDEX IF NOT EXISTS deck_access_requests_deck_email_uidx
  ON deck_access_requests (deck_id, lower(email));
CREATE INDEX IF NOT EXISTS deck_access_requests_deck_idx
  ON deck_access_requests (deck_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON deck_access_requests TO btmh_app;
COMMIT;
