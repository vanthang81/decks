-- 470: cuộc họp liên quan NHIỀU khối/phòng + NHIỀU dự án (bảng nối). Cột đơn m.unit_id/m.project_id giữ
-- làm "chính" (tương thích ngược: quyền xem 'unit' + hiển thị cũ); junction chứa TẤT CẢ đơn vị/dự án liên quan.
CREATE TABLE IF NOT EXISTS okr_meeting_units (
  meeting_id uuid NOT NULL REFERENCES okr_meetings(id) ON DELETE CASCADE,
  unit_id    uuid NOT NULL REFERENCES okr_units(id) ON DELETE CASCADE,
  PRIMARY KEY (meeting_id, unit_id)
);
CREATE TABLE IF NOT EXISTS okr_meeting_projects (
  meeting_id uuid NOT NULL REFERENCES okr_meetings(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES okr_projects(id) ON DELETE CASCADE,
  PRIMARY KEY (meeting_id, project_id)
);
CREATE INDEX IF NOT EXISTS okr_meeting_units_unit_idx ON okr_meeting_units (unit_id);
CREATE INDEX IF NOT EXISTS okr_meeting_projects_project_idx ON okr_meeting_projects (project_id);
-- Chuyển liên kết đơn hiện có vào bảng nối (idempotent).
INSERT INTO okr_meeting_units (meeting_id, unit_id)
  SELECT id, unit_id FROM okr_meetings WHERE unit_id IS NOT NULL ON CONFLICT DO NOTHING;
INSERT INTO okr_meeting_projects (meeting_id, project_id)
  SELECT id, project_id FROM okr_meetings WHERE project_id IS NOT NULL ON CONFLICT DO NOTHING;
GRANT SELECT, INSERT, UPDATE, DELETE ON okr_meeting_units, okr_meeting_projects TO btmh_app;
