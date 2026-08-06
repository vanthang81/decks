import { createHash, randomBytes } from 'node:crypto';
import { query, queryOne } from './db';

export type GrantStatus = 'active' | 'revoked';

export type Grant = {
  id: string;
  deck_id: string;
  viewer_id: string;
  status: GrantStatus;
  expires_at: string | null;
};

export type GrantWithCtx = Grant & {
  deck_slug: string;
  deck_title: string;
  deck_visibility: 'public' | 'protected';
  deck_require_otp: boolean;
  viewer_email: string;
  viewer_name: string | null;
};

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Cấp (hoặc cấp lại) link cho (deck, viewer). Trả token THÔ để hiển thị 1 lần.
// groupId != null khi grant phát sinh từ việc cấp deck cho một nhóm.
export async function issueGrant(
  deckId: string,
  viewerId: string,
  createdBy: string | null,
  expiresAt: Date | null = null,
  groupId: string | null = null,
): Promise<{ grant: Grant; token: string }> {
  const token = randomBytes(32).toString('base64url');
  const token_hash = hashToken(token);
  const grant = await queryOne<Grant>(
    `INSERT INTO deck_grants (deck_id, viewer_id, token_hash, status, expires_at, created_by, group_id)
     VALUES ($1,$2,$3,'active',$4,$5,$6)
     ON CONFLICT (deck_id, viewer_id) DO UPDATE SET
       token_hash=EXCLUDED.token_hash, status='active', expires_at=EXCLUDED.expires_at,
       revoked_at=NULL, created_by=EXCLUDED.created_by,
       group_id=COALESCE(EXCLUDED.group_id, deck_grants.group_id), created_at=now()
     RETURNING id, deck_id, viewer_id, status, expires_at`,
    [deckId, viewerId, token_hash, expiresAt, createdBy, groupId],
  );
  return { grant: grant!, token };
}

// Thu hồi quyền của 1 nhóm trên 1 deck: bỏ entitlement + revoke các grant phát sinh từ nhóm.
export async function revokeGroupOnDeck(deckId: string, groupId: string): Promise<number> {
  await query('DELETE FROM deck_group_decks WHERE deck_id=$1 AND group_id=$2', [deckId, groupId]);
  const rows = await query<{ id: string }>(
    "UPDATE deck_grants SET status='revoked', revoked_at=now() WHERE deck_id=$1 AND group_id=$2 AND status='active' RETURNING id",
    [deckId, groupId],
  );
  return rows.length;
}

// Các deck mà 1 nhóm ĐƯỢC CẤP QUYỀN (entitlement) — dùng để tự cấp link khi thêm thành viên.
export async function activeDeckIdsForGroup(groupId: string): Promise<string[]> {
  const rows = await query<{ deck_id: string }>(
    'SELECT deck_id FROM deck_group_decks WHERE group_id=$1',
    [groupId],
  );
  return rows.map((r) => r.deck_id);
}

export async function findGrantByToken(token: string): Promise<GrantWithCtx | null> {
  return queryOne<GrantWithCtx>(
    `SELECT g.id, g.deck_id, g.viewer_id, g.status, g.expires_at,
            d.slug AS deck_slug, d.title AS deck_title, d.visibility AS deck_visibility,
            d.require_otp AS deck_require_otp,
            v.email AS viewer_email, v.name AS viewer_name
     FROM deck_grants g
     JOIN deck_decks d   ON d.id = g.deck_id
     JOIN deck_viewers v ON v.id = g.viewer_id
     WHERE g.token_hash = $1`,
    [hashToken(token)],
  );
}

// Kiểm tra grant còn dùng được: active + chưa hết hạn + deck published.
export async function getActiveGrant(grantId: string): Promise<GrantWithCtx | null> {
  const g = await queryOne<GrantWithCtx>(
    `SELECT g.id, g.deck_id, g.viewer_id, g.status, g.expires_at,
            d.slug AS deck_slug, d.title AS deck_title, d.visibility AS deck_visibility,
            d.require_otp AS deck_require_otp,
            v.email AS viewer_email, v.name AS viewer_name
     FROM deck_grants g
     JOIN deck_decks d   ON d.id = g.deck_id
     JOIN deck_viewers v ON v.id = g.viewer_id
     WHERE g.id = $1`,
    [grantId],
  );
  if (!g) return null;
  if (g.status !== 'active') return null;
  if (g.expires_at && new Date(g.expires_at).getTime() < Date.now()) return null;
  return g;
}

