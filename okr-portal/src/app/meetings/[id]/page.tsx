import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import HelpTip from '@/components/HelpTip';
import EditModal from '@/components/EditModal';
import NavIcon from '@/components/NavIcon';
import ConfirmButton from '@/components/ConfirmButton';
import MeetingFields from '@/components/MeetingFields';
import ExecutionTabs from '@/components/ExecutionTabs';
import AddTaskToMeeting from '@/components/AddTaskToMeeting';
import { requireUser } from '@/lib/current-user';
import { listUsers } from '@/lib/users';
import { listUnits } from '@/lib/org';
import { listAllProjectOptions } from '@/lib/projects';
import { listObjectivesWithKrs } from '@/lib/okr';
import { getCurrentPeriod } from '@/lib/periods';
import {
  getMeeting, canViewMeeting, canManageMeeting, listParticipants, listMeetingOptions, listFollowUpMeetings,
  listAccessRequests, myAccessRequest,
  MEETING_TYPE_LABEL, MEETING_STATUS_LABEL, MEETING_STATUS_CLS, VISIBILITY_LABEL,
} from '@/lib/meetings';
import { listInitiativesForMeeting } from '@/lib/initiatives';
import { fmtDateTime } from '@/lib/format';
import {
  updateMeetingAction, saveMinutesAction, deleteMeetingAction,
  requestMeetingAccessAction, decideMeetingAccessAction, createMeetingTaskAction,
} from '../actions';
import {
  editInitiativeAction, deleteInitiativeAction, createInitiativeAction, moveInitiativeAction,
} from '../../objectives/actions';
import { createProjectForInitiativeAction } from '@/app/projects/actions';

export const dynamic = 'force-dynamic';

const PART_ROLE: Record<string, string> = { host: 'Chủ trì', secretary: 'Thư ký', participant: 'Tham gia', watcher: 'Theo dõi' };

