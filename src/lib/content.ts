import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DECKS_DIR = path.join(process.cwd(), 'content', 'decks');
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

// Đọc nội dung HTML self-contained của deck từ repo. Trả null nếu không có/không hợp lệ.
export async function readDeckHtml(slug: string): Promise<string | null> {
  if (!isValidSlug(slug)) return null;
  try {
    return await readFile(path.join(DECKS_DIR, `${slug}.html`), 'utf8');
  } catch {
    return null;
  }
}
