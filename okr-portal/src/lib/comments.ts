import { query, queryOne } from './db';
import { notify } from './notifications';

export type EntityType = 'objective' | 'key_result' | 'initiative';

export type Comment = {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  parent_id: string | null;
  author_email: string | null;
  author_name: string | null;
  author_avatar: string | null;
  body: string;
  mentions: string[];
  created_at: string;
  updated_at: string;
  deleted: boolean;
};

const C_SELECT = `
  SELECT c.id, c.entity_type, c.entity_id, c.parent_id, c.author_email,
         u.display_name AS author_name, u.avatar_url AS author_avatar, c.body, c.mentions,
         c.created_at::text, c.updated_at::text, (c.deleted_at IS NOT NULL) AS deleted
    FROM okr_comments c
    LEFT JOIN okr_users u ON u.email = c.author_email`;

export async function listComments(entityType: EntityType, entityId: string): Promise<Comment[]> {
  return query<Comment>(
    `${C_SELECT} WHERE c.entity_type=$1 AND c.entity_id=$2 AND c.deleted_at IS NULL
     ORDER BY c.created_at ASC`,
    [entityType, entityId],
  );
}

export async function getComment(id: string): Promise<Comment | null> {
  return queryOne<Comment>(`${C_SELECT} WHERE c.id=$1`, [id]);
}

/** Nhãn + link điều hướng của thực thể (dùng cho preview thông báo). */
export async function resolveEntity(
  entityType: EntityType,
  entityId: string,
): Promise<{ label: string; link: string } | null> {
  if (entityType === 'objective') {
    const o = await queryOne<{ title: string; code: string | null }>(
      'SELECT title, code FROM okr_objectives WHERE id=$1',
      [entityId],
    );
    if (!o) return null;
    return { label: `OKR ${o.code ? o.code + ' · ' : ''}${o.title}`, link: `/objectives/${entityId}` };
  }
  if (entityType === 'key_result') {
    const k = await queryOne<{ title: string; code: string | null; objective_id: string }>(
      'SELECT title, code, objective_id FROM okr_key_results WHERE id=$1',
      [entityId],
    );
    if (!k) return null;
    return {
      label: `KR ${k.code ? k.code + ' · ' : ''}${k.title}`,
      link: `/objectives/${k.objective_id}#kr-${entityId}`,
    };
  }
  const i = await queryOne<{ title: string; code: string | null; objective_id: string | null }>(
    'SELECT title, code, objective_id FROM okr_initiatives WHERE id=$1',
    [entityId],
  );
  if (!i) return null;
  return {
    label: `Việc ${i.code ? i.code + ' · ' : ''}${i.title}`,
    link: i.objective_id ? `/objectives/${i.objective_id}` : '/',
  };
}

/** Người PHỤ TRÁCH thực thể (chủ trì OKR / người được giao việc) — để báo "có bình luận ở mục của bạn". */
async function entityStakeholders(entityType: EntityType, entityId: string): Promise<string[]> {
  const emails = new Set<string>();
  if (entityType === 'objective') {
    const o = await queryOne<{ owner_email: string | null }>('SELECT owner_email FROM okr_objectives WHERE id=$1', [entityId]);
    if (o?.owner_email) emails.add(o.owner_email);
  } else if (entityType === 'key_result') {
    const k = await queryOne<{ owner: string | null }>(
      'SELECT o.owner_email AS owner FROM okr_key_results k JOIN okr_objectives o ON o.id=k.objective_id WHERE k.id=$1',
      [entityId],
    );
    if (k?.owner) emails.add(k.owner);
  } else {
    const i = await queryOne<{ owner_email: string | null; oowner: string | null }>(
      'SELECT i.owner_email, o.owner_email AS oowner FROM okr_initiatives i LEFT JOIN okr_objectives o ON o.id=i.objective_id WHERE i.id=$1',
      [entityId],
    );
    if (i?.owner_email) emails.add(i.owner_email);
    if (i?.oowner) emails.add(i.oowner);
  }
  return [...emails];
}

/** Objective mà thực thể (objective/KR/việc) thuộc về — để kiểm quyền quản lý. */
export async function objectiveIdOfEntity(
  entityType: EntityType,
  entityId: string,
): Promise<string | null> {
  if (entityType === 'objective') return entityId;
  if (entityType === 'key_result') {
    const k = await queryOne<{ objective_id: string | null }>(
      'SELECT objective_id FROM okr_key_results WHERE id=$1',
      [entityId],
    );
    return k?.objective_id ?? null;
  }
  const i = await queryOne<{ objective_id: string | null }>(
    'SELECT objective_id FROM okr_initiatives WHERE id=$1',
    [entityId],
  );
  return i?.objective_id ?? null;
}

export async function addComment(input: {
  entityType: EntityType;
  entityId: string;
  parentId: string | null;
  authorEmail: string;
  authorName: string | null;
  body: string;
  mentions: string[];
}): Promise<Comment> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO okr_comments (entity_type, entity_id, parent_id, author_email, body, mentions)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [input.entityType, input.entityId, input.parentId, input.authorEmail, input.body, input.mentions],
  );
  const id = row!.id;

  // Người nhận: những người được @mention + tác giả comment cha (nếu là reply).
  const recipients = [...input.mentions];
  let type: 'mention' | 'reply' = 'mention';
  if (input.parentId) {
    const parent = await getComment(input.parentId);
    if (parent?.author_email) {
      recipients.push(parent.author_email);
      if (input.mentions.length === 0) type = 'reply';
    }
  }
  // Best-effort: lỗi tạo thông báo KHÔNG được làm hỏng việc lưu bình luận.
  try {
    const ent = await resolveEntity(input.entityType, input.entityId);
    const preview = input.body.length > 140 ? input.body.slice(0, 140) + '…' : input.body;
    const base = {
      actorEmail: input.authorEmail,
      actorName: input.authorName,
      entityType: input.entityType,
      entityId: input.entityId,
      commentId: id,
      preview,
      link: ent?.link ?? '/',
      entityLabel: ent?.label ?? 'OKR',
    };
    // 1) Nhắc tên / trả lời trực tiếp.
    if (recipients.length > 0) await notify({ ...base, recipients, type });
    // 2) "Bình luận ở mục bạn phụ trách" — cho chủ trì/được giao (chưa nằm trong recipients, không phải người viết).
    const already = new Set(recipients.map((r) => r.toLowerCase()));
    already.add(input.authorEmail.toLowerCase());
    const stake = (await entityStakeholders(input.entityType, input.entityId)).filter(
      (e) => !already.has(e.toLowerCase()),
    );
    if (stake.length > 0) await notify({ ...base, recipients: stake, type: 'comment_mine' });
  } catch (e) {
    console.error('[comments] notify failed', e);
  }

  const created = await getComment(id);
  return created!;
}

export async function editComment(id: string, body: string, mentions: string[]): Promise<void> {
  await query('UPDATE okr_comments SET body=$2, mentions=$3, updated_at=now() WHERE id=$1', [
    id,
    body,
    mentions,
  ]);
}

/** Xoá HẲN bình luận (kèm mọi trả lời con nhờ FK ON DELETE CASCADE). */
export async function deleteComment(id: string): Promise<void> {
  await query('DELETE FROM okr_comments WHERE id=$1', [id]);
}
