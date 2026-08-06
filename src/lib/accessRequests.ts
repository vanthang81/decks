import { createHash, randomBytes } from 'node:crypto';
import { query, queryOne } from './db';
import { getDeckById } from './decks';
import { upsertViewer } from './viewers';
import { issueGrant, revokeGrantByDeckEmail } from './grants';
import { sendMail } from './mail';
import { userApprovedEmail } from './emails';

export type AccessRequestStatus = 'pending' | 'approved' | 'denied';

export type AccessRequest = {
  id: string;
  deck_id: string;
  email: string;
  name: string | null;
  message: string | null;
  ip: string | null;
  user_agent: string | null;
  status: AccessRequestStatus;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
};

const COLS =
  'id, deck_id, email, name, message, ip, user_agent, status, created_at, decided_at, decided_by';

function hashToken(t: string): string {
  return createHash('sha256').update(t).digest('hex');
}

const REQUEST_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 ngày cho link duyệt trong email

// Tạo/cập nhật yêu cầu (1 dòng / (deck, email)). Trả token thô để đặt vào link duyệt/không duyệt trong email.
export async function createOrUpdateRequest(r: {
  deckId: string;
  email: string;
  name?: string | null;
  message?: string | null;
  ip?: string | null;
  ua?: string | null;
}): Promise<{ req: AccessRequest; token: string }> {
  const token = randomBytes(32).toString('base64url');
  const req = await queryOne<AccessRequest>(
    `INSERT INTO deck_access_requests (deck_id, email, name, message, ip, user_agent, status, action_token_hash)
     VALUES ($1, lower($2), $3, $4, $5, $6, 'pending', $7)
     ON CONFLICT (deck_id, lower(email)) DO UPDATE SET
       name=COALESCE(EXCLUDED.name, deck_access_requests.name),
       message=COALESCE(EXCLUDED.message, deck_access_requests.message),
       ip=EXCLUDED.ip, user_agent=EXCLUDED.user_agent,
       status='pending', action_token_hash=EXCLUDED.action_token_hash,
       created_at=now(), decided_at=NULL, decided_by=NULL
     RETURNING ${COLS}`,
    [r.deckId, r.email, r.name ?? null, r.message ?? null, r.ip ?? null, r.ua ?? null, hashToken(token)],
  );
  return { req: req!, token };
}

export async function getRequest(id: string): Promise<AccessRequest | null> {
  return queryOne<AccessRequest>(`SELECT ${COLS} FROM deck_access_requests WHERE id=$1`, [id]);
}

// Kiểm token của link duyệt trong email (đúng token + chưa quá hạn).
export async function verifyActionToken(id: string, token: string): Promise<boolean> {
  const r = await queryOne<{ h: string | null; created_at: string }>(
    'SELECT action_token_hash AS h, created_at FROM deck_access_requests WHERE id=$1',
    [id],
  );
  if (!r?.h) return false;
  if (Date.now() - new Date(r.created_at).getTime() > REQUEST_TTL_MS) return false;
  return r.h === hashToken(token);
}

export async function setRequestStatus(
  id: string,
  status: AccessRequestStatus,
  decidedBy: string,
): Promise<AccessRequest | null> {
  return queryOne<AccessRequest>(
    `UPDATE deck_access_requests SET status=$2, decided_at=now(), decided_by=$3 WHERE id=$1 RETURNING ${COLS}`,
    [id, status, decidedBy],
  );
}

export async function listRequestsForDeck(deckId: string): Promise<AccessRequest[]> {
  return query<AccessRequest>(
    `SELECT ${COLS} FROM deck_access_requests WHERE deck_id=$1 ORDER BY
       (status='pending') DESC, created_at DESC`,
    [deckId],
  );
}

// Map deck_id -> số yêu cầu ĐANG CHỜ (cho badge ở thư viện/list admin).
export async function pendingRequestCountByDeck(): Promise<Record<string, number>> {
  const rows = await query<{ deck_id: string; n: number }>(
    "SELECT deck_id, count(*)::int AS n FROM deck_access_requests WHERE status='pending' GROUP BY deck_id",
  );
  const m: Record<string, number> = {};
  for (const r of rows) m[r.deck_id] = r.n;
  return m;
}

// DUYỆT: cấp grant cho email + gửi link cá nhân qua email. Idempotent (issueGrant upsert theo deck+viewer).
export async function approveAndGrant(req: AccessRequest, baseUrl: string, by: string): Promise<boolean> {
  const deck = await getDeckById(req.deck_id);
  if (!deck) return false;
  const viewer = await upsertViewer({ email: req.email, name: req.name, createdBy: by });
  const { token } = await issueGrant(req.deck_id, viewer.id, by);
  const link = `${baseUrl}/v/${token}`;
  await sendMail({
    to: req.email,
    subject: `Đã cấp quyền xem deck: ${deck.title}`,
    html: userApprovedEmail(deck.title, link, req.name),
    kind: 'link',
  }).catch(() => {});
  return true;
}

// KHÔNG duyệt (hoặc thu hồi sau khi đã duyệt): thu hồi grant nếu có.
export async function denyRequest(req: AccessRequest): Promise<void> {
  await revokeGrantByDeckEmail(req.deck_id, req.email).catch(() => {});
}
