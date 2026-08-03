-- 360: Module CUỘC HỌP — biên bản (minutes) + hành động (tasks) + phân quyền xem theo người tham gia/watcher.
-- Idempotent. Chạy bằng superuser postgres.

CREATE TABLE IF NOT EXISTS okr_meetings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text UNIQUE,
  title        text NOT NULL,
  type         text NOT NULL DEFAULT 'other',   -- project_checkin | exec_wbr | exec_mbr | division | department | ibp | other
  period_id    uuid REFERENCES okr_periods(id) ON DELETE SET NULL,
  unit_id      uuid REFERENCES okr_units(id) ON DELETE SET NULL,
  project_id   uuid REFERENCES okr_projects(id) ON DELETE SET NULL,
  owner_email  text,          -- chủ trì
  secretary_email text,       -- thư ký
  meeting_at   timestamptz,
  location     text,
  status       text NOT NULL DEFAULT 'scheduled', -- scheduled | held | cancelled
  visibility   text NOT NULL DEFAULT 'participants', -- participants | unit | company
  agenda       text,
  minutes      text,          -- biên bản
  decisions    text,          -- quyết định chính
  created_by   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS okr_meetings_at_idx ON okr_meetings (meeting_at DESC);

-- Người tham gia / theo dõi (watcher) — dùng để phân quyền xem nội dung.
CREATE TABLE IF NOT EXISTS okr_meeting_participants (
  meeting_id uuid NOT NULL REFERENCES okr_meetings(id) ON DELETE CASCADE,
  email      text NOT NULL,
  role       text NOT NULL DEFAULT 'participant', -- host | secretary | participant | watcher
  PRIMARY KEY (meeting_id, email)
);

-- Yêu cầu xem nội dung cuộc họp (khi user chưa được phân quyền) → owner/thư ký duyệt.
CREATE TABLE IF NOT EXISTS okr_meeting_access_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id     uuid NOT NULL REFERENCES okr_meetings(id) ON DELETE CASCADE,
  requester_email text NOT NULL,
  reason         text,
  status         text NOT NULL DEFAULT 'pending', -- pending | approved | denied
  decided_by     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, requester_email)
);

-- Action items (next actions) từ cuộc họp = okr_initiatives gắn meeting_id.
ALTER TABLE okr_initiatives ADD COLUMN IF NOT EXISTS meeting_id uuid REFERENCES okr_meetings(id) ON DELETE SET NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON okr_meetings TO btmh_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON okr_meeting_participants TO btmh_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON okr_meeting_access_requests TO btmh_app;
