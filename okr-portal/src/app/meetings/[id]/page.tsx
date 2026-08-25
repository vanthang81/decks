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
import MinutesEditor from '@/components/MinutesEditor';
import UserLink from '@/components/UserLink';
import ActivityLogButton from '@/components/ActivityLogButton';
import { loadEntityAuditAction } from '@/app/audit/actions';
import { sanitizeRichHtml } from '@/lib/sanitizeHtml';
import { meetingMinutesTaskStates, applyTaskDoneToMinutes, renderMinutesTasksView } from '@/lib/minutes-tasks';
import { requireUser } from '@/lib/current-user';
import { listUsers, personTitle } from '@/lib/users';
import { listUnits } from '@/lib/org';
import { listAllProjectOptions } from '@/lib/projects';
import { listObjectivesWithKrs } from '@/lib/okr';
import { getCurrentPeriod } from '@/lib/periods';
import {
  getMeeting, canViewMeeting, canManageMeetingWith, listParticipants, listMeetingOptions, listFollowUpMeetings,
  listAccessRequests, myAccessRequest, getMeetingUnitIds, getMeetingProjectIds,
  MEETING_TYPE_LABEL, meetingStatusView, VISIBILITY_LABEL,
} from '@/lib/meetings';
import { listInitiativesForMeeting } from '@/lib/initiatives';
import { fmtDateTime } from '@/lib/format';
import {
  updateMeetingAction, saveMinutesAction, autosaveMinutesAction, deleteMeetingAction,
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

  // ── Chưa được xem: chỉ hiện thông tin cơ bản + xin quyền ──
  if (!canView) {
    const mine = await myAccessRequest(m.id, user.email);
    return (
      <>
        <SiteHeader active="meetings" />
        <div className="wrap">
          <p className="subtitle" style={{ marginBottom: 6 }}><Link href="/meetings">← Cuộc họp</Link></p>
          <div className="pagetitle">{m.code && <span className="okr-code" style={{ fontSize: 14, marginRight: 8 }}>{m.code}</span>}{m.title}</div>
          <p className="subtitle">{MEETING_TYPE_LABEL[m.type]} · Chủ trì: <UserLink email={m.owner_email} name={m.owner_name ?? m.owner_email ?? '—'} />{m.meeting_at ? ` · ${fmtDateTime(m.meeting_at)}` : ''}</p>
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

  // Nạp participants trước để tính quyền sửa (gồm đồng chủ trì & nhiều thư ký).
  const participants = await listParticipants(m.id);
  const canManage = canManageMeetingWith(user, m, participants);

  const [tasks, pending, users, units, projectOpts, meetingOpts, followUps, unitIds, projectIds] = await Promise.all([
    listInitiativesForMeeting(m.id),
    canManage ? listAccessRequests(m.id, 'pending') : Promise.resolve([]),
    listUsers(), listUnits(), listAllProjectOptions(), listMeetingOptions(user), listFollowUpMeetings(m.id, user),
    getMeetingUnitIds(m.id), getMeetingProjectIds(m.id),
  ]);
  const ownerLc = m.owner_email?.toLowerCase() ?? '';
  const participantsText = participants.filter((p) => p.role === 'participant' || p.role === 'watcher').map((p) => p.email).join(', ');
  // Đồng chủ trì = role host trừ chủ trì chính; thư ký = role secretary. Để prefill ô chọn nhiều người.
  const cohostText = participants.filter((p) => p.role === 'host' && p.email.toLowerCase() !== ownerLc).map((p) => p.email).join(', ');
  const secretaryText = participants.filter((p) => p.role === 'secretary').map((p) => p.email).join(', ');
  const cohostList = participants.filter((p) => p.role === 'host' && p.email.toLowerCase() !== ownerLc);
  const secretaryList = participants.filter((p) => p.role === 'secretary');
  // Chuỗi tên → link hồ sơ user (mỗi tên bấm được). Ngăn cách bằng dấu phẩy.
  const nameLinks = (list: { email: string; name: string | null }[]) =>
    list.map((p, i) => (
      <span key={p.email}>{i > 0 ? ', ' : ''}<UserLink email={p.email} name={p.name || p.email} /></span>
    ));
  const personOpts = users.map((u) => ({ email: u.email, name: u.display_name || u.email, avatar: u.avatar_url, unit_id: u.unit_id, title: personTitle(u) }));
  // Tra chức danh (vai trò · đơn vị) theo email — kèm vào danh sách người tham gia để phân biệt người trùng tên.
  const titleByEmail = new Map(personOpts.filter((p) => p.title).map((p) => [p.email.toLowerCase(), p.title as string]));
  const unitOpts = units.filter((u) => u.type !== 'company').map((u) => ({ id: u.id, name: u.name, type: u.type, parent_id: u.parent_id, sort: u.sort }));
  // OKR để gắn khi thêm việc: theo kỳ của cuộc họp (fallback kỳ hiện tại).
  const periodForObjs = m.period_id ?? (await getCurrentPeriod())?.id ?? null;
  const objectiveOpts = periodForObjs ? await listObjectivesWithKrs(periodForObjs) : [];

  // Phản ánh dấu tick 2 chiều: việc "[]" đánh Xong ở phần Hành động → hiện [x] trong biên bản.
  const mtStates = await meetingMinutesTaskStates(m.id);
  const displayMinutes = applyTaskDoneToMinutes(
    m.minutes ?? '', mtStates.done, mtStates.open,
    personOpts.map((p) => ({ email: p.email, name: p.name })), new Date().getFullYear(),
  );

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
                {(() => { const sv = meetingStatusView(m); return <span className={`badge ${sv.cls}`} style={{ marginRight: 6 }}>{sv.label}</span>; })()}
                {m.meeting_at ? `🕑 ${fmtDateTime(m.meeting_at)}` : ''}{m.location ? ` · 📍 ${m.location}` : ''}
              </div>
              <div className="obj-meta" style={{ marginTop: 4 }}>
                Chủ trì: <b><UserLink email={m.owner_email} name={m.owner_name ?? m.owner_email ?? '—'} /></b>
                {cohostList.length > 0 ? <>, {nameLinks(cohostList)}</> : ''}
                {secretaryList.length > 0 ? <> · Thư ký: {nameLinks(secretaryList)}</> : ''}
                {m.related_units ? ` · ${m.related_units}` : ''}
                {m.related_projects ? ` · 🗂 ${m.related_projects}` : ''}
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
            <div className="row-actions">
              <ActivityLogButton entity="meeting" entityId={m.id} load={loadEntityAuditAction} />
              {canManage && (
              <>
                <EditModal title="Sửa cuộc họp" label="Sửa" icon={<NavIcon name="pencil" />} submitLabel="Lưu cuộc họp" action={updateMeetingAction} wide>
                  <MeetingFields users={users} units={units} projects={projectOpts} meetings={meetingOpts} defaultOwner={user.email} meeting={m} participantsText={participantsText} cohostText={cohostText} secretaryText={secretaryText} unitIds={unitIds} projectIds={projectIds} />
                </EditModal>
                <form action={deleteMeetingAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <ConfirmButton label={<NavIcon name="trash" />} className="icon-btn danger" title="Xoá cuộc họp" message={`Xoá cuộc họp "${m.title}"? Không hoàn tác.`} />
                </form>
              </>
              )}
            </div>
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
              <EditModal title="Ghi biên bản cuộc họp" label={m.minutes || m.decisions ? 'Sửa biên bản' : 'Ghi biên bản'} icon={<NavIcon name="pencil" />} submitLabel="Lưu &amp; đóng" action={saveMinutesAction} wide>
                <input type="hidden" name="id" value={m.id} />
                <MinutesEditor
                  meetingId={m.id}
                  initialMinutes={displayMinutes}
                  initialDecisions={m.decisions ?? ''}
                  action={autosaveMinutesAction}
                  savedByName={m.minutes_updated_by_name || m.minutes_updated_by || ''}
                  savedAtLabel={m.minutes_updated_at ? fmtDateTime(m.minutes_updated_at) : ''}
                  currentUserName={user.display_name || user.email}
                  people={personOpts.map((p) => ({ email: p.email, name: p.name }))}
                />
              </EditModal>
            )}
          </div>
          {(m.minutes || m.decisions) && m.minutes_updated_at && (
            <p className="muted" style={{ margin: '2px 0 0', fontSize: 12.5 }}>
              Lưu lần cuối{(m.minutes_updated_by_name || m.minutes_updated_by) ? <> bởi <UserLink email={m.minutes_updated_by} name={m.minutes_updated_by_name || m.minutes_updated_by} /></> : ''} · {fmtDateTime(m.minutes_updated_at)}
            </p>
          )}
          {m.minutes || m.decisions ? (
            <>
              {m.minutes && (
                <div className="rte-view" style={{ marginTop: 6 }} dangerouslySetInnerHTML={{ __html: renderMinutesTasksView(displayMinutes, personOpts.map((p) => ({ email: p.email, name: p.name })), new Date().getFullYear()) }} />
              )}
              {m.decisions && (
                <div style={{ marginTop: 12 }}>
                  <div className="charter-k">Quyết định chính</div>
                  <div className="rte-view" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(m.decisions) }} />
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
              objectives={objectiveOpts}
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
                  <li key={p.email}><b><UserLink email={p.email} name={p.name || p.email} /></b> <span className="muted" style={{ fontSize: 12 }}>· {PART_ROLE[p.role] ?? p.role}{titleByEmail.get(p.email.toLowerCase()) ? ` · ${titleByEmail.get(p.email.toLowerCase())}` : ''}</span></li>
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
