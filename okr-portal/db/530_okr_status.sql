-- 530: Mở rộng TRẠNG THÁI OKR (okr_objectives.status) — thêm 'not_started' (Chưa thực hiện)
-- & 'canceled' (Hủy/Dừng) vào vòng đời. Idempotent (drop rồi add lại CHECK).
-- Vòng đời: draft (Nháp) → not_started (Chưa thực hiện) → active (Đang chạy) → done (Hoàn thành);
--           canceled (Hủy/Dừng) = nhánh dừng. Giữ 'archived' (Lưu trữ) cho dữ liệu cũ.

ALTER TABLE okr_objectives DROP CONSTRAINT IF EXISTS okr_objectives_status_check;
ALTER TABLE okr_objectives ADD CONSTRAINT okr_objectives_status_check
  CHECK (status IN ('draft','not_started','active','done','canceled','archived'));
