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
  category: string | null;
  tags: string[];
  company: string;
  has_thumbnail: boolean; // true nếu có ảnh preview (phục vụ qua /api/thumb/<id>)
  source_url: string | null; // link "Nguồn / Chat gốc" (tuỳ chọn) — chỉ hiện ở admin
  created_at?: string;
  updated_at?: string;
};

// Chuẩn hoá text đầu vào (title/description/…): giải mã entity HTML thường gặp để tránh lưu
// nhầm "&amp;"/"&lt;" (nguồn HTML tự-chứa hay bị encode) → hiện literal ở UI. Giải &amp; SAU cùng.
export function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

const DECK_COLS =
  "id, slug, title, description, visibility, require_otp, is_published, category, tags, company, source_url, " +
  "(password_hash IS NOT NULL) AS has_password, (thumbnail IS NOT NULL) AS has_thumbnail";

// Chỉ nhận URL http(s) (chống href javascript:). Trả URL đã trim hoặc null.
export function sanitizeUrl(u: string | null | undefined): string | null {
  const s = (u ?? '').trim();
  if (!s) return null;
  return /^https?:\/\/[^\s]+$/i.test(s) ? s : null;
}

// Đặt/gỡ link nguồn (chat gốc) cho deck.
export async function setDeckSource(id: string, url: string | null): Promise<void> {
  await query('UPDATE deck_decks SET source_url=$2, updated_at=now() WHERE id=$1', [id, sanitizeUrl(url)]);
}

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

// Đặt (pw chuỗi) hoặc gỡ (pw null) mật khẩu cho deck. Lưu cả hash (verify) lẫn plain (admin xem lại).
export async function setDeckPassword(deckId: string, pw: string | null): Promise<void> {
  await query('UPDATE deck_decks SET password_hash=$2, password_plain=$3, updated_at=now() WHERE id=$1', [
    deckId,
    pw ? hashDeckPassword(pw) : null,
    pw ?? null,
  ]);
}

// Mật khẩu deck dạng đọc-được (để admin xem/gửi lại). null nếu chưa đặt HOẶC đặt trước khi có cột này.
// CHỈ gọi ở trang chi tiết deck (đã gác admin) — KHÔNG đưa vào DECK_COLS/list để tránh lộ.
export async function getDeckPassword(deckId: string): Promise<string | null> {
  const r = await queryOne<{ password_plain: string | null }>(
    'SELECT password_plain FROM deck_decks WHERE id=$1',
    [deckId],
  );
  return r?.password_plain ?? null;
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

// ---- Metadata phân loại: chỉ cập nhật field được truyền (undefined = giữ nguyên) ----
export async function updateDeckMeta(
  id: string,
  m: { category?: string | null; tags?: string[]; company?: string },
): Promise<void> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (m.category !== undefined) { sets.push(`category=$${i++}`); vals.push(m.category ? decodeEntities(m.category) : null); }
  if (m.tags !== undefined) { sets.push(`tags=$${i++}`); vals.push(m.tags.map(decodeEntities)); }
  if (m.company !== undefined) { sets.push(`company=$${i++}`); vals.push(m.company ? decodeEntities(m.company) : 'BTMH'); }
  if (!sets.length) return;
  vals.push(id);
  await query(`UPDATE deck_decks SET ${sets.join(', ')}, updated_at=now() WHERE id=$${i}`, vals);
}

// ---- Ảnh preview (thumbnail data-URI) ----
export async function setDeckThumbnail(id: string, dataUri: string | null): Promise<void> {
  await query('UPDATE deck_decks SET thumbnail=$2, updated_at=now() WHERE id=$1', [id, dataUri]);
}

export async function getDeckThumbnail(id: string): Promise<string | null> {
  const row = await queryOne<{ thumbnail: string | null }>(
    'SELECT thumbnail FROM deck_decks WHERE id=$1',
    [id],
  );
  return row?.thumbnail ?? null;
}

// Gợi ý danh mục / công ty đã dùng (cho datalist).
export async function listCategories(): Promise<string[]> {
  const rows = await query<{ category: string }>(
    "SELECT DISTINCT category FROM deck_decks WHERE category IS NOT NULL AND category<>'' ORDER BY category",
  );
  return rows.map((r) => r.category);
}