// Tìm grant ĐANG hiệu lực theo (deck, email) — cho luồng tự gửi lại link cá nhân qua email ở trang gate.
// Trả kèm email/tên chuẩn hoá của viewer để gửi mail đúng địa chỉ đã lưu.
export async function findActiveGrantByDeckEmail(
  deckId: string,
  email: string,
): Promise<{ id: string; viewer_id: string; viewer_email: string; viewer_name: string | null } | null> {
  return queryOne(
    `SELECT g.id, g.viewer_id, v.email AS viewer_email, v.name AS viewer_name
     FROM deck_grants g JOIN deck_viewers v ON v.id = g.viewer_id
     WHERE g.deck_id = $1 AND lower(v.email) = lower($2) AND g.status = 'active'
       AND (g.expires_at IS NULL OR g.expires_at > now())`,
    [deckId, email],
  );
}

// Email có ÍT NHẤT một grant còn hiệu lực (bất kỳ deck nào)? — dùng để cho phép viewer đăng nhập Google.
export async function hasAnyActiveGrant(email: string): Promise<boolean> {
  const r = await queryOne<{ ok: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM deck_grants g JOIN deck_viewers v ON v.id = g.viewer_id
       WHERE lower(v.email) = lower($1) AND g.status = 'active'
         AND (g.expires_at IS NULL OR g.expires_at > now())
     ) AS ok`,
    [email],
  );
  return r?.ok ?? false;
}

// Cấp lại token cho 1 grant ĐANG active (KHÔNG đổi trạng thái — tránh reactivate grant đã thu hồi).
// Trả token thô để dựng link; null nếu grant không còn active.
export async function rotateGrantToken(grantId: string): Promise<string | null> {
  const token = randomBytes(32).toString('base64url');
  const r = await queryOne<{ id: string }>(
    "UPDATE deck_grants SET token_hash=$2 WHERE id=$1 AND status='active' RETURNING id",
    [grantId, hashToken(token)],
  );
  return r ? token : null;
}

export async function revokeGrant(grantId: string): Promise<void> {
  await query(
    "UPDATE deck_grants SET status='revoked', revoked_at=now() WHERE id=$1",
    [grantId],
  );
}

// Thu hồi grant active của 1 email trên 1 deck (dùng khi từ chối/thu hồi yêu cầu cấp quyền).
export async function revokeGrantByDeckEmail(deckId: string, email: string): Promise<void> {
  await query(
    `UPDATE deck_grants SET status='revoked', revoked_at=now()
     WHERE deck_id=$1 AND status='active'
       AND viewer_id IN (SELECT id FROM deck_viewers WHERE lower(email)=lower($2))`,
    [deckId, email],
  );
}

export type GrantRow = {
  id: string;
  viewer_id: string;
  viewer_email: string;
  viewer_name: string | null;
  status: GrantStatus;
  expires_at: string | null;
  created_at: string;
  last_view: string | null;
  views: number;
};

export async function listGrantsForDeck(deckId: string): Promise<GrantRow[]> {
  return query<GrantRow>(
    `SELECT g.id, g.viewer_id, v.email AS viewer_email, v.name AS viewer_name,
            g.status, g.expires_at, g.created_at,
            (SELECT max(created_at) FROM deck_access_log l WHERE l.grant_id=g.id AND l.event='view') AS last_view,
            (SELECT count(*)::int FROM deck_access_log l WHERE l.grant_id=g.id AND l.event='view') AS views
     FROM deck_grants g
     JOIN deck_viewers v ON v.id=g.viewer_id
     WHERE g.deck_id=$1
     ORDER BY g.created_at DESC`,
    [deckId],
  );
}
