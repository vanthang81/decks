import { query } from './db';

export type LogRow = {
  event: string;
  slide_no: number | null;
  ip: string | null;
  created_at: string;
  viewer_email: string | null;
  viewer_name: string | null;
};

export async function listDeckLog(deckId: string, limit = 100): Promise<LogRow[]> {
  return query<LogRow>(
    `SELECT l.event, l.slide_no, l.ip, l.created_at, v.email AS viewer_email, v.name AS viewer_name
     FROM deck_access_log l LEFT JOIN deck_viewers v ON v.id = l.viewer_id
     WHERE l.deck_id = $1 ORDER BY l.created_at DESC LIMIT $2`,
    [deckId, limit],
  );
}

export type AccessEvent =
  | 'link_open'
  | 'otp_sent'
  | 'otp_ok'
  | 'view'
  | 'slide'
  | 'denied'
  | 'revoked_hit';

export async function logEvent(e: {
  event: AccessEvent;
  deckId?: string | null;
  viewerId?: string | null;
  grantId?: string | null;
  slideNo?: number | null;
  ip?: string | null;
  userAgent?: string | null;
  meta?: Record<string, unknown> | null;
}): Promise<void> {
  await query(
    `INSERT INTO deck_access_log (deck_id, viewer_id, grant_id, event, slide_no, ip, user_agent, meta)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      e.deckId ?? null,
      e.viewerId ?? null,
      e.grantId ?? null,
      e.event,
      e.slideNo ?? null,
      e.ip ?? null,
      e.userAgent ?? null,
      e.meta ? JSON.stringify(e.meta) : null,
    ],
  );
}
