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
  created_at?: string;
  updated_at?: string;
};

export async function listDecks(): Promise<Deck[]> {
  return query<Deck>(
    `SELECT id, slug, title, description, visibility, require_otp, is_published, created_at, updated_at
     FROM deck_decks ORDER BY created_at DESC`,
  );
}

export async function listPublicDecks(): Promise<Deck[]> {
  return query<Deck>(
    `SELECT id, slug, title, description, visibility, require_otp, is_published
     FROM deck_decks WHERE visibility='public' AND is_published=true ORDER BY created_at DESC`,
  );
}

export async function getDeckBySlug(slug: string): Promise<Deck | null> {
  return queryOne<Deck>(
    `SELECT id, slug, title, description, visibility, require_otp, is_published
     FROM deck_decks WHERE slug=$1`,
    [slug],
  );
}

export async function getDeckById(id: string): Promise<Deck | null> {
  return queryOne<Deck>(
    `SELECT id, slug, title, description, visibility, require_otp, is_published, created_at, updated_at
     FROM deck_decks WHERE id=$1`,
    [id],
  );
}

export async function upsertDeck(d: {
  slug: string;
  title: string;
  description?: string | null;
  visibility: Visibility;
  require_otp: boolean;
  is_published: boolean;
  createdBy?: string | null;
}): Promise<Deck> {
  const row = await queryOne<Deck>(
    `INSERT INTO deck_decks (slug, title, description, visibility, require_otp, is_published, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (slug) DO UPDATE SET
       title=EXCLUDED.title, description=EXCLUDED.description, visibility=EXCLUDED.visibility,
       require_otp=EXCLUDED.require_otp, is_published=EXCLUDED.is_published, updated_at=now()
     RETURNING id, slug, title, description, visibility, require_otp, is_published`,
    [
      d.slug,
      d.title,
      d.description ?? null,
      d.visibility,
      d.require_otp,
      d.is_published,
      d.createdBy ?? null,
    ],
  );
  return row!;
}
