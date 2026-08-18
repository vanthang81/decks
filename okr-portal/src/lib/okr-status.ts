// Trạng thái OKR (objective) — module CLIENT-SAFE (KHÔNG import pg) để cả server (okr.ts,
// excel.ts) LẪN client (ObjectiveTree, ObjectiveEditButton, NewObjectiveForm, ui.tsx) dùng chung
// một nguồn duy nhất → thêm/đổi trạng thái chỉ sửa 1 chỗ.
//
// Vòng đời 5 trạng thái (CFO 14/08):
//   Nháp → Chưa thực hiện → Đang chạy → Hoàn thành ; Hủy/Dừng (nhánh dừng).
//   'archived' (Lưu trữ) = LEGACY, chỉ giữ nhãn để hiện dữ liệu cũ, không đưa vào danh sách chọn.
export type ObjStatus = 'draft' | 'not_started' | 'active' | 'done' | 'canceled' | 'archived';

export const OBJ_STATUS_LABEL: Record<ObjStatus, string> = {
  draft: 'Nháp',
  not_started: 'Chưa thực hiện',
  active: 'Đang chạy',
  done: 'Hoàn thành',
  canceled: 'Hủy/Dừng',
  archived: 'Lưu trữ',
};

// 5 trạng thái chính theo vòng đời (để đổ vào ô chọn & bộ lọc). archived KHÔNG nằm ở đây.
export const OBJ_STATUSES: ObjStatus[] = ['draft', 'not_started', 'active', 'done', 'canceled'];

// Màu badge (class .badge.*) theo trạng thái.
export const OBJ_STATUS_BADGE: Record<ObjStatus, string> = {
  draft: 'gray',
  not_started: 'amber',
  active: 'blue',
  done: 'green',
  canceled: 'red',
  archived: 'gray',
};
