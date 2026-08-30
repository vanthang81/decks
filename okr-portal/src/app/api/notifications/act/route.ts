import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getUser } from '@/lib/users';
import {
  getNotification, markRead, markSiblingNotifsRead, notifySimple,
} from '@/lib/notifications';
import {
  decideAccessRequest, getAccessRequestById, getMeeting, isMeetingEditor,
} from '@/lib/meetings';
import { loadAccess, canApproveUsers, invalidateAccess } from '@/lib/access';
import { getInvite, decideInvite } from '@/lib/invites';
import { addComment, type EntityType } from '@/lib/comments';
import { sendMail } from '@/lib/mail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const APP_URL = process.env.AUTH_URL || 'https://okr.consultx.vn';
const COMMENT_ENTITIES: EntityType[] = ['objective', 'key_result', 'initiative'];

async function me() {
  const s = await auth();
  const email = s?.user?.email;
  if (!email) return null;
  const u = await getUser(email);
  return u && u.is_active ? u : null;
}

/**
 * XỬ LÝ NGAY một thông báo tại chuông — không cần mở đúng cuộc họp/lời mời/mục (CFO 30/08).
 * body: { id, action: 'approve' | 'deny' | 'comment', text? }
 *  - approve/deny: cho yêu cầu xem cuộc họp (meeting_access) & lời mời người dùng (user_invite);
 *    `text` (tuỳ chọn) = ghi chú gửi kèm cho người yêu cầu.
 *  - comment: cho thông báo gắn với 1 mục (OKR/KR/công việc) → thêm bình luận thẳng vào mục đó.
 * Luôn KIỂM QUYỀN lại phía máy chủ theo đúng loại (không tin client).
 */
export async function POST(req: NextRequest) {
  const u = await me();
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const id = String(b?.id ?? '');
  const action = String(b?.action ?? '');
  const text = String(b?.text ?? '').trim();
  if (!id || !['approve', 'deny', 'comment'].includes(action)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const n = await getNotification(id, u.email);
  if (!n) return NextResponse.json({ error: 'Không tìm thấy thông báo.' }, { status: 404 });

  try {
    // ── Bình luận thẳng vào mục (OKR / KR / công việc) ──
    if (action === 'comment') {
      if (!n.entity_type || !n.entity_id || !COMMENT_ENTITIES.includes(n.entity_type as EntityType)) {
        return NextResponse.json({ error: 'Thông báo này không gắn với mục có thể bình luận.' }, { status: 400 });
      }
      if (!text) return NextResponse.json({ error: 'Nội dung bình luận trống.' }, { status: 400 });
      await addComment({
        entityType: n.entity_type as EntityType,
        entityId: n.entity_id,
        parentId: n.comment_id ?? null, // trả lời đúng luồng nếu thông báo là từ 1 bình luận
        authorEmail: u.email,
        authorName: u.display_name || u.email,
        body: text,
        mentions: [],
      });
      await markRead(u.email, id);
      return NextResponse.json({ ok: true, outcome: 'commented' });
    }

    const approve = action === 'approve';

    // ── Duyệt/từ chối YÊU CẦU XEM CUỘC HỌP ──
    if (n.type === 'meeting_access_request') {
      if (!n.entity_id) {
        return NextResponse.json({ error: 'Thông báo cũ — vui lòng mở cuộc họp để xử lý.', legacy: true }, { status: 409 });
      }
      const reqRow = await getAccessRequestById(n.entity_id);
      if (!reqRow) return NextResponse.json({ error: 'Yêu cầu không còn tồn tại.' }, { status: 404 });
      const m = await getMeeting(reqRow.meeting_id);
      if (!m) return NextResponse.json({ error: 'Cuộc họp không còn tồn tại.' }, { status: 404 });
      if (!(await isMeetingEditor(u, reqRow.meeting_id, m))) {
        return NextResponse.json({ error: 'Bạn không có quyền duyệt yêu cầu này.' }, { status: 403 });
      }
      if (reqRow.status === 'pending') {
        const r = await decideAccessRequest(n.entity_id, approve, u.email);
        if (r) {
          const note = text ? ` — “${text}”` : '';
          await notifySimple({
            recipients: [r.requester],
            type: 'meeting_access_decided',
            actorEmail: u.email,
            actorName: u.display_name || u.email,
            preview: approve
              ? `đã DUYỆT quyền xem cuộc họp "${m.title}"${note}`
              : `đã từ chối quyền xem cuộc họp "${m.title}"${note}`,
            link: approve ? `/meetings/${reqRow.meeting_id}` : '/meetings',
          }).catch(() => {});
        }
      }
      await markSiblingNotifsRead('meeting_access_request', n.entity_id);
      return NextResponse.json({ ok: true, outcome: approve ? 'approved' : 'denied' });
    }

    // ── Duyệt/từ chối LỜI MỜI NGƯỜI DÙNG ──
    if (n.type === 'user_invite_pending') {
      const access = await loadAccess();
      if (!canApproveUsers(u, access)) {
        return NextResponse.json({ error: 'Bạn không có quyền duyệt người dùng.' }, { status: 403 });
      }
      if (!n.entity_id) {
        return NextResponse.json({ error: 'Thông báo cũ — vui lòng mở trang duyệt để xử lý.', legacy: true }, { status: 409 });
      }
      const iv = await getInvite(n.entity_id);
      if (!iv) return NextResponse.json({ error: 'Lời mời không còn tồn tại.' }, { status: 404 });
      const r = await decideInvite(n.entity_id, approve, u.email);
      if (r) {
        invalidateAccess();
        const note = text ? ` — “${text}”` : '';
        await notifySimple({
          recipients: [iv.invited_by],
          type: 'user_invite_decided',
          actorEmail: u.email,
          actorName: u.display_name || u.email,
          preview: approve
            ? `đã DUYỆT lời mời cho ${iv.email} — người dùng đã được kích hoạt${note}`
            : `đã từ chối lời mời cho ${iv.email}${note}`,
          link: approve ? '/admin/users' : '/admin/invites',
        }).catch(() => {});
        if (approve) {
          await sendMail({
            to: iv.email,
            subject: '[OKR BTMH] Bạn đã được mời vào Hệ thống Quản trị Hiệu suất',
            html:
              `<p>Xin chào${iv.display_name ? ' ' + iv.display_name : ''},</p>` +
              `<p>Bạn đã được mời tham gia <b>Hệ thống Quản trị Hiệu suất BTMH</b>. ` +
              `Vui lòng đăng nhập bằng tài khoản Google theo địa chỉ email này:</p>` +
              `<p><a href="${APP_URL}/login">Đăng nhập tại ${APP_URL}</a></p>`,
          }).catch(() => {});
        }
      }
      await markSiblingNotifsRead('user_invite_pending', n.entity_id);
      return NextResponse.json({ ok: true, outcome: approve ? 'approved' : 'denied' });
    }

    return NextResponse.json({ error: 'Thông báo này không hỗ trợ thao tác duyệt/từ chối.' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
