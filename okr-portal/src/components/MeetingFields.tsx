import {
  MEETING_TYPE_LABEL, MEETING_TYPES, VISIBILITY_LABEL, type Meeting,
} from '@/lib/meetings';

// Bộ ô nhập cuộc họp — dùng chung cho popup Tạo & Sửa (server component).
export default function MeetingFields({
  users, units, projects, meetings, defaultOwner, meeting, participantsText,
}: {
  users: { email: string; display_name: string | null }[];
  units: { id: string; name: string; type: string }[];
  projects: { id: string; code: string | null; name: string }[];
  meetings?: { id: string; code: string | null; title: string }[];
  defaultOwner: string;
  meeting?: Meeting | null;
  participantsText?: string;
}) {
  const m = meeting ?? null;
  // datetime-local cần "YYYY-MM-DDTHH:MM"
  const dtLocal = m?.meeting_at ? new Date(m.meeting_at).toISOString().slice(0, 16) : '';
  return (
    <>
      {m && <input type="hidden" name="id" value={m.id} />}
      <label className="f">Tiêu đề cuộc họp *</label>
      <input className="i" name="title" required defaultValue={m?.title ?? ''} placeholder="VD: Họp điều hành tuần 32 · Khối Kinh doanh" />
      <div className="row">
        <div>
          <label className="f">Loại cuộc họp</label>
          <select className="i" name="type" defaultValue={m?.type ?? 'other'}>
            {MEETING_TYPES.map((t) => <option key={t} value={t}>{MEETING_TYPE_LABEL[t]}</option>)}
          </select>
        </div>
        <div>
          <label className="f">Thời gian</label>
          <input className="i" name="meeting_at" type="datetime-local" defaultValue={dtLocal} />
        </div>
        <div>
          <label className="f">Địa điểm</label>
          <input className="i" name="location" defaultValue={m?.location ?? ''} placeholder="Phòng họp / online" />
        </div>
      </div>
      <div className="row">
        <div>
          <label className="f">Chủ trì</label>
          <select className="i" name="owner_email" defaultValue={m?.owner_email ?? defaultOwner}>
            {users.map((u) => <option key={u.email} value={u.email}>{u.display_name || u.email}</option>)}
          </select>
        </div>
        <div>
          <label className="f">Thư ký</label>
          <select className="i" name="secretary_email" defaultValue={m?.secretary_email ?? ''}>
            <option value="">— Chưa chọn —</option>
            {users.map((u) => <option key={u.email} value={u.email}>{u.display_name || u.email}</option>)}
          </select>
        </div>
        <div>
          <label className="f">Trạng thái</label>
          <select className="i" name="status" defaultValue={m?.status ?? 'scheduled'}>
            <option value="scheduled">Đã lên lịch</option>
            <option value="held">Đã họp</option>
            <option value="cancelled">Đã huỷ</option>
          </select>
        </div>
      </div>
      <div className="row">
        <div>
          <label className="f">Khối / Phòng liên quan</label>
          <select className="i" name="unit_id" defaultValue={m?.unit_id ?? ''}>
            <option value="">— Không gắn —</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.type === 'division' ? 'Khối' : u.type === 'department' ? 'Phòng' : 'Công ty'})</option>)}
          </select>
        </div>
        <div>
          <label className="f">Dự án liên quan</label>
          <select className="i" name="project_id" defaultValue={m?.project_id ?? ''}>
            <option value="">— Không gắn —</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.code ? `${p.code} · ` : ''}{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="f">Ai được xem</label>
          <select className="i" name="visibility" defaultValue={m?.visibility ?? 'participants'}>
            {(Object.keys(VISIBILITY_LABEL) as (keyof typeof VISIBILITY_LABEL)[]).map((v) => (
              <option key={v} value={v}>{VISIBILITY_LABEL[v]}</option>
            ))}
          </select>
        </div>
      </div>
      {meetings && meetings.length > 0 && (
        <>
          <label className="f">Cuộc họp trước (nối chuỗi) <span className="muted" style={{ fontWeight: 400 }}>— vd chuỗi check-in dự án hàng tuần</span></label>
          <select className="i" name="previous_meeting_id" defaultValue={m?.previous_meeting_id ?? ''}>
            <option value="">— Không nối —</option>
            {meetings.filter((x) => x.id !== m?.id).map((x) => (
              <option key={x.id} value={x.id}>{x.code ? `${x.code} · ` : ''}{x.title}</option>
            ))}
          </select>
        </>
      )}
      <label className="f">Người tham gia / theo dõi <span className="muted" style={{ fontWeight: 400 }}>(email, mỗi dòng hoặc cách nhau bằng dấu phẩy)</span></label>
      <textarea className="i" name="participants" rows={2} defaultValue={participantsText ?? ''} placeholder="an@btmh.vn, binh@btmh.vn" />
      <label className="f">Nội dung / Chương trình (agenda)</label>
      <textarea className="i" name="agenda" rows={3} defaultValue={m?.agenda ?? ''} placeholder="Các nội dung sẽ trao đổi…" />
    </>
  );
}
