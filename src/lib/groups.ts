import { query, queryOne } from './db';
import { issueGrant, activeDeckIdsForGroup } from './grants';

export type Group = {
  id: string;
  name: string;
  description: string | null;
  created_at?: string;
  member_count?: number;
};

export type GroupMember = {
  viewer_id: string;
  email: string;
  name: string | null;
  company: string | null;
  added_at: string;
};

export async function listGroups(): Promise<Group[]> {
  return query<Group>(
    `SELECT g.id, g.name, g.description, g.created_at,
            (SELECT count(*)::int FROM deck_group_members m WHERE m.group_id=g.id) AS member_count
     FROM deck_groups g ORDER BY g.created_at DESC`,
  );
}

export async function getGroup(id: string): Promise<Group | null> {
  return queryOne<Group>('SELECT id, name, description, created_at FROM deck_groups WHERE id=$1', [id]);
}

export async function createGroup(name: string, description: string | null, by: string | null): Promise<Group> {
  return (await queryOne<Group>(
    `INSERT INTO deck_groups (name, description, created_by) VALUES ($1,$2,$3)
     ON CONFLICT (lower(name)) DO UPDATE SET description=COALESCE(EXCLUDED.description, deck_groups.description)
     RETURNING id, name, description`,
    [name, description, by],
  ))!;
}

export async function deleteGroup(id: string): Promise<void> {
  await query('DELETE FROM deck_groups WHERE id=$1', [id]);
}

export async function listMembers(groupId: string): Promise<GroupMember[]> {
  return query<GroupMember>(
    `SELECT v.id AS viewer_id, v.email, v.name, v.company, m.added_at
     FROM deck_group_members m JOIN deck_viewers v ON v.id=m.viewer_id
     WHERE m.group_id=$1 ORDER BY m.added_at DESC`,
    [groupId],
  );
}

// Thêm thành viên vào nhóm + tự cấp quyền các deck mà nhóm đang được cấp (đồng bộ).
export async function addMember(groupId: string, viewerId: string, by: string | null): Promise<void> {
  await query(
    `INSERT INTO deck_group_members (group_id, viewer_id, added_by) VALUES ($1,$2,$3)
     ON CONFLICT (group_id, viewer_id) DO NOTHING`,
    [groupId, viewerId, by],
  );
  const deckIds = await activeDeckIdsForGroup(groupId);
  for (const deckId of deckIds) {
    await issueGrant(deckId, viewerId, by, null, groupId);
  }
}

export async function removeMember(groupId: string, viewerId: string): Promise<void> {
  await query('DELETE FROM deck_group_members WHERE group_id=$1 AND viewer_id=$2', [groupId, viewerId]);
  // Thu hồi các grant của người này phát sinh từ nhóm.
  await query(
    "UPDATE deck_grants SET status='revoked', revoked_at=now() WHERE viewer_id=$1 AND group_id=$2 AND status='active'",
    [viewerId, groupId],
  );
}

// Các nhóm đang được cấp 1 deck (còn hiệu lực) — hiển thị + thu hồi theo nhóm.
export async function grantedGroupsForDeck(deckId: string): Promise<{ id: string; name: string; active: number }[]> {
  return query<{ id: string; name: string; active: number }>(
    `SELECT g.id, g.name, count(*) FILTER (WHERE gr.status='active')::int AS active
     FROM deck_grants gr JOIN deck_groups g ON g.id=gr.group_id
     WHERE gr.deck_id=$1 GROUP BY g.id, g.name HAVING count(*) FILTER (WHERE gr.status='active') > 0
     ORDER BY g.name`,
    [deckId],
  );
}

// Cấp 1 deck cho cả nhóm: fan-out grant cho từng thành viên (mỗi người link + watermark riêng).
export async function grantDeckToGroup(deckId: string, groupId: string, by: string | null): Promise<number> {
  const members = await listMembers(groupId);
  for (const m of members) {
    await issueGrant(deckId, m.viewer_id, by, null, groupId);
  }
  return members.length;
}
