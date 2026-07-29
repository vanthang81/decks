import { readDeckHtml } from './content';
import { setDeckThumbnail } from './decks';

// Chụp slide đầu của deck bằng browserless (Chromium) → lưu data-URI JPEG vào deck_decks.thumbnail.
// Env: BROWSERLESS_URL (vd http://host.docker.internal:8090) + BROWSERLESS_TOKEN.
// Best-effort: trả false nếu thiếu env / lỗi render (không ném lỗi, để publish/save không hỏng theo).
export async function generateDeckThumbnail(deck: { id: string; slug: string }): Promise<boolean> {
  const base = process.env.BROWSERLESS_URL;
  const token = process.env.BROWSERLESS_TOKEN;
  if (!base || !token) return false;

  const html = await readDeckHtml(deck.slug).catch(() => null);
  if (!html) return false;

  try {
    const res = await fetch(`${base}/chrome/screenshot?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        html,
        viewport: { width: 1000, height: 563, deviceScaleFactor: 1 },
        gotoOptions: { waitUntil: 'networkidle2', timeout: 12000 },
        options: { type: 'jpeg', quality: 72, fullPage: false },
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') ?? '';
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) return false; // ảnh rỗng/lỗi
    // browserless đôi khi trả header image/png dù bytes là JPEG (do options.type). Nhận diện theo magic byte.
    const isPng = buf[0] === 0x89 && buf[1] === 0x50;
    const mime = isPng ? 'image/png' : ct.includes('png') && buf[0] === 0x89 ? 'image/png' : 'image/jpeg';
    const dataUri = `data:${mime};base64,${buf.toString('base64')}`;
    await setDeckThumbnail(deck.id, dataUri);
    return true;
  } catch {
    return false;
  }
}
