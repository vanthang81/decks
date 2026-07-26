import { type NextRequest } from 'next/server';
import { verifyViewerSession, VIEWER_COOKIE } from '@/lib/session';
import { getActiveGrant } from '@/lib/grants';
import { logEvent, type AccessEvent } from '@/lib/log';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const sess = await verifyViewerSession(req.cookies.get(VIEWER_COOKIE)?.value);
  if (!sess) return new Response(null, { status: 204 });

  const grant = await getActiveGrant(sess.grantId);
  if (!grant) return new Response(null, { status: 204 });

  let body: { event?: string; elapsed?: number; slide?: number } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const ev: AccessEvent = body.event === 'slide' ? 'slide' : 'view';
  await logEvent({
    event: ev,
    deckId: sess.deckId,
    viewerId: sess.viewerId,
    grantId: sess.grantId,
    slideNo: typeof body.slide === 'number' ? body.slide : null,
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: req.headers.get('user-agent'),
    meta: typeof body.elapsed === 'number' ? { elapsed: body.elapsed } : null,
  }).catch(() => {});

  return new Response(null, { status: 204 });
}
