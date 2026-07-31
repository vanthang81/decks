-- ============================================================================
-- OKR Portal — Seed NGƯỜI DÙNG THẬT BTMH (GĐK + Trưởng phòng) — KHOÁ đăng nhập
-- Nguồn: Sơ đồ tổ chức (Google Drive). is_active=false ⇒ tạo để gán người phụ trách
-- + hiện tên, NHƯNG chưa đăng nhập được (CFO mở quyền từng người khi rollout).
-- Upsert theo email: user ĐANG active (Thắng exec, Nguyệt) giữ nguyên role + is_active.
-- Chạy SUPERUSER postgres. Idempotent.
-- ============================================================================

BEGIN;

INSERT INTO okr_users(email, display_name, title, role, unit_id, is_active)
SELECT v.email, v.name, v.title, v.role, u.id, false
FROM (VALUES
  -- ===== Giám đốc / Phó GĐ Khối (division_lead) =====
  ('tranvuthuquynh@baotinmanhhai.vn','Trần Thu Quỳnh','Giám đốc Khối Marketing','division_lead','MKT'),
  ('phamthanhtuan@baotinmanhhai.vn','Phạm Thanh Tuấn','PGĐ Marketing (Ecom+Growth)','division_lead','MKT'),
  ('trancuuquoc@baotinmanhhai.vn','Trần Cứu Quốc','Giám đốc Khối Cung ứng','division_lead','CU'),
  ('phamthiminhthanh@baotinmanhhai.vn','Phạm Thị Minh Thanh','Giám đốc Khối Kinh doanh bán lẻ','division_lead','BL'),
  ('phamduchuy@baotinmanhhai.vn','Phạm Đức Huy','Giám đốc Khối B2B & PT đối tác','division_lead','B2B'),
  ('chanhoiyeevicky@baotinmanhhai.vn','Chan Hoi Yee Vicky','Giám đốc Khối Quản lý Sản phẩm','division_lead','SP'),
  ('lethihongtrang@baotinmanhhai.vn','Lê Thị Hồng Trang','Giám đốc Khối Sản xuất','division_lead','SX'),
  ('trantuanduong@baotinmanhhai.vn','Trần Tuấn Dương','Giám đốc Khối Công nghệ','division_lead','CN'),
  ('phamminhbai@baotinmanhhai.vn','Phạm Minh Bái','PGĐ Công nghệ (Hạ tầng & CNTT)','division_lead','CN'),
  ('tranxuanhai@baotinmanhhai.vn','Trần Xuân Hải','Giám đốc Khối Nhân sự','division_lead','NS'),
  ('nguyenkhacha@baotinmanhhai.vn','Nguyễn Khắc Hạ','Giám đốc Khối PT Hệ thống Điểm bán','division_lead','DB'),
  ('phanthihongdung@baotinmanhhai.vn','Phan Thị Hồng Dung','Giám đốc Khối Đào tạo & PTVH','division_lead','DT'),
  ('nguyenvanthang@baotinmanhhai.vn','Nguyễn Văn Thắng','CFO — Giám đốc Tài chính & Kế hoạch','division_lead','TC'),
  -- ===== Trưởng phòng (dept_lead) =====
  ('doanthuyquynh@baotinmanhhai.vn','Đoàn Thúy Quỳnh','Trưởng phòng Thiết kế & Sáng tạo nội dung','dept_lead','MKT-TK'),
  ('lebichngoc@baotinmanhhai.vn','Lê Bích Ngọc','Trưởng phòng Trade Marketing','dept_lead','MKT-TRADE'),
  ('tranthibichphuong@baotinmanhhai.vn','Trần Thị Bích Phượng','Trưởng phòng Trải nghiệm khách hàng','dept_lead','MKT-CX'),
  ('jadycheung@baotinmanhhai.vn','Jady Cheung','Trưởng phòng Phát triển sản phẩm','dept_lead','SP-PTSP'),
  ('dinhkimtrang@baotinmanhhai.vn','Đinh Kim Trang','Trưởng phòng Kế hoạch sản phẩm','dept_lead','SP-KHSP'),
  ('nguyenminhduc@baotinmanhhai.vn','Nguyễn Minh Đức','Trưởng phòng Quản lý danh mục SP','dept_lead','SP-DMSP'),
  ('dothithunguyet@baotinmanhhai.vn','Nguyệt Đỗ','Trưởng phòng Tài chính','dept_lead','TC-TC'),
  ('phamngocthang@baotinmanhhai.vn','Phạm Ngọc Thăng','Trưởng phòng Kế toán','dept_lead','TC-KT'),
  ('ha.it@baotinmanhhai.vn','Trịnh Vĩnh Hà','Trưởng phòng Triển khai giải pháp','dept_lead','CN-GP'),
  ('maingocmai@baotinmanhhai.vn','Mai Ngọc Mai','Trưởng phòng Tuyển dụng','dept_lead','NS-TD'),
  ('nguyenbichngoc@baotinmanhhai.vn','Nguyễn Bích Ngọc','Trưởng phòng C&B & Dịch vụ nhân sự','dept_lead','NS-CB'),
  ('nguyenthily@baotinmanhhai.vn','Nguyễn Thị Lý','Trưởng phòng Đối tác nhân sự','dept_lead','NS-DT'),
  ('luongngocquang@baotinmanhhai.vn','Lương Ngọc Quang','Trưởng phòng Pháp chế','dept_lead','PC-PC'),
  ('tranthixuananh@baotinmanhhai.vn','Trần Thị Xuân Anh','Trưởng phòng Kiểm soát tuân thủ','dept_lead','PC-KS'),
  ('nguyennhathuy@baotinmanhhai.vn','Nguyễn Nhật Huy','Trưởng phòng Phát triển điểm bán','dept_lead','DB-PT'),
  ('nguyenhoangkhoi@baotinmanhhai.vn','Nguyễn Hoàng Khôi','Trưởng phòng Setup & Bảo trì','dept_lead','DB-SETUP'),
  ('nguyenthianhnguyet@baotinmanhhai.vn','Nguyễn Thị Ánh Nguyệt','Trưởng phòng Đào tạo','dept_lead','DT-DAOTAO'),
  ('nguyenthiphuong@baotinmanhhai.vn','Nguyễn Thị Phượng','Trưởng phòng Mua sắm nội bộ','dept_lead','VH-MS'),
  ('hoangthithu@baotinmanhhai.vn','Hoàng Thị Thu','Trưởng phòng Hành chính Quản trị','dept_lead','VH-HC')
) AS v(email,name,title,role,code)
LEFT JOIN okr_units u ON u.code = v.code
ON CONFLICT (email) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      title = EXCLUDED.title,
      unit_id = COALESCE(EXCLUDED.unit_id, okr_users.unit_id);

COMMIT;
