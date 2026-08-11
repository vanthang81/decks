-- 460: TRỌNG SỐ cho từng OKR (Objective) — dùng để tính "kết quả tổng theo trọng số" của mỗi nhóm
-- (Công ty/Khối/Phòng/Cá nhân) ở Báo cáo theo cấp. Mặc định 1 = mọi OKR cân nhau (như bình quân cũ).
ALTER TABLE okr_objectives ADD COLUMN IF NOT EXISTS weight numeric NOT NULL DEFAULT 1;
