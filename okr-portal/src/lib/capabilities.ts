// ============================================================================
// SỔ ĐĂNG KÝ NĂNG LỰC (Capabilities) — NGUỒN DUY NHẤT mọi quyền trong hệ thống.
// Thêm tính năng mới cần phân quyền ⇒ THÊM 1 mục ở đây (kèm `suggest` = nhóm nên có
// quyền đó) ⇒ trang "Phân quyền" TỰ hiển thị toggle mới + TỰ gợi ý cho các Nhóm quyền
// (không phải sửa UI, không phải sửa DEFAULT_GROUPS — cap-set của nhóm SUY từ `suggest`).
// Quyền = "được LÀM GÌ"; PHẠM VI (đơn vị nào) do vai trò tổ chức + cap 'scope.all' quyết định.
// ============================================================================

export type CapKey =
  | 'system.admin'
  | 'system.permissions'
  | 'user.approve'
  | 'scope.all'
  | 'strategy.manage'
  | 'okr.create'
  | 'okr.edit'
  | 'okr.delete'
  | 'project.manage'
  | 'meeting.manage'
  | 'budget.manage'
  | 'report.view'
  | 'calendar.viewall'
  | 'data.import'
  | 'kpi.sync'
  | 'kpi.manage'
  | 'kpi.input';

// Nhóm quyền mặc định (nhãn/icon cố định; cap-set suy từ `suggest`).
export const GROUP_KEYS = ['system_admin', 'okr_admin', 'kpi_admin', 'manager', 'contributor', 'viewer'] as const;
export type GroupKey = (typeof GROUP_KEYS)[number];

export type Capability = { key: CapKey; label: string; desc: string; cat: string; suggest: GroupKey[] };

export const CAP_CATEGORIES: { key: string; label: string }[] = [
  { key: 'system', label: 'Hệ thống' },
  { key: 'strategy', label: 'Chiến lược công ty' },
  { key: 'okr', label: 'OKR & Key Result' },
  { key: 'exec', label: 'Thực thi, Dự án & Họp' },
  { key: 'fin', label: 'Ngân sách & Tài chính' },
  { key: 'report', label: 'Báo cáo & Lịch' },
  { key: 'kpi', label: 'KPI & Chỉ số' },
  { key: 'data', label: 'Dữ liệu' },
];

// `suggest` = các Nhóm quyền hệ thống GỢI Ý nên có năng lực này (system_admin luôn có tất cả).
export const CAPABILITIES: Capability[] = [
  { key: 'system.admin', cat: 'system', label: 'Quản trị hệ thống', desc: 'Quản lý người dùng, cây tổ chức, kỳ OKR, cấu hình nhắc nhở.', suggest: ['system_admin'] },
  { key: 'system.permissions', cat: 'system', label: 'Phân quyền người dùng', desc: 'Gán Nhóm quyền cho người khác và chỉnh Nhóm quyền.', suggest: ['system_admin'] },
  { key: 'user.approve', cat: 'system', label: 'Duyệt người dùng', desc: 'Duyệt/từ chối lời mời thêm người dùng mới (qua email) do người khác đề xuất.', suggest: ['system_admin', 'okr_admin'] },
  { key: 'scope.all', cat: 'system', label: 'Toàn phạm vi (mọi đơn vị)', desc: 'Bỏ qua giới hạn phạm vi tổ chức — thao tác được MỌI OKR/đơn vị VÀ xem TẤT CẢ công việc ở trang "Công việc" (không có quyền này chỉ thấy việc liên quan tới mình + phạm vi đơn vị mình quản).', suggest: ['system_admin', 'okr_admin', 'kpi_admin'] },
  { key: 'strategy.manage', cat: 'strategy', label: 'Quản lý Chiến lược công ty', desc: 'Khai báo / sửa Tầm nhìn – Sứ mệnh – Giá trị – Khát vọng và sắp xếp trụ cột chiến lược ở trang "Chiến lược".', suggest: ['system_admin', 'okr_admin'] },
  { key: 'okr.create', cat: 'okr', label: 'Tạo OKR', desc: 'Tạo Objective mới (trong phạm vi, trừ khi có "Toàn phạm vi").', suggest: ['system_admin', 'okr_admin', 'manager'] },
  { key: 'okr.edit', cat: 'okr', label: 'Sửa OKR / KR / check-in', desc: 'Sửa Objective, Key Result, ghi & sửa check-in, quản việc thực thi; duyệt bình luận.', suggest: ['system_admin', 'okr_admin', 'manager'] },
  { key: 'okr.delete', cat: 'okr', label: 'Xoá OKR', desc: 'Xoá Objective vĩnh viễn (trong phạm vi, trừ khi có "Toàn phạm vi").', suggest: ['system_admin', 'okr_admin'] },
  { key: 'project.manage', cat: 'exec', label: 'Quản lý Dự án', desc: 'Tạo / sửa / xoá dự án và gắn việc vào dự án.', suggest: ['system_admin', 'okr_admin', 'manager'] },
  { key: 'meeting.manage', cat: 'exec', label: 'Quản lý mọi cuộc họp', desc: 'Sửa / xoá / chốt biên bản MỌI cuộc họp (kể cả khi không phải chủ trì / thư ký). Ai cũng tạo được cuộc họp của mình — quyền này là quyền quản trị họp toàn công ty.', suggest: ['system_admin', 'okr_admin'] },
  { key: 'budget.manage', cat: 'fin', label: 'Quản lý Ngân sách', desc: 'Nhập ngân sách/cấu trúc chi phí từ CSV, đồng bộ thực chi và XUẤT ngân sách (trang "Ngân sách").', suggest: ['system_admin', 'okr_admin'] },
  { key: 'report.view', cat: 'report', label: 'Xem Báo cáo theo cấp', desc: 'Xem & xuất trang "Báo cáo" (roll-up theo cấp tổ chức). Không có quyền này chỉ xem dashboard tổng.', suggest: ['system_admin', 'okr_admin', 'kpi_admin', 'manager', 'contributor'] },
  { key: 'calendar.viewall', cat: 'report', label: 'Xem Lịch toàn công ty', desc: 'Xem lịch (cuộc họp, hạn công việc, check-in) của TOÀN công ty thay vì chỉ của mình / đơn vị mình.', suggest: ['system_admin', 'okr_admin', 'kpi_admin', 'manager'] },
  { key: 'data.import', cat: 'data', label: 'Nhập Excel', desc: 'Nhập / cập nhật OKR hàng loạt từ file Excel.', suggest: ['system_admin', 'okr_admin'] },
  { key: 'kpi.sync', cat: 'data', label: 'Đồng bộ KPI', desc: 'Chạy đồng bộ KPI kế hoạch/thực hiện từ BigQuery.', suggest: ['system_admin', 'okr_admin', 'kpi_admin'] },
  { key: 'kpi.manage', cat: 'kpi', label: 'Quản lý Thư viện KPI', desc: 'Khai báo / sửa / xoá KPI trong thư viện: công thức, nguồn, ngưỡng W/A/E, module, tầng, chủ sở hữu.', suggest: ['system_admin', 'okr_admin', 'kpi_admin'] },
  { key: 'kpi.input', cat: 'kpi', label: 'Nhập số KPI', desc: 'Nhập giá trị target / actual của KPI trong phạm vi đơn vị mình (scorecard).', suggest: ['system_admin', 'okr_admin', 'kpi_admin', 'manager'] },
];

