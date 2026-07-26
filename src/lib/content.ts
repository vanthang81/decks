import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getDeckContentBySlug } from './decks';

const DECKS_DIR = path.join(process.cwd(), 'content', 'decks');
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

// Nguồn nội dung: DB content (deck tạo/sửa qua admin) > file content/decks/<slug>.html (fallback).
export async function readDeckHtml(slug: string): Promise<string | null> {
  if (!isValidSlug(slug)) return null;
  const dbContent = await getDeckContentBySlug(slug).catch(() => null);
  if (dbContent && dbContent.trim().length > 0) return dbContent;
  try {
    return await readFile(path.join(DECKS_DIR, `${slug}.html`), 'utf8');
  } catch {
    return null;
  }
}
