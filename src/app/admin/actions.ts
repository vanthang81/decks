'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import {
  upsertDeck, getDeckById, updateDeckContent, updateDeckMeta,
  setDeckPassword, generateDeckPassword, setDeckPublished, deleteDeck, type Visibility,
} from '@/lib/decks';
import { generateDeckThumbnail } from '@/lib/thumbnail';
import { upsertViewer } from '@/lib/viewers';
import { issueGrant, revokeGrant, revokeGroupOnDeck } from '@/lib/grants';
import { getAdmin, addAdmin, setAdminActive, setAdminRole, removeAdmin, countActiveAdmins, type AdminRole } from '@/lib/admins';
import { createGroup, deleteGroup, addMember, removeMember, grantDeckToGroup } from '@/lib/groups';
import { getRequest, setRequestStatus, approveAndGrant, denyRequest } from '@/lib/accessRequests';
import { sendMail } from '@/lib/mail';

// Bắt buộc là admin allowlist ĐANG hoạt động. Viewer đăng nhập Google có phiên nhưng KHÔNG phải admin
// → KHÔNG được gọi các server action quản trị (chặn ở đây, không chỉ dựa vào việc "có phiên").
async function requireAdminEmail(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect('/login');
  const me = await getAdmin(email).catch(() => null);
  if (!me || !me.is_active) redirect('/login?error=AccessDenied');
  return email;
}

// Chỉ vai trò 'admin' mới quản trị viên khác được.
async function requireOwnerAdmin(): Promise<string> {
  const email = await requireAdminEmail();
  const me = await getAdmin(email);
  if (me?.role !== 'admin') redirect('/admin?err=forbidden');
  return email;
}

// ---- Quản trị viên ----
export async function addAdminAction(formData: FormData) {
  const by = await requireOwnerAdmin();
  void by;
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const role = (String(formData.get('role') ?? 'editor') === 'admin' ? 'admin' : 'editor') as AdminRole;
  const name = String(formData.get('display_name') ?? '').trim() || null;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
  await addAdmin(email, role, name);
  revalidatePath('/admin/admins');
}

export async function setAdminActiveAction(formData: FormData) {
  await requireOwnerAdmin();
  const email = String(formData.get('email') ?? '');
  const active = String(formData.get('active') ?? '') === 'true';
  // chặn tự vô hiệu admin cuối
  if (!active && (await countActiveAdmins()) <= 1) return;
  await setAdminActive(email, active);
  revalidatePath('/admin/admins');
}

export async function setAdminRoleAction(formData: FormData) {
  await requireOwnerAdmin();
  const email = String(formData.get('email') ?? '');
  const role = (String(formData.get('role') ?? 'editor') === 'admin' ? 'admin' : 'editor') as AdminRole;
  if (role !== 'admin' && (await countActiveAdmins()) <= 1) return;
  await setAdminRole(email, role);
  revalidatePath('/admin/admins');
}

export async function removeAdminAction(formData: FormData) {
  await requireOwnerAdmin();
  const email = String(formData.get('email') ?? '');
  const me = await getAdmin(await requireAdminEmail());
  if (me?.email?.toLowerCase() === email.toLowerCase()) return; // không tự xoá mình
  await removeAdmin(email);
  revalidatePath('/admin/admins');
}

// ---- Nhóm người xem ----
export async function createGroupAction(formData: FormData) {
  const by = await requireAdminEmail();
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return;
  await createGroup(name, String(formData.get('description') ?? '').trim() || null, by);
  revalidatePath('/admin/groups');
}

export async function deleteGroupAction(formData: FormData) {
  await requireAdminEmail();
  const id = String(formData.get('group_id') ?? '');
  if (id) await deleteGroup(id);
  revalidatePath('/admin/groups');
}

export async function addGroupMemberAction(formData: FormData) {
  const by = await requireAdminEmail();
  const groupId = String(formData.get('group_id') ?? '');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!groupId || !email) return;
  const viewer = await upsertViewer({
    email,
    name: String(formData.get('name') ?? '').trim() || null,
    company: String(formData.get('company') ?? '').trim() || null,
    createdBy: by,
  });
  await addMember(groupId, viewer.id, by);
  revalidatePath(`/admin/groups/${groupId}`);
}

export async function removeGroupMemberAction(formData: FormData) {
  await requireAdminEmail();
  const groupId = String(formData.get('group_id') ?? '');
  const viewerId = String(formData.get('viewer_id') ?? '');
  if (groupId && viewerId) await removeMember(groupId, viewerId);
  revalidatePath(`/admin/groups/${groupId}`);
}

// ---- Phân quyền deck theo nhóm ----
export async function grantDeckToGroupAction(formData: FormData) {
  const by = await requireAdminEmail();
  const deckId = String(formData.get('deck_id') ?? '');
  const groupId = String(formData.get('group_id') ?? '');
  if (deckId && groupId) await grantDeckToGroup(deckId, groupId, by);
  revalidatePath(`/admin/decks/${deckId}`);
}

