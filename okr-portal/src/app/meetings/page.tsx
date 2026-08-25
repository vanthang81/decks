import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import HelpTip from '@/components/HelpTip';
import EditModal from '@/components/EditModal';
import NavIcon from '@/components/NavIcon';
import MeetingFields from '@/components/MeetingFields';
import UserLink from '@/components/UserLink';
import { requireUser } from '@/lib/current-user';
import { listUsers } from '@/lib/users';
import { listUnits } from '@/lib/org';
import { listAllProjectOptions } from '@/lib/projects';
import {
  listMeetings, MEETING_TYPE_LABEL, meetingStatusView,
} from '@/lib/meetings';
import { fmtDateTime } from '@/lib/format';
import { createMeetingAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cuộc họp · BTMH OKR' };

export default async function MeetingsPage() {
  const user = await requireUser();
  const [meetings, users, units, projects] = await Promise.all([
    listMeetings(user), listUsers(), listUnits(), listAllProjectOptions(),
  ]);

  return (
    <>
      <SiteHeader active="meetings" />
      <div className="wrap">
        <div className="flexbtw flexbtw-top">
          <div>
            <div className="pagetitle">Cuộc họp<HelpTip k="meetings" /></div>
            <p className="subtitle">
              Tổ chức cuộc họp (check-in dự án · điều hành công ty/khối/phòng · IBP…), ghi biên bản và
              theo dõi hành động. Chỉ người tham gia / được thêm mới xem được nội dung.
            </p>
          </div>
          <EditModal title="Tạo cuộc họp mới" label="Cuộc họp mới" icon={<NavIcon name="plus" />} submitLabel="Tạo cuộc họp" action={createMeetingAction} wide>
            <MeetingFields users={users} units={units} projects={projects} meetings={meetings.map((mm) => ({ id: mm.id, code: mm.code, title: mm.title }))} defaultOwner={user.email} />
          </EditModal>
        </div>

        {meetings.length === 0 ? (
          <div className="card"><p className="muted" style={{ margin: 0 }}>Chưa có cuộc họp nào bạn được xem. Bấm "Cuộc họp mới" để tạo.</p></div>
        ) : (
          <div className="card">
            <div className="table-scroll">
              <table className="t">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Cuộc họp</th><th style={{ textAlign: 'left' }}>Loại</th>
                    <th style={{ textAlign: 'left' }}>Thời gian</th><th style={{ textAlign: 'left' }}>Chủ trì</th>
                    <th className="right">Người dự</th><th className="right">Hành động</th><th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {meetings.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <Link href={`/meetings/${m.id}`} className="tbl-link">
                          {m.code && <span className="okr-code" style={{ marginRight: 6 }}>{m.code}</span>}{m.title}
                        </Link>
                        {m.pending_requests > 0 && (m.owner_email === user.email || m.secretary_email === user.email) && (
                          <span className="badge amber" style={{ marginLeft: 6, fontSize: 10.5 }}>{m.pending_requests} chờ duyệt</span>
                        )}
                        {(m.related_units || m.related_projects) && <div className="muted" style={{ fontSize: 11 }}>{[m.related_units, m.related_projects].filter(Boolean).join(' · ')}</div>}
                      </td>
                      <td style={{ fontSize: 12.5 }}>{MEETING_TYPE_LABEL[m.type]}</td>
                      <td style={{ fontSize: 12.5 }}>{m.meeting_at ? fmtDateTime(m.meeting_at) : <span className="muted">—</span>}</td>
                      <td style={{ fontSize: 12.5 }}>{m.owner_email ? <UserLink email={m.owner_email} name={m.owner_name ?? m.owner_email} /> : '—'}</td>
                      <td className="right mono">{m.participant_count}</td>
                      <td className="right mono">{m.action_count}</td>
                      <td>{(() => { const sv = meetingStatusView(m); return <span className={`badge ${sv.cls}`}>{sv.label}</span>; })()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
