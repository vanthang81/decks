import { readDeckHtml } from './content';
import { setDeckThumbnail } from './decks';

// Chèn CSS "đóng băng" trạng thái cuối để ảnh chụp luôn NÉT & ổn định:
//  - tắt MỌI animation/transition ⇒ không bao giờ chụp trúng khung mờ giữa hiệu ứng vào slide (nguyên nhân "thỉnh thoảng bị mờ");
//  - ép html{zoom:1} ⇒ không bị breakpoint tablet của deck phóng to khi render ở khổ chụp.
function freezeForShot(html: string): string {
  const css =
    '<style id="__shotfreeze">*,*::before,*::after{animation:none !important;transition:none !important;' +
    'animation-duration:0s !important;animation-delay:0s !important;animation-play-state:paused !important;}' +
    'html{zoom:1 !important;}</style>';
  return html.includes('</head>') ? html.replace('</head>', `${css}</head>`) : css + html;
}

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
        html: freezeForShot(html),
        // Chụp Ở KHỔ DESKTOP (width≥1120 ⇒ deck zoom 1.0, không bị breakpoint tablet 1.20 phóng méo),
        // 16:9, deviceScaleFactor:2 ⇒ raster gấp đôi mật độ ⇒ chữ SẮC NÉT trên màn retina.
        viewport: { width: 1200, height: 675, deviceScaleFactor: 2 },
        // networkidle0 = chờ tải xong hẳn; kèm freezeForShot tắt animation ⇒ KHÔNG chụp trúng frame mờ giữa hiệu ứng.
        gotoOptions: { waitUntil: 'networkidle0', timeout: 15000 },
        options: { type: 'jpeg', quality: 90, fullPage: false },
      }),
      signal: AbortSignal.timeout(25000),
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
