-- 160: Hệ thống BÌNH LUẬN (comment/reply/@mention) + THÔNG BÁO (notification center).
-- Gắn cho Objective / Key Result / Công việc (initiative). Idempotent.

CREATE TABLE IF NOT EXISTS okr_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('objective','key_result','initiative')),
  entity_id   uuid NOT NULL,
  parent_id   uuid REFERENCES okr_comments(id) ON DELETE CASCADE,
  author_email text,
  body        text NOT NULL,
  mentions    text[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);
CREATE INDEX IF NOT EXISTS idx_okr_comments_entity ON okr_comments(entity_type, entity_id, created_at);

CREATE TABLE IF NOT EXISTS okr_notifications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  type           text NOT NULL,          -- 'mention' | 'reply'
  entity_type    text,
  entity_id      uuid,
  comment_id     uuid REFERENCES okr_comments(id) ON DELETE CASCADE,
  actor_email    text,
  actor_name     text,
  preview        text,
  link           text,
  is_read        boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_okr_notifs_recipient ON okr_notifications(recipient_email, is_read, created_at DESC);

-- Tuỳ chọn nhận email khi được nhắc (mặc định bật).
ALTER TABLE okr_users ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT true;

GRANT SELECT, INSERT, UPDATE, DELETE ON okr_comments TO btmh_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON okr_notifications TO btmh_app;