export default async function MeetingDetail({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const m = await getMeeting(params.id);
  if (!m) notFound();

  const canView = await canViewMeeting(user, m);
  const canManage = canManageMeeting(user, m);

  // ── Chưa được xem: chỉ hiện thông tin cơ bản + xin quyền ──
  if (!canView) {
    const mine = await myAccessRequest(m.id, user.email);
    return (
      <>
        <SiteHeader active="meetings" />
        <div className="wrap">
          <p className="subtitle" style={{ marginBottom: 6 }}><Link href="/meetings">← Cuộc họp</Link></p>
          <div className="pagetitle">{m.code && <span className="okr-code" style={{ fontSize: 14, marginRight: 8 }}>{m.code}</span>}{m.title}</div>
          <p className="subtitle">{MEETING_TYPE_LABEL[m.type]} · Chủ trì: {m.owner_name ?? m.owner_email ?? '—'}{m.meeting_at ? ` · ${fmtDateTime(m.meeting_at)}` : ''}</p>
          <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <h3 style={{ marginTop: 0 }}>🔒 Nội dung cuộc họp được bảo mật</h3>
            <p className="muted">Bạn chưa được phân quyền xem biên bản/nội dung cuộc họp này. Gửi yêu cầu để chủ trì hoặc thư ký duyệt.</p>
            {mine?.status === 'pending' ? (
              <span className="badge amber">Đã gửi yêu cầu · chờ duyệt</span>
            ) : mine?.status === 'denied' ? (
              <div><span className="badge red">Yêu cầu trước đã bị từ chối</span></div>
            ) : null}
            {mine?.status !== 'pending' && (
              <form action={requestMeetingAccessAction} style={{ marginTop: 10 }}>
                <input type="hidden" name="id" value={m.id} />
                <label className="f">Lý do cần xem (tuỳ chọn)</label>
                <textarea className="i" name="reason" rows={2} placeholder="VD: tôi phụ trách hạng mục liên quan…" />
                <div style={{ marginTop: 8 }}><button className="btn" type="submit">Gửi yêu cầu xem</button></div>
              </form>
            )}
          </div>
        </div>
      </>
    );
  }

  const [participants, tasks, pending, users, units, projectOpts, meetingOpts, followUps] = await Promise.all([
    listParticipants(m.id), listInitiativesForMeeting(m.id),
    canManage ? listAccessRequests(m.id, 'pending') : Promise.resolve([]),
    listUsers(), listUnits(), listAllProjectOptions(), listMeetingOptions(user), listFollowUpMeetings(m.id, user),
  ]);
  const participantsText = participants.filter((p) => p.role === 'participant' || p.role === 'watcher').map((p) => p.email).join(', ');
  const personOpts = users.map((u) => ({ email: u.email, name: u.display_name || u.email, avatar: u.avatar_url }));
  const unitOpts = units.filter((u) => u.type !== 'company').map((u) => ({ id: u.id, name: u.name, type: u.type }));
  // OKR để gắn khi thêm việc: theo kỳ của cuộc họp (fallback kỳ hiện tại).
  const periodForObjs = m.period_id ?? (await getCurrentPeriod())?.id ?? null;
  const objectiveOpts = periodForObjs ? await listObjectivesWithKrs(periodForObjs) : [];

  return (
    <>
      <SiteHeader active="meetings" />
      <div className="wrap">
        <p className="subtitle" style={{ marginBottom: 6 }}><Link href="/meetings">← Cuộc họp</Link></p>

        {/* Header */}
        <div className="card">
          <div className="flexbtw flexbtw-top">
            <div>
              <div className="pagetitle" style={{ marginBottom: 4 }}>
                {m.code && <span className="okr-code" style={{ fontSize: 14, marginRight: 8 }}>{m.code}</span>}{m.title}
              </div>
              <div className="obj-meta">
                <span className="badge blue" style={{ marginRight: 6 }}>{MEETING_TYPE_LABEL[m.type]}</span>
                <span className={`badge ${MEETING_STATUS_CLS[m.status]}`} style={{ marginRight: 6 }}>{MEETING_STATUS_LABEL[m.status]}</span>
                {m.meeting_at ? `🕑 ${fmtDateTime(m.meeting_at)}` : ''}{m.location ? ` · 📍 ${m.location}` : ''}
              </div>
              <div className="obj-meta" style={{ marginTop: 4 }}>
                Chủ trì: <b>{m.owner_name ?? m.owner_email ?? '—'}</b>
                {m.secretary_email ? ` · Thư ký: ${m.secretary_email}` : ''}
                {m.unit_name ? ` · ${m.unit_name}` : ''}
                {m.project_name ? ` · 🗂 ${m.project_name}` : ''}
                {` · 👁 ${VISIBILITY_LABEL[m.visibility]}`}
              </div>
              {(m.previous_meeting_id || followUps.length > 0) && (
                <div className="obj-meta mtg-chain" style={{ marginTop: 6 }}>
                  {m.previous_meeting_id && (
                    <Link href={`/meetings/${m.previous_meeting_id}`} className="ctx-chip ctx-mtg" title="Cuộc họp trước trong chuỗi">
                      ← Trước: {m.prev_code || m.prev_title}
                    </Link>
                  )}
                  {followUps.map((f) => (
                    <Link key={f.id} href={`/meetings/${f.id}`} className="ctx-chip ctx-mtg" title="Cuộc họp nối tiếp">
                      Tiếp: {f.code || f.title} →
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {canManage && (
              <div className="row-actions">
                <EditModal title="Sửa cuộc họp" label="Sửa" icon={<NavIcon name="pencil" />} submitLabel="Lưu cuộc họp" action={updateMeetingAction} wide>
                  <MeetingFields users={users} units={units} projects={projectOpts} meetings={meetingOpts} defaultOwner={user.email} meeting={m} participantsText={participantsText} />
                </EditModal>
                <form action={deleteMeetingAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <ConfirmButton label={<NavIcon name="trash" />} className="icon-btn danger" title="Xoá cuộc họp" message={`Xoá cuộc họp "${m.title}"? Không hoàn tác.`} />
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Agenda */}
        {m.agenda && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Chương trình (Agenda)</h3>
            <p className="charter-p">{m.agenda}</p>
          </div>
        )}

        {/* Biên bản + quyết định */}
        <div className="card">
          <div className="flexbtw flexbtw-top">
            <h3 style={{ marginTop: 0 }}>Biên bản &amp; Quyết định</h3>
            {canManage && (
              <EditModal title="Ghi biên bản cuộc họp" label={m.minutes || m.decisions ? 'Sửa biên bản' : 'Ghi biên bản'} icon={<NavIcon name="pencil" />} submitLabel="Lưu biên bản" action={saveMinutesAction} wide>
                <input type="hidden" name="id" value={m.id} />
                <label className="f">Biên bản (minutes)</label>
                <textarea className="i" name="minutes" rows={8} defaultValue={m.minutes ?? ''} placeholder="Nội dung trao đổi, ý kiến, kết luận…" />
                <label className="f">Quyết định chính</label>
                <textarea className="i" name="decisions" rows={4} defaultValue={m.decisions ?? ''} placeholder="Các quyết định đã chốt…" />
              </EditModal>
            )}
          </div>
          {m.minutes || m.decisions ? (
            <>
              {m.minutes && <p className="charter-p" style={{ marginTop: 6 }}>{m.minutes}</p>}
              {m.decisions && (
                <div style={{ marginTop: 12 }}>
                  <div className="charter-k">Quyết định chính</div>
                  <p className="charter-p">{m.decisions}</p>
                </div>
              )}
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>Chưa ghi biên bản. {canManage ? 'Bấm "Ghi biên bản" ở góc phải-trên.' : ''}</p>
          )}
        </div>

        {/* Hành động (next actions) — thêm việc + xem list/kanban/gantt như trang dự án */}
        <div className="card">
          <div className="flexbtw flexbtw-top">
            <h3 style={{ marginTop: 0 }}>Hành động (next actions) — {tasks.length} việc<HelpTip k="meeting-tasks" /></h3>
            {canManage && (
              <AddTaskToMeeting meetingId={m.id} objectives={objectiveOpts} users={personOpts} units={unitOpts} create={createMeetingTaskAction} />
            )}
          </div>
          {tasks.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Chưa có hành động nào. {canManage ? 'Bấm “＋ Thêm việc” để thêm next action cho cuộc họp (gắn OKR tuỳ chọn).' : 'Các công việc gắn cuộc họp sẽ hiển thị ở đây.'}
            </p>
          ) : (
            <ExecutionTabs
              initiatives={tasks}
              canManage={canManage}
              currentEmail={user.email}
              move={moveInitiativeAction}
              save={editInitiativeAction}
              del={deleteInitiativeAction}
              createChild={createInitiativeAction}
              createProjectForInit={createProjectForInitiativeAction}
              objectiveId=""
              users={personOpts}
              units={unitOpts}
              projects={projectOpts}
              meetings={meetingOpts}
              manageStructure={false}
              context="meeting"
            >
              <></>
            </ExecutionTabs>
          )}
        </div>

        <div className="grid two">
          {/* Người tham gia */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Người tham gia ({participants.length})</h3>
            {participants.length === 0 ? <p className="muted" style={{ margin: 0 }}>Chưa thêm người tham gia.</p> : (
              <ul className="charter-ul" style={{ paddingLeft: 16 }}>
                {participants.map((p) => (
                  <li key={p.email}><b>{p.name || p.email}</b> <span className="muted" style={{ fontSize: 12 }}>· {PART_ROLE[p.role] ?? p.role}</span></li>
                ))}
              </ul>
            )}
          </div>

          {/* Yêu cầu xem (chủ trì/thư ký) */}
          {canManage && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Yêu cầu xem {pending.length > 0 && <span className="badge amber">{pending.length}</span>}</h3>
              {pending.length === 0 ? <p className="muted" style={{ margin: 0 }}>Không có yêu cầu chờ duyệt.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pending.map((r) => (
                    <div key={r.id} className="req-row">
                      <div>
                        <b>{r.requester_name || r.requester_email}</b>
                        {r.reason && <div className="muted" style={{ fontSize: 12.5 }}>{r.reason}</div>}
                      </div>
                      <div className="row-actions">
                        <form action={decideMeetingAccessAction}>
                          <input type="hidden" name="id" value={m.id} />
                          <input type="hidden" name="request_id" value={r.id} />
                          <input type="hidden" name="decision" value="approve" />
                          <button className="btn sm" type="submit">Duyệt</button>
                        </form>
                        <form action={decideMeetingAccessAction}>
                          <input type="hidden" name="id" value={m.id} />
                          <input type="hidden" name="request_id" value={r.id} />
                          <input type="hidden" name="decision" value="deny" />
                          <button className="btn ghost sm" type="submit">Từ chối</button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
