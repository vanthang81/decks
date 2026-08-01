-- 190: Nhóm quyền cho người dùng (CFO 01/08).
-- perm_group = khoá Nhóm quyền (system_admin/okr_admin/manager/contributor/viewer).
-- NULL = suy mặc định theo vai trò tổ chức (xem capabilities.defaultGroupForRole).
ALTER TABLE okr_users ADD COLUMN IF NOT EXISTS perm_group text;
