-- Deck Access Control — schema (Phase 1)
-- Chạy bằng cred "Postgres Admin BTMH" qua n8n (btmh_app KHÔNG có quyền DDL),
-- sau đó GRANT cho btmh_app (app runtime user). DB: btmh_data. Prefix: deck_.
-- An toàn chạy lại (IF NOT EXISTS / idempotent).

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- 1) Allowlist đăng nhập quản trị (Google email)
CREATE TABLE IF NOT EXISTS deck_admins (
  email        text PRIMARY KEY,
  display_name text,
  role         text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','editor')),
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 2) Deck (metadata; nội dung nằm ở file content/decks/<slug>.html trong repo)
CREATE TABLE IF NOT EXISTS deck_decks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  title        text NOT NULL,
  description  text,
  visibility   text NOT NULL DEFAULT 'protected' CHECK (visibility IN ('public','protected')),
  require_otp  boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  created_by   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 3) Danh bạ người xem
CREATE TABLE IF NOT EXISTS deck_viewers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  name       text,
  company    text,
  note       text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS deck_viewers_email_uidx ON deck_viewers (lower(email));

-- 4) Grant = (viewer ↔ deck) + link cá nhân (chỉ lưu sha256(token))
CREATE TABLE IF NOT EXISTS deck_grants (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id    uuid NOT NULL REFERENCES deck_decks(id)   ON DELETE CASCADE,
  viewer_id  uuid NOT NULL REFERENCES deck_viewers(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  status     text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  expires_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (deck_id, viewer_id)
);
CREATE INDEX IF NOT EXISTS deck_grants_deck_idx   ON deck_grants (deck_id);
CREATE INDEX IF NOT EXISTS deck_grants_viewer_idx ON deck_grants (viewer_id);

-- 5) Nhật ký truy cập
CREATE TABLE IF NOT EXISTS deck_access_log (
  id         bigserial PRIMARY KEY,
  deck_id    uuid REFERENCES deck_decks(id)   ON DELETE SET NULL,
  viewer_id  uuid REFERENCES deck_viewers(id) ON DELETE SET NULL,
  grant_id   uuid REFERENCES deck_grants(id)  ON DELETE SET NULL,
  event      text NOT NULL CHECK (event IN
              ('link_open','otp_sent','otp_ok','view','slide','denied','revoked_hit')),
  slide_no   int,
  ip         text,
  user_agent text,
  meta       jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deck_access_log_deck_idx   ON deck_access_log (deck_id, created_at DESC);
CREATE INDEX IF NOT EXISTS deck_access_log_viewer_idx ON deck_access_log (viewer_id, created_at DESC);

-- 6) OTP email (khi deck.require_otp)
CREATE TABLE IF NOT EXISTS deck_otp (
  id         bigserial PRIMARY KEY,
  grant_id   uuid NOT NULL REFERENCES deck_grants(id) ON DELETE CASCADE,
  code_hash  text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts   int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deck_otp_grant_idx ON deck_otp (grant_id, created_at DESC);

-- GRANT cho app runtime user (btmh_app): CRUD dữ liệu, KHÔNG cấp DDL.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  deck_admins, deck_decks, deck_viewers, deck_grants, deck_access_log, deck_otp
  TO btmh_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO btmh_app;

-- Seed admin đầu tiên (CFO). Đổi/ bổ sung email khác qua admin UI sau.
INSERT INTO deck_admins (email, display_name, role)
VALUES ('vanthang81@gmail.com', 'Thắng Nguyễn (CFO)', 'admin')
ON CONFLICT (email) DO NOTHING;

COMMIT;
