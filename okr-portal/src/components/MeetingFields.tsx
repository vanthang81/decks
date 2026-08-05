import {
  MEETING_TYPE_LABEL, MEETING_TYPES, VISIBILITY_LABEL, type Meeting,
} from '@/lib/meetings';
import ParticipantsPicker from '@/components/ParticipantsPicker';
import SearchSelect from '@/components/SearchSelect';

// Bộ ô nhập cuộc họp — dùng chung cho popup Tạo & Sửa (server component).
export default function MeetingFields({
  users, units, projects, meetings, defaultOwner, meeting, participantsText, cohostText, secretaryText,
}: {
  users: { email: string; display_name: string | null }[];
  units: { id: string; name: string; type: string }[];
  projects: { id: string; code: string | null; name: string }[];
  meetings?: { id: string; code: string | null; title: string }[];
  defaultOwner: string;
  meeting?: Meeting | null;
  participantsText?: string;   // người tham gia/theo dõi (role participant/watcher)
  cohostText?: string;         // đồng chủ trì (role host, trừ chủ trì chính)
  secretaryText?: string;      // thư ký (role secretary — có thể nhiều)
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
          <label className="f">Chủ trì (chính)</label>
          <SearchSelect name="owner_email" defaultValue={m?.owner_email ?? defaultOwner}
            options={users.map((u) => ({ value: u.email, label: u.display_name || u.email }))} />
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
      <label className="f">Đồng chủ trì <span className="muted" style={{ fontWeight: 400 }}>(có thể chọn nhiều người — cùng quyền sửa toàn bộ cuộc họp)</span></label>
      <ParticipantsPicker users={users} initial={cohostText ?? ''} name="cohost_emails" />
      <label className="f">Thư ký <span className="muted" style={{ fontWeight: 400 }}>(một hoặc nhiều người — cùng quyền sửa toàn bộ cuộc họp)</span></label>
      <ParticipantsPicker users={users} initial={secretaryText ?? ''} name="secretary_emails" />
      <div className="row">
        <div>
          <label className="f">Khối / Phòng liên quan</label>
          <SearchSelect name="unit_id" defaultValue={m?.unit_id ?? ''} emptyLabel="— Không gắn —"
            options={units.map((u) => ({ value: u.id, label: `${u.name} (${u.type === 'division' ? 'Khối' : u.type === 'department' ? 'Phòng' : 'Công ty'})` }))} />
        </div>
        <div>
          <label className="f">Dự án liên quan</label>
          <SearchSelect name="project_id" defaultValue={m?.project_id ?? ''} emptyLabel="— Không gắn —"
            options={projects.map((p) => ({ value: p.id, label: `${p.code ? p.code + ' · ' : ''}${p.name}` }))} />
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
          <SearchSelect name="previous_meeting_id" defaultValue={m?.previous_meeting_id ?? ''} emptyLabel="— Không nối —"
            options={meetings.filter((x) => x.id !== m?.id).map((x) => ({ value: x.id, label: `${x.code ? x.code + ' · ' : ''}${x.title}` }))} />
        </>
      )}
      <label className="f">Người tham gia / theo dõi <span className="muted" style={{ fontWeight: 400 }}>(gõ tên để chọn nhanh, hoặc nhập email người ngoài)</span></label>
      <ParticipantsPicker users={users} initial={participantsText ?? ''} />
      <label className="f">Nội dung / Chương trình (agenda)</label>
      <textarea className="i" name="agenda" rows={3} defaultValue={m?.agenda ?? ''} placeholder="Các nội dung sẽ trao đổi…" />
    </>
  );
}