export async function revokeGroupOnDeckAction(formData: FormData) {
  await requireAdminEmail();
  const deckId = String(formData.get('deck_id') ?? '');
  const groupId = String(formData.get('group_id') ?? '');
  if (deckId && groupId) await revokeGroupOnDeck(deckId, groupId);
  revalidatePath(`/admin/decks/${deckId}`);
}

// Chuỗi tags "a, b, c" -> mảng đã trim/dedupe (tối đa 12 thẻ).
function parseTags(s: string): string[] {
  return Array.from(
    new Set(
      s.split(',').map((t) => t.trim()).filter((t) => t.length > 0 && t.length <= 40),
    ),
  ).slice(0, 12);
}

// Cập nhật metadata phân loại (danh mục / thẻ / công ty) cho deck.
export async function updateDeckMetaAction(formData: FormData) {
  await requireAdminEmail();
  const deckId = String(formData.get('deck_id') ?? '');
  if (!deckId) return;
  await updateDeckMeta(deckId, {
    category: String(formData.get('category') ?? '').trim() || null,
    tags: parseTags(String(formData.get('tags') ?? '')),
    company: String(formData.get('company') ?? '').trim() || 'BTMH',
  });
  revalidatePath(`/admin/decks/${deckId}`);
  revalidatePath('/');
}

// Tạo/làm mới ảnh preview (chụp slide đầu bằng browserless).
export async function generateThumbnailAction(formData: FormData) {
  await requireAdminEmail();
  const deckId = String(formData.get('deck_id') ?? '');
  if (!deckId) return;
  const deck = await getDeckById(deckId);
  if (!deck) return;
  const ok = await generateDeckThumbnail({ id: deck.id, slug: deck.slug });
  revalidatePath(`/admin/decks/${deckId}`);
  revalidatePath('/');
  redirect(`/admin/decks/${deckId}?thumb=${ok ? 'ok' : 'fail'}`);
}

// Lấy nội dung HTML từ form: ưu tiên file upload 'htmlfile', rồi textarea 'content'. null nếu không có.
async function extractContent(formData: FormData): Promise<string | null> {
  const file = formData.get('htmlfile');
  if (file && typeof file === 'object' && 'text' in file && (file as File).size > 0) {
    const text = await (file as File).text();
    if (text.trim().length > 0) return text;
  }
  const pasted = String(formData.get('content') ?? '').trim();
  return pasted.length > 0 ? pasted : null;
}

export async function createDeckAction(formData: FormData) {
  const by = await requireAdminEmail();
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();
  const title = String(formData.get('title') ?? '').trim();
  if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(slug) || !title) return;
  const content = await extractContent(formData);
  const deck = await upsertDeck({
    slug,
    title,
    description: (String(formData.get('description') ?? '').trim() || null),
    visibility: (String(formData.get('visibility') ?? 'protected') as Visibility),
    require_otp: formData.get('require_otp') === 'on',
    is_published: formData.get('is_published') !== 'off',
    content,
    createdBy: by,
  });
  await updateDeckMeta(deck.id, {
    category: String(formData.get('category') ?? '').trim() || null,
    tags: parseTags(String(formData.get('tags') ?? '')),
    company: String(formData.get('company') ?? '').trim() || 'BTMH',
  });
  if (content) await generateDeckThumbnail({ id: deck.id, slug: deck.slug }).catch(() => false);
  revalidatePath('/admin');
  revalidatePath('/');
}

// ---- Lưu trữ (ẩn/hiện) & xoá deck ----
// Ẩn = is_published false: deck không phục vụ qua /d/<slug> (404), ẩn khỏi thư viện người xem. Khôi phục được.
export async function setDeckPublishedAction(formData: FormData) {
  await requireAdminEmail();
  const deckId = String(formData.get('deck_id') ?? '');
  const published = String(formData.get('published') ?? '') === 'true';
  if (!deckId) return;
  await setDeckPublished(deckId, published);
  revalidatePath(`/admin/decks/${deckId}`);
  revalidatePath('/admin');
  revalidatePath('/');
}

// Xoá vĩnh viễn — yêu cầu gõ đúng slug để xác nhận (tránh xoá nhầm). Cascade dọn link đã cấp + quyền nhóm.
export async function deleteDeckAction(formData: FormData) {
  await requireAdminEmail();
  const deckId = String(formData.get('deck_id') ?? '');
  if (!deckId) return;
  const deck = await getDeckById(deckId);
  if (!deck) redirect('/admin');
  const confirm = String(formData.get('confirm_slug') ?? '').trim();
  if (confirm !== deck!.slug) redirect(`/admin/decks/${deckId}?del=mismatch`);
  await deleteDeck(deckId);
  revalidatePath('/admin');
  revalidatePath('/');
  redirect(`/admin?deleted=${encodeURIComponent(deck!.slug)}`);
}

