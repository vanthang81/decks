import { type NextRequest } from 'next/server';
import { getDeckBySlug } from '@/lib/decks';
import { readDeckHtml } from '@/lib/content';
import { getActiveGrant } from '@/lib/grants';
import { verifyViewerSession, VIEWER_COOKIE } from '@/lib/session';
import { wrapProtectedDeck } from '@/lib/watermark';
import { logEvent } from '@/lib/log';

export const dynamic = 'force-dynamic';

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, private',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

function gate(slug: string, msg: string): Response {
  return htmlResponse(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8">
     <meta name="viewport" content="width=device-width,initial-scale=1">
     <title>Cần quyền truy cập</title>
     <style>body{font-family:system-ui;background:#14171D;color:#F1EEE8;display:grid;place-items:center;height:100vh;margin:0}
     .b{max-width:420px;text-align:center;padding:32px}a{color:#D6A051}</style></head>
     <body><div class="b"><h2>Deck bảo mật</h2><p>${msg}</p>
     <p style="opacity:.7;font-size:13px">Liên hệ người gửi để nhận link cá nhân.</p></div></body></html>`,
    403,
  );
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const deck = await getDeckBySlug(params.slug);
  if (!deck || !deck.is_published) return htmlResponse('<h1>404 — Không tìm thấy deck</h1>', 404);

  const html = await readDeckHtml(deck.slug);
  if (html === null) return htmlResponse('<h1>404 — Thiếu nội dung deck</h1>', 404);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const ua = req.headers.get('user-agent');

  // Public: mở tự do, không watermark.
  if (deck.visibility === 'public') {
    await logEvent({ event: 'view', deckId: deck.id, ip, userAgent: ua }).catch(() => {});
    return htmlResponse(html);
  }

  // Protected: cần phiên viewer hợp lệ + grant còn active (kiểm DB mỗi request → thu hồi tức thì).
  const sess = await verifyViewerSession(req.cookies.get(VIEWER_COOKIE)?.value);
  if (!sess || sess.deckSlug !== deck.slug) {
    return gate(deck.slug, 'Bạn cần mở deck này bằng link cá nhân được cấp.');
  }
  const grant = await getActiveGrant(sess.grantId);
  if (!grant || grant.deck_id !== deck.id) {
    await logEvent({
      event: 'revoked_hit', deckId: deck.id, viewerId: sess.viewerId, grantId: sess.grantId, ip, userAgent: ua,
    }).catch(() => {});
    return gate(deck.slug, 'Quyền truy cập của bạn đã bị thu hồi hoặc hết hạn.');
  }

  await logEvent({
    event: 'view', deckId: deck.id, viewerId: sess.viewerId, grantId: sess.grantId, ip, userAgent: ua,
  }).catch(() => {});

  return htmlResponse(
    wrapProtectedDeck(html, { email: sess.email, name: sess.name, deckSlug: deck.slug }),
  );
}
