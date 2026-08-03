-- 340: PROJECT CHARTER (điều lệ dự án theo best-practice PM) — lưu jsonb trên okr_projects.
-- Các trường: background · objective · scope_in · scope_out · deliverables · milestones ·
--             stakeholders · sponsor · risks · success. Idempotent.
ALTER TABLE okr_projects ADD COLUMN IF NOT EXISTS charter jsonb NOT NULL DEFAULT '{}'::jsonb;