export async function listCompanies(): Promise<string[]> {
  const rows = await query<{ company: string }>(
    "SELECT DISTINCT company FROM deck_decks WHERE company IS NOT NULL AND company<>'' ORDER BY company",
  );
  return rows.map((r) => r.company);
}

// Đổi chế độ hiển thị (public ↔ protected). protected = cần link cá nhân/Google/yêu cầu (không mở tự do).
export async function setDeckVisibility(id: string, visibility: Visibility): Promise<void> {
  await query('UPDATE deck_decks SET visibility=$2, updated_at=now() WHERE id=$1', [id, visibility]);
}

// Lưu trữ / khôi phục: bật-tắt is_published. Deck ẩn (false) → /d/<slug> trả 404, không hiện cho người xem.
export async function setDeckPublished(id: string, published: boolean): Promise<void> {
  await query('UPDATE deck_decks SET is_published=$2, updated_at=now() WHERE id=$1', [id, published]);
}

// Xoá vĩnh viễn deck. FK cascade dọn deck_grants + deck_group_decks; deck_access_log giữ lại (deck_id → NULL).
export async function deleteDeck(id: string): Promise<void> {
  await query('DELETE FROM deck_decks WHERE id=$1', [id]);
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
     RETURNING ${DECK_COLS}`,
    [
      d.slug,
      decodeEntities(d.title),
      d.description != null ? decodeEntities(d.description) : null,
      d.visibility,
      d.require_otp,
      d.is_published,
      d.content ?? null,
      d.createdBy ?? null,
    ],
  );
  return row!;
}

// Trạng thái nội dung hiện tại của deck (để làm optimistic lock khi publish song song).
// md5 = md5(content) do Postgres tính (chữ thường, 32 hex); dùng làm `if_match` cho lần publish sau.
// Trả null nếu slug chưa tồn tại; md5/len = null nếu deck tồn tại nhưng content rỗng.
export async function getDeckContentState(
  slug: string,
): Promise<{ md5: string | null; len: number | null; updated_at: string } | null> {
  return queryOne<{ md5: string | null; len: number | null; updated_at: string }>(
    'SELECT md5(content) AS md5, length(content) AS len, updated_at FROM deck_decks WHERE slug=$1',
    [slug],
  );
}

// upsert deck CÓ KHOÁ LẠC QUAN (optimistic lock) — chống ghi đè khi nhiều phiên cùng sửa 1 deck.
//  - ifMatch.mode='new' : chỉ TẠO MỚI; slug đã có -> trả null (route trả 409).
//  - ifMatch.mode='md5' : chỉ GHI khi md5(content) HIỆN TẠI khớp; lệch/không có deck -> trả null.
// Kiểm tra + ghi gói trong 1 câu SQL (row-lock của UPDATE/ON CONFLICT) => KHÔNG có khe TOCTOU.
// content BẮT BUỘC (publish luôn có html) nên không cần COALESCE giữ nội dung cũ.
export async function upsertDeckGuarded(
  d: {
    slug: string;
    title: string;
    description?: string | null;
    visibility: Visibility;
    require_otp: boolean;
    is_published: boolean;
    content: string;
    createdBy?: string | null;
  },
  ifMatch: { mode: 'new' } | { mode: 'md5'; md5: string },
): Promise<Deck | null> {
  const title = decodeEntities(d.title);
  const desc = d.description != null ? decodeEntities(d.description) : null;
  if (ifMatch.mode === 'new') {
    return queryOne<Deck>(
      `INSERT INTO deck_decks (slug, title, description, visibility, require_otp, is_published, content, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (slug) DO NOTHING
       RETURNING ${DECK_COLS}`,
      [d.slug, title, desc, d.visibility, d.require_otp, d.is_published, d.content, d.createdBy ?? null],
    );
  }
  // mode='md5': deck phải tồn tại và md5(content) hiện tại phải khớp
  return queryOne<Deck>(
    `UPDATE deck_decks SET
       title=$2, description=$3, visibility=$4, require_otp=$5, is_published=$6,
       content=$7, updated_at=now()
     WHERE slug=$1 AND md5(content)=$8
     RETURNING ${DECK_COLS}`,
    [d.slug, title, desc, d.visibility, d.require_otp, d.is_published, d.content, ifMatch.md5],
  );
}
