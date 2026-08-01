import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getUser } from '@/lib/users';
import {
  listComments,
  addComment,
  editComment,
  deleteComment,
  getComment,
  type EntityType,
} from '@/lib/comments';
import { canModerateEntity, withinEditWindow } from '@/lib/moderation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ENTITIES: EntityType[] = ['objective', 'key_result', 'initiative'];

async function me() {
  const s = await auth();
  const email = s?.user?.email;
  if (!email) return null;
  const u = await getUser(email);
  return u && u.is_active ? u : null;
}

export async function GET(req: NextRequest) {
  const u = await me();
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const et = req.nextUrl.searchParams.get('entityType') as EntityType | null;
  const id = req.nextUrl.searchParams.get('entityId');
  if (!et || !ENTITIES.includes(et) || !id) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const comments = await listComments(et, id);
  return NextResponse.json({ comments, me: u.email });
}

export async function POST(req: NextRequest) {
  const u = await me();
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json().catch(() => null);
  const et = b?.entityType as EntityType;
  if (!b || !ENTITIES.includes(et) || !b.entityId || !String(b.body ?? '').trim()) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const mentions = Array.isArray(b.mentions) ? b.mentions.map(String) : [];
  const comment = await addComment({
    entityType: et,
    entityId: String(b.entityId),
    parentId: b.parentId ? String(b.parentId) : null,
    authorEmail: u.email,
    authorName: u.display_name,
    body: String(b.body).trim(),
    mentions,
  });
  return NextResponse.json({ comment });
}

export async function PATCH(req: NextRequest) {
  const u = await me();
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b?.id || !String(b.body ?? '').trim()) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const c = await getComment(String(b.id));
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Sửa: quản lý (admin/editor) bất kỳ lúc nào; tác giả chỉ trong 3 giờ.
  const isAuthor = (c.author_email ?? '').toLowerCase() === u.email.toLowerCase();
  const canModerate = await canModerateEntity(u, c.entity_type, c.entity_id);
  if (!canModerate && !(isAuthor && withinEditWindow(c.created_at))) {
    return NextResponse.json(
      { error: 'Quá 3 giờ hoặc không đủ quyền — chỉ quản lý mới sửa được bình luận này.' },
      { status: 403 },
    );
  }
  const mentions = Array.isArray(b.mentions) ? b.mentions.map(String) : [];
  await editComment(String(b.id), String(b.body).trim(), mentions);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const u = await me();
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const c = await getComment(id);
  if (!c) return NextResponse.json({ ok: true });
  // Xoá: CHỈ quản lý (admin/editor) — người dùng thường không được xoá.
  const canModerate = await canModerateEntity(u, c.entity_type, c.entity_id);
  if (!canModerate) {
    return NextResponse.json(
      { error: 'Chỉ quản lý (admin/editor) mới được xoá bình luận.' },
      { status: 403 },
    );
  }
  await deleteComment(id);
  return NextResponse.json({ ok: true });
}
