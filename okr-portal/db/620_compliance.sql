-- 620: PHÂN HỆ BẢNG KIỂM TUÂN THỦ (CFO 10/09 — yêu cầu Phòng Pháp chế).
-- Mô hình 3 lớp: TIÊU CHÍ rà soát (nguồn gốc, import Excel, KHÔNG phải Task)
--   → VẤN ĐỀ tuân thủ (tự sinh khi "Chưa tuân thủ/Vi phạm")
--     → HÀNH ĐỘNG khắc phục = Task (okr_initiatives, thêm cột issue_id).
-- Module BẬT/TẮT theo từng dự án (compliance_enabled) → dùng lại cho mọi dự án tuân thủ.
-- Chạy superuser postgres (deploy auto glob db/*.sql ≥320). Idempotent.

-- 1) Cờ bật module theo dự án.
ALTER TABLE okr_projects ADD COLUMN IF NOT EXISTS compliance_enabled boolean NOT NULL DEFAULT false;

-- 2) Vai trò CHỨC NĂNG theo từng dự án (cho workflow thẩm định): phap_che | kstt | qlda.
--    "Đơn vị" không nằm ở đây — đơn vị = người phụ trách (owner) của tiêu chí/hành động.
CREATE TABLE IF NOT EXISTS okr_project_functions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES okr_projects(id) ON DELETE CASCADE,
  email       text NOT NULL,
  fn          text NOT NULL CHECK (fn IN ('phap_che','kstt','qlda')),
  added_by    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS okr_pfn_uidx ON okr_project_functions (project_id, lower(email), fn);
CREATE INDEX IF NOT EXISTS okr_pfn_proj_idx ON okr_project_functions (project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON okr_project_functions TO btmh_app;

-- 3) TIÊU CHÍ rà soát (dòng Bảng kiểm). Khoá tự nhiên (project_id, ma_tieu_chi) → import upsert.
CREATE TABLE IF NOT EXISTS okr_checklist_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES okr_projects(id) ON DELETE CASCADE,
  ma_tieu_chi       text NOT NULL,               -- mã/STT (duy nhất trong 1 dự án)
  yeu_cau           text,                          -- yêu cầu tuân thủ
  co_so_phap_ly     text,                          -- cơ sở pháp lý
  don_vi_ra_soat    text,                          -- đơn vị rà soát (nhãn)
  han_ra_soat       date,                          -- hạn rà soát
  ket_qua_don_vi    text,                          -- kết quả tự rà + bằng chứng của đơn vị
  bang_chung        text,                          -- bằng chứng (link/mô tả)
  tham_dinh_phap_che text,                         -- ý kiến thẩm định của Pháp chế
  ket_qua_kstt      text,                          -- kết quả kiểm tra của KSTT
  -- Kết luận tuân thủ (điều khiển việc tự sinh Vấn đề):
  --   chua_ra_soat (mặc định) | tuan_thu | chua_tuan_thu | vi_pham | khong_ap_dung
  ket_luan          text NOT NULL DEFAULT 'chua_ra_soat',
  -- Kế hoạch khắc phục CÓ SẴN trong Bảng kiểm (để tự kế thừa thành Task, không nhập lại):
  khkp_noi_dung     text,
  khkp_don_vi       text,
  khkp_pic          text,                          -- PIC (email hoặc tên)
  khkp_han          date,
  khkp_ket_qua      text,                          -- kết quả đầu ra mong đợi
  extra             jsonb,                         -- các cột lạ trong file → giữ nguyên, không mất dữ liệu
  sort              int NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS okr_checklist_uidx ON okr_checklist_items (project_id, lower(ma_tieu_chi));
CREATE INDEX IF NOT EXISTS okr_checklist_proj_idx ON okr_checklist_items (project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON okr_checklist_items TO btmh_app;

-- 4) VẤN ĐỀ tuân thủ (tự sinh từ tiêu chí "chưa tuân thủ/vi phạm"). 1 tiêu chí ↔ tối đa 1 vấn đề mở.
--    Vòng đời (status): no_plan → in_remediation → pending_review → kstt_passed → closed
--    (không đạt ở thẩm định → quay lại in_remediation).
CREATE TABLE IF NOT EXISTS okr_compliance_issues (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES okr_projects(id) ON DELETE CASCADE,
  checklist_item_id uuid NOT NULL REFERENCES okr_checklist_items(id) ON DELETE CASCADE,
  title             text NOT NULL,
  severity          text NOT NULL DEFAULT 'chua_tuan_thu',  -- chua_tuan_thu | vi_pham
  status            text NOT NULL DEFAULT 'no_plan',
  submitted_by      text,          -- người bấm "Gửi thẩm định hoàn thành"
  submitted_at      timestamptz,
  kstt_by           text,          -- KSTT xác nhận đạt
  kstt_at           timestamptz,
  closed_by         text,          -- Pháp chế đóng
  closed_at         timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS okr_cissue_item_uidx ON okr_compliance_issues (checklist_item_id);
CREATE INDEX IF NOT EXISTS okr_cissue_proj_idx ON okr_compliance_issues (project_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON okr_compliance_issues TO btmh_app;

-- 5) LỊCH SỬ thẩm định (mọi lần gửi/đạt/không đạt) — truy vết đầy đủ (tiêu chí nghiệm thu #6).
CREATE TABLE IF NOT EXISTS okr_compliance_reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id    uuid NOT NULL REFERENCES okr_compliance_issues(id) ON DELETE CASCADE,
  actor       text NOT NULL,
  step        text NOT NULL,        -- submit | kstt | phap_che
  result      text NOT NULL,        -- pass | reject
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS okr_creview_issue_idx ON okr_compliance_reviews (issue_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON okr_compliance_reviews TO btmh_app;

-- 6) Nối HÀNH ĐỘNG khắc phục (Task) ↔ Vấn đề tuân thủ. Task vẫn là okr_initiatives.
ALTER TABLE okr_initiatives
  ADD COLUMN IF NOT EXISTS issue_id uuid REFERENCES okr_compliance_issues(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS okr_init_issue_idx ON okr_initiatives (issue_id);
