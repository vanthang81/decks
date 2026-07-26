import { NextResponse, type NextRequest } from 'next/server';
import { findGrantByToken } from '@/lib/grants';
import { verifyOtp } from '@/lib/otp';
import { signViewerSession, VIEWER_COOKIE, viewerCookieOptions } from '@/lib/session';
import { logEvent } from '@/lib/log';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const token = String(form.get('token') ?? '');
  const code = String(form.get('code') ?? '').trim();

  const g = await findGrantByToken(token);
  if (!g || g.status !== 'active') {
    return NextResponse.redirect(new URL(`/v/${token}/otp?error=1`, req.url), 303);
  }
  const ok = await verifyOtp(g.id, code);
  if (!ok) {
    return NextResponse.redirect(new URL(`/v/${token}/otp?error=1`, req.url), 303);
  }

  await logEvent({ event: 'otp_ok', deckId: g.deck_id, viewerId: g.viewer_id, grantId: g.id }).catch(() => {});
  const jwt = await signViewerSession({
    grantId: g.id, viewerId: g.viewer_id, deckId: g.deck_id,
    deckSlug: g.deck_slug, email: g.viewer_email, name: g.viewer_name,
  });
  const res = NextResponse.redirect(new URL(`/d/${g.deck_slug}`, req.url), 303);
  res.cookies.set(VIEWER_COOKIE, jwt, viewerCookieOptions);
  return res;
}
