'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/current-user';
import { loadAccess, canApproveUsers, invalidateAccess } from '@/lib/access';
import {
  createInvite, decideInvite, getInvite, listApproverEmails,
} from '@/lib/invites';
import { notifySimple } from '@/lib/notifications';
import { sendMail } from '@/lib/mail';

function str(fd: FormData, k: string): string { return String(fd.get(k) ?? '').trim(); }
function orNull(s: string): string | null { return s === '' ? null : s; }

const APP_URL = process.env.AUTH_URL || 'https://okr.consultx.vn';

/**
 * ĐỀ XUẤT thêm người dùng mới qua email (bất kỳ ai đăng nhập cũng đề xuất được — CFO 11/08).
 * Chưa tạo user ngay: ghi lời mời PENDING → báo cho người có quyền "Duyệt người dùng" (chuông + email).
 */
export async function inviteUserAction(fd: FormData) {
  const me = await requireUser();
  const email = str(fd, 'email').toLowerCase();
  if (!email.includes('@')) throw new Error('Email không hợp lệ.');
  const res = await createInvite({
    email,
    display_name: orNull(str(fd, 'display_name')),
    role: str(fd, 'role') || 'staff',
    unit_id: orNull(str(fd, 'unit_id')),
    note: orNull(str(fd, 'note')),
    invitedBy: me.email,
  });
  if (res.status === 'exists_user') throw new Error('Email này đã là người dùng của hệ thống.');
  if (res.status === 'exists_pending') throw new Error('Email này đã có lời mời đang chờ duyệt.');

  // Báo cho người có quyền duyệt: chuông + email (best-effort).
  const approvers = await listApproverEmails().catch(() => []);
  const preview = `đề xuất thêm người dùng mới: ${str(fd, 'display_name') || email} (${email})`;
  await notifySimple({
    recipients: approvers,
    type: 'user_invite_pending',
    actorEmail: me.email,
    actorName: me.display_name || me.email,
    preview,
    link: '/admin/invites#pending-invites', // mở đúng danh sách "Chờ duyệt"
    entityType: 'user_invite',
    entityId: res.status === 'created' ? res.id : null,
  }).catch(() => {});
  for (const a of approvers) {
    if (a.toLowerCase() === me.email.toLowerCase()) continue;
    await sendMail({
      to: a,
      subject: '[OKR BTMH] Có lời mời người dùng chờ duyệt',
      html:
        `<p><b>${me.display_name || me.email}</b> ${preview}.</p>` +
        (str(fd, 'note') ? `<blockquote style="border-left:3px solid #7C0312;padding-left:10px;color:#333">${str(fd, 'note')}</blockquote>` : '') +
        `<p><a href="${APP_URL}/admin/invites">Mở trang duyệt người dùng →</a></p>`,
    }).catch(() => {});
  }
  revalidatePath('/admin/invites');
}

/** DUYỆT / TỪ CHỐI lời mời (chỉ người có quyền 'user.approve'). */
export async function decideInviteAction(fd: FormData) {
  const me = await requireUser();
  const access = await loadAccess();
  if (!canApproveUsers(me, access)) throw new Error('Bạn không có quyền duyệt người dùng.');
  const id = str(fd, 'id');
  const approve = str(fd, 'decision') === 'approve';
  const iv = await getInvite(id);
  if (!iv) throw new Error('Không tìm thấy lời mời.');
  const r = await decideInvite(id, approve, me.email);
  if (!r) throw new Error('Lời mời đã được xử lý.');
  invalidateAccess();

  // Báo cho người đề xuất (chuông).
  await notifySimple({
    recipients: [iv.invited_by],
    type: 'user_invite_decided',
    actorEmail: me.email,
    actorName: me.display_name || me.email,
    preview: approve
      ? `đã DUYỆT lời mời cho ${iv.email} — người dùng đã được kích hoạt`
      : `đã từ chối lời mời cho ${iv.email}`,
    link: approve ? '/admin/users' : '/admin/invites',
  }).catch(() => {});

  // Được duyệt → gửi email mời người dùng mới (đăng nhập bằng Google).
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
  revalidatePath('/admin/invites');
  revalidatePath('/admin/users');
}