export const CAP_LABEL: Record<string, string> = Object.fromEntries(
  CAPABILITIES.map((c) => [c.key, c.label]),
);

/** Các Nhóm quyền được GỢI Ý có năng lực này (dùng để hiện gợi ý ở trang Phân quyền). */
export const CAP_SUGGEST: Record<string, GroupKey[]> = Object.fromEntries(
  CAPABILITIES.map((c) => [c.key, c.suggest]),
);

// ---- Nhóm quyền mặc định (nhãn/icon/mô tả cố định; cap-set SUY từ `suggest`) ----
export type PermGroup = { key: string; label: string; icon: string; desc: string; caps: CapKey[] };

const GROUP_META: { key: GroupKey; label: string; icon: string; desc: string }[] = [
  { key: 'system_admin', label: 'Quản trị hệ thống', icon: '🛡️', desc: 'Toàn quyền: quản trị hệ thống + phân quyền + mọi thao tác OKR, chiến lược, họp, ngân sách.' },
  { key: 'okr_admin', label: 'Quản trị OKR', icon: '⭐', desc: 'Sửa/Xoá/Tạo MỌI OKR (toàn phạm vi) + chiến lược, dự án, họp, ngân sách, KPI, báo cáo. Không quản trị hệ thống.' },
  { key: 'kpi_admin', label: 'Quản trị KPI', icon: '📊', desc: 'Quản lý Thư viện KPI + nhập số KPI + đồng bộ KPI cho TOÀN CÔNG TY (mọi đơn vị). KHÔNG tạo/sửa/xoá OKR — hợp cho bộ phận Nhân sự/đầu mối KPI.' },
  { key: 'manager', label: 'Quản lý', icon: '👔', desc: 'Tạo & Sửa OKR + quản dự án TRONG phạm vi đơn vị mình; xem báo cáo & lịch.' },
  { key: 'contributor', label: 'Cộng tác', icon: '✍️', desc: 'Xem toàn bộ + báo cáo theo cấp; check-in & bình luận của MÌNH (sửa trong 3 giờ). Tạo/sửa OKR cá nhân của mình.' },
  { key: 'viewer', label: 'Người xem', icon: '👁️', desc: 'Chỉ xem, không chỉnh sửa.' },
];

// cap-set = mọi cap có `suggest` chứa nhóm này (system_admin luôn có TẤT CẢ).
export const DEFAULT_GROUPS: PermGroup[] = GROUP_META.map((g) => ({
  ...g,
  caps: g.key === 'system_admin'
    ? CAPABILITIES.map((c) => c.key)
    : CAPABILITIES.filter((c) => c.suggest.includes(g.key)).map((c) => c.key),
}));

// Nhóm mặc định suy từ vai trò tổ chức khi user chưa được gán nhóm riêng.
export function defaultGroupForRole(role: string): GroupKey {
  if (role === 'exec' || role === 'ceo' || role === 'cfo') return 'system_admin';
  if (role === 'division_lead' || role === 'dept_lead' || role === 'function_lead') return 'manager';
  return 'contributor';
}
