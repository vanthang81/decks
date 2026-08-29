'use client';

import EditModal from './EditModal';
import SearchSelect, { type SSOption } from './SearchSelect';

// Popup BÀN GIAO: chuyển toàn bộ việc/OKR/dự án/họp đang phụ trách của người NGHỈ → người THAY THẾ.
// Hiện ở /admin/users (mỗi dòng người dùng). Server action `handoverAction` truyền từ trang xuống.
export type HandoverCounts = {
  openTasks: number;
  allTasks: number;
  objectives: number;
  projects: number;
  meetings: number;
};

export default function HandoverModal({
  from,
  counts,
  userOptions,
  action,
}: {
  from: { email: string; name: string };
  counts: HandoverCounts;
  userOptions: SSOption[]; // người thay thế (đang hoạt động, đã loại chính người nghỉ)
  action: (fd: FormData) => Promise<void | { error?: string }>;
}) {
  const doneTasks = Math.max(0, counts.allTasks - counts.openTasks);
  const nothing =
    counts.allTasks === 0 && counts.objectives === 0 && counts.projects === 0 && counts.meetings === 0;

  return (
    <EditModal
      title={`Bàn giao công việc — ${from.name}`}
      label="Bàn giao"
      submitLabel="Bàn giao"
      triggerClass="btn ghost sm"
      action={action}
    >
      <input type="hidden" name="from" value={from.email} />

      <p className="subtitle" style={{ marginTop: 0 }}>
        Chuyển toàn bộ mục đang phụ trách của <b>{from.name}</b> sang một người thay thế (khi nghỉ / luân chuyển).
        Lịch sử "người tạo" được giữ nguyên; chỉ đổi người phụ trách.
      </p>

      {/* Đang phụ trách */}
      <div className="card" style={{ margin: '0 0 12px', padding: 12 }}>
        <div className="f" style={{ marginBottom: 6 }}>Đang phụ trách</div>
        {nothing ? (
          <span className="muted">Không còn việc / OKR / dự án / họp nào đang phụ trách.</span>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="badge amber">{counts.openTasks} việc chưa xong</span>
            {doneTasks > 0 && <span className="badge">{doneTasks} việc đã xong</span>}
            {counts.objectives > 0 && <span className="badge">{counts.objectives} OKR</span>}
            {counts.projects > 0 && <span className="badge">{counts.projects} dự án</span>}
            {counts.meetings > 0 && <span className="badge">{counts.meetings} cuộc họp</span>}
          </div>
        )}
      </div>

      <label className="f">Người thay thế *</label>
      <SearchSelect name="to" options={userOptions} placeholder="— Chọn người thay thế —" />

      <div className="f" style={{ marginTop: 14 }}>Công việc chuyển</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label className="opt"><input type="radio" name="tasks" value="open" defaultChecked /> Chỉ việc <b>chưa hoàn thành</b> (chưa làm / đang làm / vướng) — <b>{counts.openTasks}</b></label>
        <label className="opt"><input type="radio" name="tasks" value="all" /> Tất cả việc đã giao (cả đã xong) — {counts.allTasks}</label>
        <label className="opt"><input type="radio" name="tasks" value="none" /> Không chuyển việc</label>
      </div>

      <div className="f" style={{ marginTop: 14 }}>Chuyển kèm (tuỳ chọn)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label className="opt"><input type="checkbox" name="objectives" defaultChecked={counts.objectives > 0} /> OKR đang chủ trì — {counts.objectives}</label>
        <label className="opt"><input type="checkbox" name="projects" defaultChecked={counts.projects > 0} /> Dự án đang chủ trì — {counts.projects}</label>
        <label className="opt"><input type="checkbox" name="meetings" defaultChecked={false} /> Vai trò chủ trì / thư ký cuộc họp — {counts.meetings}</label>
      </div>

      <label className="opt" style={{ marginTop: 14 }}>
        <input type="checkbox" name="lock_from" /> Khoá tài khoản <b>{from.name}</b> sau khi bàn giao (không đăng nhập được nữa)
      </label>
    </EditModal>
  );
}
