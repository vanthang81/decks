// ============================================================================
// SỔ ĐĂNG KÝ NĂNG LỰC (Capabilities) — NGUỒN DUY NHẤT mọi quyền trong hệ thống.
// Thêm tính năng mới cần phân quyền ⇒ THÊM 1 mục ở đây ⇒ trang "Phân quyền"
// TỰ hiển thị toggle mới cho mọi Nhóm quyền (không phải sửa UI).
// Quyền = "được LÀM GÌ"; PHẠM VI (đơn vị nào) do vai trò tổ chức + cap 'scope.all' quyết định.
// ============================================================================

export type CapKey =
  | 'system.admin'
  | 'system.permissions'
  | 'user.approve'
  | 'scope.all'
  | 'okr.create'
  | 'okr.edit'
  | 'okr.delete'
  | 'project.manage'
  | 'data.import'
  | 'kpi.sync'
  | 'kpi.manage'
  | 'kpi.input';

export type Capability = { key: CapKey; label: string; desc: string; cat: string };

export const CAP_CATEGORIES: { key: string; label: string }[] = [
  { key: 'system', label: 'Hệ thống' },
  { key: 'okr', label: 'OKR & Key Result' },
  { key: 'exec', label: 'Thực thi & Dự án' },
  { key: 'kpi', label: 'KPI & Chỉ số' },
  { key: 'data', label: 'Dữ liệu' },
];

export const CAPABILITIES: Capability[] = [
  { key: 'system.admin', cat: 'system', label: 'Quản trị hệ thống', desc: 'Quản lý người dùng, cây tổ chức, kỳ OKR, cấu hình nhắc nhở.' },
  { key: 'system.permissions', cat: 'system', label: 'Phân quyền người dùng', desc: 'Gán Nhóm quyền cho người khác và chỉnh Nhóm quyền.' },
  { key: 'user.approve', cat: 'system', label: 'Duyệt người dùng', desc: 'Duyệt/từ chối lời mời thêm người dùng mới (qua email) do người khác đề xuất.' },
  { key: 'scope.all', cat: 'system', label: 'Toàn phạm vi (mọi đơn vị)', desc: 'Bỏ qua giới hạn phạm vi tổ chức — thao tác được MỌI OKR/đơn vị VÀ xem TẤT CẢ công việc ở trang "Công việc" (không có quyền này chỉ thấy việc liên quan tới mình + phạm vi đơn vị mình quản).' },
  { key: 'okr.create', cat: 'okr', label: 'Tạo OKR', desc: 'Tạo Objective mới (trong phạm vi, trừ khi có "Toàn phạm vi").' },
  { key: 'okr.edit', cat: 'okr', label: 'Sửa OKR / KR / check-in', desc: 'Sửa Objective, Key Result, ghi & sửa check-in, quản việc thực thi; duyệt bình luận.' },
  { key: 'okr.delete', cat: 'okr', label: 'Xoá OKR', desc: 'Xoá Objective vĩnh viễn (trong phạm vi, trừ khi có "Toàn phạm vi").' },
  { key: 'project.manage', cat: 'exec', label: 'Quản lý Dự án', desc: 'Tạo / sửa / xoá dự án và gắn việc vào dự án.' },
  { key: 'data.import', cat: 'data', label: 'Nhập Excel', desc: 'Nhập / cập nhật OKR hàng loạt từ file Excel.' },
  { key: 'kpi.sync', cat: 'data', label: 'Đồng bộ KPI', desc: 'Chạy đồng bộ KPI kế hoạch/thực hiện từ BigQuery.' },
  { key: 'kpi.manage', cat: 'kpi', label: 'Quản lý Thư viện KPI', desc: 'Khai báo / sửa / xoá KPI trong thư viện: công thức, nguồn, ngưỡng W/A/E, module, tầng, chủ sở hữu.' },
  { key: 'kpi.input', cat: 'kpi', label: 'Nhập số KPI', desc: 'Nhập giá trị target / actual của KPI trong phạm vi đơn vị mình (scorecard).' },
];

export const CAP_LABEL: Record<string, string> = Object.fromEntries(
  CAPABILITIES.map((c) => [c.key, c.label]),
);

// ---- Nhóm quyền mặc định (sửa được ở trang Phân quyền, lưu okr_settings) ----
export type PermGroup = { key: string; label: string; icon: string; desc: string; caps: CapKey[] };

export const GROUP_KEYS = ['system_admin', 'okr_admin', 'manager', 'contributor', 'viewer'] as const;
export type GroupKey = (typeof GROUP_KEYS)[number];

export const DEFAULT_GROUPS: PermGroup[] = [
  {
    key: 'system_admin',
    label: 'Quản trị hệ thống',
    icon: '🛡️',
    desc: 'Toàn quyền: quản trị hệ thống + phân quyền + mọi thao tác OKR.',
    caps: ['system.admin', 'system.permissions', 'user.approve', 'scope.all', 'okr.create', 'okr.edit', 'okr.delete', 'project.manage', 'data.import', 'kpi.sync', 'kpi.manage', 'kpi.input'],
  },
  {
    key: 'okr_admin',
    label: 'Quản trị OKR',
    icon: '⭐',
    desc: 'Sửa/Xoá/Tạo MỌI OKR (toàn phạm vi) + quản dự án, KPI. Không quản trị hệ thống.',
    caps: ['user.approve', 'scope.all', 'okr.create', 'okr.edit', 'okr.delete', 'project.manage', 'kpi.sync', 'kpi.manage', 'kpi.input'],
  },
  {
    key: 'manager',
    label: 'Quản lý',
    icon: '👔',
    desc: 'Tạo & Sửa OKR + quản dự án TRONG phạm vi đơn vị mình.',
    caps: ['okr.create', 'okr.edit', 'project.manage', 'kpi.input'],
  },
  {
    key: 'contributor',
    label: 'Cộng tác',
    icon: '✍️',
    desc: 'Xem toàn bộ; check-in & bình luận của MÌNH (sửa trong 3 giờ). Tạo/sửa OKR cá nhân của mình.',
    caps: [],
  },
  {
    key: 'viewer',
    label: 'Người xem',
    icon: '👁️',
    desc: 'Chỉ xem, không chỉnh sửa.',
    caps: [],
  },
];

// Nhóm mặc định suy từ vai trò tổ chức khi user chưa được gán nhóm riêng.
export function defaultGroupForRole(role: string): GroupKey {
  if (role === 'exec' || role === 'ceo' || role === 'cfo') return 'system_admin';
  if (role === 'division_lead' || role === 'dept_lead') return 'manager';
  return 'contributor';
}
