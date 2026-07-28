import { createHash, randomInt } from 'node:crypto';
import { query, queryOne } from './db';

export type Visibility = 'public' | 'protected';

export type Deck = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  visibility: Visibility;
  require_otp: boolean;
  is_published: boolean;
  has_password: boolean; // true nếu deck có đặt mật khẩu (không lộ hash)
  created_at?: string;
  updated_at?: string;
};

const DECK_COLS =
  "id, slug, title, description, visibility, require_otp, is_published, (password_hash IS NOT NULL) AS has_password";

export async function listDecks(): Promise<Deck[]> {
  return query<Deck>(
    `SELECT ${DECK_COLS}, created_at, updated_at FROM deck_decks ORDER BY created_at DESC`,
  );
}

export async function listPublicDecks(): Promise<Deck[]> {
  return query<Deck>(
    `SELECT ${DECK_COLS} FROM deck_decks WHERE visibility='public' AND is_published=true ORDER BY created_at DESC`,
  );
}

export async function getDeckBySlug(slug: string): Promise<Deck | null> {
  return queryOne<Deck>(`SELECT ${DECK_COLS} FROM deck_decks WHERE slug=$1`, [slug]);
}

export async function getDeckById(id: string): Promise<Deck | null> {
  return queryOne<Deck>(`SELECT ${DECK_COLS}, created_at, updated_at FROM deck_decks WHERE id=$1`, [id]);
}

// ---- Mật khẩu deck (SHA-256, không lưu thô) ----
export function hashDeckPassword(pw: string): string {
  return createHash('sha256').update(pw).digest('hex');
}

// Đặt (pw chuỗi) hoặc gỡ (pw null) mật khẩu cho deck.
export async function setDeckPassword(deckId: string, pw: string | null): Promise<void> {
  await query('UPDATE deck_decks SET password_hash=$2, updated_at=now() WHERE id=$1', [
    deckId,
    pw ? hashDeckPassword(pw) : null,
  ]);
}

export async function verifyDeckPassword(deckId: string, pw: string): Promise<boolean> {
  const row = await queryOne<{ password_hash: string | null }>(
    'SELECT password_hash FROM deck_decks WHERE id=$1',
    [deckId],
  );
  if (!row?.password_hash) return false;
  return row.password_hash === hashDeckPassword(pw);
}

// Sinh mật khẩu dễ đọc, tránh ký tự dễ nhầm (không 0/o/1/l/i). Dạng "xxxx-xxxx".
export function generateDeckPassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const pick = () =>
    Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join('');
  return `${pick()}-${pick()}`;
}

// Nội dung HTML lưu trong DB (nếu deck được tạo/sửa qua admin). null nếu chưa có.
export async function getDeckContentBySlug(slug: string): Promise<string | null> {
  const row = await queryOne<{ content: string | null }>(
    'SELECT content FROM deck_decks WHERE slug=$1',
    [slug],
  );
  return row?.content ?? null;
}

export async function hasDeckContent(id: string): Promise<boolean> {
  const row = await queryOne<{ has: boolean }>(
    "SELECT (content IS NOT NULL AND length(content) > 0) AS has FROM deck_decks WHERE id=$1",
    [id],
  );
  return row?.has ?? false;
}

export async function updateDeckContent(id: string, content: string): Promise<void> {
  await query('UPDATE deck_decks SET content=$2, updated_at=now() WHERE id=$1', [id, content]);
}

export async function upsertDeck(d: {
  slug: string;
  title: string;
  description?: string | null;
  visibility: Visibility;
  require_otp: boolean;
  is_published: boolean;
  content?: string | null; // null = giữ nguyên nội dung cũ khi cập nhật metadata
  createdBy?: string | null;
}): Promise<Deck> {
  const row = await queryOne<Deck>(
    `INSERT INTO deck_decks (slug, title, description, visibility, require_otp, is_published, content, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (slug) DO UPDATE SET
       title=EXCLUDED.title, description=EXCLUDED.description, visibility=EXCLUDED.visibility,
       require_otp=EXCLUDED.require_otp, is_published=EXCLUDED.is_published,
       content=COALESCE(EXCLUDED.content, deck_decks.content), updated_at=now()
     RETURNING id, slug, title, description, visibility, require_otp, is_published`,
    [
      d.slug,
      d.title,
      d.description ?? null,
      d.visibility,
      d.require_otp,
      d.is_published,
      d.content ?? null,
      d.createdBy ?? null,
    ],
  );
  return row!;
}
