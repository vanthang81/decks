import { NextResponse, type NextRequest } from 'next/server';
import { findGrantByToken } from '@/lib/grants';
import { signViewerSession, VIEWER_COOKIE, viewerCookieOptions } from '@/lib/session';
import { createOtp } from '@/lib/otp';
import { sendMail } from '@/lib/mail';
import { logEvent } from '@/lib/log';

export const dynamic = 'force-dynamic';

function gate(msg: string): Response {
  return new Response(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8">
     <meta name="viewport" content="width=device-width,initial-scale=1"><title>Link không hợp lệ</title>
     <style>body{font-family:system-ui;background:#14171D;color:#F1EEE8;display:grid;place-items:center;height:100vh;margin:0}
     .b{max-width:420px;text-align:center;padding:32px}</style></head>
     <body><div class="b"><h2>Không mở được deck</h2><p>${msg}</p></div></body></html>`,
    { status: 403, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  );
}

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const base = process.env.APP_URL ?? req.url;
  const g = await findGrantByToken(params.token);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const ua = req.headers.get('user-agent');

  if (!g) return gate('Link không tồn tại.');
  if (g.status !== 'active') {
    await logEvent({ event: 'revoked_hit', deckId: g.deck_id, viewerId: g.viewer_id, grantId: g.id, ip, userAgent: ua }).catch(() => {});
    return gate('Link đã bị thu hồi.');
  }
  if (g.expires_at && new Date(g.expires_at).getTime() < Date.now()) return gate('Link đã hết hạn.');

  await logEvent({ event: 'link_open', deckId: g.deck_id, viewerId: g.viewer_id, grantId: g.id, ip, userAgent: ua }).catch(() => {});

  // Cần OTP email trước khi cấp phiên.
  if (g.deck_require_otp) {
    const code = await createOtp(g.id);
    await sendMail({
      to: g.viewer_email,
      subject: `Mã xem deck: ${g.deck_title}`,
      html: `<p>Mã truy cập deck <b>${g.deck_title}</b>: <b style="font-size:20px">${code}</b></p><p>Hết hạn sau 10 phút.</p>`,
      kind: 'otp',
    }).catch(() => {});
    await logEvent({ event: 'otp_sent', deckId: g.deck_id, viewerId: g.viewer_id, grantId: g.id }).catch(() => {});
    return NextResponse.redirect(new URL(`/v/${params.token}/otp`, base));
  }

  // Không OTP: cấp phiên rồi vào deck.
  const jwt = await signViewerSession({
    grantId: g.id, viewerId: g.viewer_id, deckId: g.deck_id,
    deckSlug: g.deck_slug, email: g.viewer_email, name: g.viewer_name,
  });
  const res = NextResponse.redirect(new URL(`/d/${g.deck_slug}`, base));
  res.cookies.set(VIEWER_COOKIE, jwt, viewerCookieOptions);
  return res;
}
