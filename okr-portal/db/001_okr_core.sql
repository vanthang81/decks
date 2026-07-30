-- ============================================================================
-- OKR Portal — schema lõi (Phase 1)
-- DB: btmh_data (dùng chung với price-engine/decks). Prefix bảng: okr_
-- Chạy bằng SUPERUSER postgres (btmh_app KHÔNG có quyền DDL), sau đó GRANT
-- cho btmh_app (xem 002_grants.sql). An toàn chạy lại (idempotent).
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- 1) Cây tổ chức: công ty → khối → phòng (đệ quy qua parent_id)
--    type: 'company' (gốc, 1 node) | 'division' (khối) | 'department' (phòng)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS okr_units (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  code       text UNIQUE,                      -- mã ngắn (VD: BTMH, KD, MKT)
  type       text NOT NULL CHECK (type IN ('company','division','department')),
  parent_id  uuid REFERENCES okr_units(id) ON DELETE CASCADE,
  sort       int NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS okr_units_parent_idx ON okr_units (parent_id);

-- ----------------------------------------------------------------------------
-- 2) Người dùng (allowlist Google email) + vai trò theo cây tổ chức
--    role: 'exec' (CEO/CFO — toàn quyền) > 'division_lead' (GĐ khối)
--        > 'dept_lead' (trưởng phòng) > 'staff' (nhân viên)
--    unit_id = đơn vị "nhà" của người này (khối/phòng họ thuộc về)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS okr_users (
  email        text PRIMARY KEY,
  display_name text,
  title        text,                            -- chức danh hiển thị
  role         text NOT NULL DEFAULT 'staff'
                 CHECK (role IN ('exec','division_lead','dept_lead','staff')),
  unit_id      uuid REFERENCES okr_units(id) ON DELETE SET NULL,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS okr_users_unit_idx ON okr_users (unit_id);

-- ----------------------------------------------------------------------------
-- 3) Kỳ OKR (quý / năm)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS okr_periods (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,              -- VD 'Q3-2026', 'FY2026'
  kind       text NOT NULL DEFAULT 'quarter' CHECK (kind IN ('quarter','year')),
  starts_on  date NOT NULL,
  ends_on    date NOT NULL,
  status     text NOT NULL DEFAULT 'planning'
               CHECK (status IN ('planning','active','closed')),
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Chỉ 1 kỳ được đánh dấu "hiện tại".
CREATE UNIQUE INDEX IF NOT EXISTS okr_periods_current_uidx
  ON okr_periods ((is_current)) WHERE is_current;

-- ----------------------------------------------------------------------------
-- 4) Objective (Mục tiêu). Cascade: parent_id trỏ lên objective cấp trên.
--    level: company | division | department | individual
--    unit_id: đơn vị sở hữu (company/division/department). NULL với individual.
--    owner_email: người chịu trách nhiệm (bắt buộc với individual; tùy chọn khác).
--    progress: % hoàn thành (0..100), roll-up từ Key Results (cache).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS okr_objectives (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id   uuid NOT NULL REFERENCES okr_periods(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES okr_objectives(id) ON DELETE SET NULL,
  level       text NOT NULL CHECK (level IN ('company','division','department','individual')),
  unit_id     uuid REFERENCES okr_units(id) ON DELETE SET NULL,
  owner_email text REFERENCES okr_users(email) ON DELETE SET NULL,
  title       text NOT NULL,
  description text,
  status      text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','active','done','archived')),
  progress    numeric(6,2) NOT NULL DEFAULT 0,
  sort        int NOT NULL DEFAULT 0,
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS okr_obj_period_idx ON okr_objectives (period_id);
CREATE INDEX IF NOT EXISTS okr_obj_parent_idx ON okr_objectives (parent_id);
CREATE INDEX IF NOT EXISTS okr_obj_unit_idx   ON okr_objectives (unit_id);
CREATE INDEX IF NOT EXISTS okr_obj_owner_idx  ON okr_objectives (lower(owner_email));

-- ----------------------------------------------------------------------------
-- 5) Key Result (Kết quả then chốt) — số đo của objective.
--    metric_type: number | percent | currency | boolean
--    direction: increase (càng cao càng tốt) | decrease (càng thấp càng tốt)
--    kpi_source: khóa nguồn tự động kéo actual (xem src/lib/kpi.ts). NULL = nhập tay.
--    progress: 0..100 tính từ start→current→target (cache).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS okr_key_results (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id  uuid NOT NULL REFERENCES okr_objectives(id) ON DELETE CASCADE,
  title         text NOT NULL,
  metric_type   text NOT NULL DEFAULT 'number'
                  CHECK (metric_type IN ('number','percent','currency','boolean')),
  direction     text NOT NULL DEFAULT 'increase'
                  CHECK (direction IN ('increase','decrease')),
  unit_label    text,                            -- 'tỷ', 'chỉ', '%', 'HĐ'...
  start_value   numeric(20,4) NOT NULL DEFAULT 0,
  target_value  numeric(20,4) NOT NULL DEFAULT 100,
  current_value numeric(20,4) NOT NULL DEFAULT 0,
  weight        numeric(6,2) NOT NULL DEFAULT 1,
  kpi_source    text,                            -- khóa registry (kpi.ts), NULL=thủ công
  progress      numeric(6,2) NOT NULL DEFAULT 0,
  sort          int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS okr_kr_obj_idx ON okr_key_results (objective_id);

-- ----------------------------------------------------------------------------
-- 6) Initiative / Kế hoạch hành động — việc cụ thể để đạt KR/Objective.
--    Gắn vào key_result_id HOẶC objective_id (một trong hai, hoặc cả hai).
--    budget_planned / budget_actual: ngân sách kế hoạch vs thực chi (VND).
--    budget_source: khóa nối pe_cf_budget (đọc thực chi tự động — phase sau).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS okr_initiatives (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id   uuid REFERENCES okr_objectives(id) ON DELETE CASCADE,
  key_result_id  uuid REFERENCES okr_key_results(id) ON DELETE CASCADE,
  title          text NOT NULL,
  description    text,
  owner_email    text REFERENCES okr_users(email) ON DELETE SET NULL,
  status         text NOT NULL DEFAULT 'todo'
                   CHECK (status IN ('todo','in_progress','blocked','done','canceled')),
  priority       text NOT NULL DEFAULT 'medium'
                   CHECK (priority IN ('low','medium','high')),
  progress       numeric(6,2) NOT NULL DEFAULT 0,
  start_on       date,
  due_on         date,
  done_on        date,
  budget_planned numeric(20,2) NOT NULL DEFAULT 0,
  budget_actual  numeric(20,2) NOT NULL DEFAULT 0,
  budget_currency text NOT NULL DEFAULT 'VND',
  budget_source  text,
  sort           int NOT NULL DEFAULT 0,
  created_by     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT okr_init_attach_ck CHECK (objective_id IS NOT NULL OR key_result_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS okr_init_obj_idx   ON okr_initiatives (objective_id);
CREATE INDEX IF NOT EXISTS okr_init_kr_idx    ON okr_initiatives (key_result_id);
CREATE INDEX IF NOT EXISTS okr_init_owner_idx ON okr_initiatives (lower(owner_email));

-- ----------------------------------------------------------------------------
-- 7) Check-in — cập nhật tiến độ định kỳ (thường hàng tuần) cho KR.
--    confidence: on_track | at_risk | off_track
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS okr_checkins (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id uuid REFERENCES okr_key_results(id) ON DELETE CASCADE,
  objective_id  uuid REFERENCES okr_objectives(id) ON DELETE CASCADE,
  value         numeric(20,4),                   -- giá trị current_value tại thời điểm check-in
  confidence    text NOT NULL DEFAULT 'on_track'
                  CHECK (confidence IN ('on_track','at_risk','off_track')),
  note          text,
  author_email  text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS okr_checkin_kr_idx  ON okr_checkins (key_result_id);
CREATE INDEX IF NOT EXISTS okr_checkin_obj_idx ON okr_checkins (objective_id);

-- ----------------------------------------------------------------------------
-- 8) Nhật ký (audit nhẹ) — ai làm gì
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS okr_audit_log (
  id         bigserial PRIMARY KEY,
  actor      text,
  action     text NOT NULL,
  entity     text,
  entity_id  text,
  detail     jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS okr_audit_created_idx ON okr_audit_log (created_at DESC);

COMMIT;