export async function updateContentAction(formData: FormData) {
  await requireAdminEmail();
  const deckId = String(formData.get('deck_id') ?? '');
  if (!deckId) return;
  const content = await extractContent(formData);
  if (content) {
    await updateDeckContent(deckId, content);
    const deck = await getDeckById(deckId);
    if (deck) await generateDeckThumbnail({ id: deck.id, slug: deck.slug }).catch(() => false);
  }
  revalidatePath(`/admin/decks/${deckId}`);
  revalidatePath('/');
}

export async function issueLinkAction(formData: FormData) {
  const by = await requireAdminEmail();
  const deckId = String(formData.get('deck_id') ?? '');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!deckId || !email) return;
  const deck = await getDeckById(deckId);
  if (!deck) return;

  const viewer = await upsertViewer({
    email,
    name: String(formData.get('name') ?? '').trim() || null,
    company: String(formData.get('company') ?? '').trim() || null,
    createdBy: by,
  });
  const { token } = await issueGrant(deckId, viewer.id, by);
  const link = `${process.env.APP_URL ?? ''}/v/${token}`;

  if (formData.get('send_email') === 'on') {
    await sendMail({
      to: email,
      subject: `Mời xem deck: ${deck.title}`,
      html: `<p>Bạn được mời xem deck <b>${deck.title}</b>.</p>
             <p><a href="${link}">Mở deck</a> (link cá nhân, chỉ dành cho bạn).</p>`,
      kind: 'link',
    }).catch(() => {});
  }
  revalidatePath(`/admin/decks/${deckId}`);
  redirect(`/admin/decks/${deckId}?link=${encodeURIComponent(link)}`);
}

export async function revokeLinkAction(formData: FormData) {
  await requireAdminEmail();
  const grantId = String(formData.get('grant_id') ?? '');
  const deckId = String(formData.get('deck_id') ?? '');
  if (grantId) await revokeGrant(grantId);
  revalidatePath(`/admin/decks/${deckId}`);
}

// ---- Yêu cầu cấp quyền xem (từ trang gate) ----
// Duyệt = cấp grant + gửi link cho người xem. Đổi quyết định được (approve/deny lại bất cứ lúc nào).
export async function approveRequestAction(formData: FormData) {
  const by = await requireAdminEmail();
  const reqId = String(formData.get('request_id') ?? '');
  const deckId = String(formData.get('deck_id') ?? '');
  if (!reqId) return;
  const reqRow = await getRequest(reqId);
  if (!reqRow) return;
  await setRequestStatus(reqId, 'approved', by);
  const base = process.env.APP_URL ?? '';
  await approveAndGrant(reqRow, base, by).catch(() => {});
  revalidatePath(`/admin/decks/${deckId}`);
}

export async function denyRequestAction(formData: FormData) {
  const by = await requireAdminEmail();
  const reqId = String(formData.get('request_id') ?? '');
  const deckId = String(formData.get('deck_id') ?? '');
  if (!reqId) return;
  const reqRow = await getRequest(reqId);
  if (!reqRow) return;
  await setRequestStatus(reqId, 'denied', by);
  await denyRequest(reqRow).catch(() => {}); // thu hồi grant nếu trước đó đã cấp
  revalidatePath(`/admin/decks/${deckId}`);
}

// ---- Mật khẩu deck ----
// Đặt mật khẩu tay: hiện lại 1 lần qua ?pw để admin copy (chỉ lưu hash).
export async function setDeckPasswordAction(formData: FormData) {
  await requireAdminEmail();
  const deckId = String(formData.get('deck_id') ?? '');
  const pw = String(formData.get('password') ?? '').trim();
  if (!deckId || pw.length < 4) return;
  await setDeckPassword(deckId, pw);
  revalidatePath(`/admin/decks/${deckId}`);
  redirect(`/admin/decks/${deckId}?pw=${encodeURIComponent(pw)}`);
}

// Tạo mật khẩu tự động (dễ đọc) rồi hiện 1 lần.
export async function generateDeckPasswordAction(formData: FormData) {
  await requireAdminEmail();
  const deckId = String(formData.get('deck_id') ?? '');
  if (!deckId) return;
  const pw = generateDeckPassword();
  await setDeckPassword(deckId, pw);
  revalidatePath(`/admin/decks/${deckId}`);
  redirect(`/admin/decks/${deckId}?pw=${encodeURIComponent(pw)}`);
}

export async function clearDeckPasswordAction(formData: FormData) {
  await requireAdminEmail();
  const deckId = String(formData.get('deck_id') ?? '');
  if (!deckId) return;
  await setDeckPassword(deckId, null);
  revalidatePath(`/admin/decks/${deckId}`);
}
