import { NextResponse, type NextRequest } from 'next/server';
import { getDeckBySlug, verifyDeckPassword } from '@/lib/decks';
import { readDeckHtml } from '@/lib/content';
import { getActiveGrant } from '@/lib/grants';
import {
  verifyViewerSession, VIEWER_COOKIE,
  deckPwCookieName, verifyDeckPwSession, signDeckPwSession, deckPwCookieOptions,
} from '@/lib/session';
import { wrapProtectedDeck } from '@/lib/watermark';
import { logEvent } from '@/lib/log';
import { auth } from '@/auth';
import { getAdmin } from '@/lib/admins';

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
     <style>body{font-family:system-ui;background:#0F1620;color:#EAF0F6;display:grid;place-items:center;height:100vh;margin:0}
     .b{max-width:420px;text-align:center;padding:32px}a{color:#52A8E6}</style></head>
     <body><div class="b"><h2>Deck bảo mật</h2><p>${msg}</p>
     <p style="opacity:.7;font-size:13px">Liên hệ người gửi để nhận link cá nhân.</p></div></body></html>`,
    403,
  );
}

// Form nhập mật khẩu (deck khoá bằng mật khẩu chung). POST về chính URL này.
function passwordForm(slug: string, err?: string): Response {
  return htmlResponse(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8">
     <meta name="viewport" content="width=device-width,initial-scale=1">
     <title>Nhập mật khẩu</title>
     <style>
       :root{color-scheme:light dark}
       body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0F1620;color:#EAF0F6;display:grid;place-items:center;min-height:100vh;margin:0}
       .card{width:min(92vw,380px);background:#172230;border:1px solid #26323F;border-radius:16px;padding:32px 28px;text-align:center;box-shadow:0 30px 70px -40px rgba(0,0,0,.7)}
       h2{margin:6px 0 2px;font-size:22px} p{color:#9EAAB8;margin:6px 0 18px;font-size:14px}
       input{width:100%;box-sizing:border-box;padding:11px 13px;border:1px solid #33414F;border-radius:9px;background:#0F1620;color:#EAF0F6;font-size:15px}
       input:focus{outline:none;border-color:#52A8E6;box-shadow:0 0 0 3px #15324A}
       button{margin-top:14px;width:100%;padding:11px;border:0;border-radius:9px;background:#3595D5;color:#fff;font-weight:700;font-size:15px;cursor:pointer}
       button:hover{background:#2478B8}
       .err{color:#E27a63;font-size:13px;margin:10px 0 0}
       .tag{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#52A8E6;font-weight:700}
     </style></head>
     <body><form class="card" method="post" action="/d/${slug}">
       <div class="tag">deck.consultx.vn</div>
       <h2>Deck có mật khẩu</h2>
       <p>Nhập mật khẩu được cung cấp để xem deck này.</p>
       <input type="password" name="password" placeholder="Mật khẩu" autofocus autocomplete="off" required />
       <button type="submit">Mở deck</button>
       ${err ? `<div class="err">${err}</div>` : ''}
     </form></body></html>`,
    err ? 401 : 200,
  );
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const deck = await getDeckBySlug(params.slug);
  if (!deck || !deck.is_published) return htmlResponse('<h1>404 — Không tìm thấy deck</h1>', 404);

  const html = await readDeckHtml(deck.slug);
  if (html === null) return htmlResponse('<h1>404 — Thiếu nội dung deck</h1>', 404);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const ua = req.headers.get('user-agent');

  // Admin đăng nhập Google → xem được MỌI deck (công khai + bảo mật) không cần link cấp.
  // Deck bảo mật vẫn bọc watermark định danh admin + chặn tải; công khai trả raw.
  try {
    const adminEmail = (await auth())?.user?.email;
    if (adminEmail) {
      const admin = await getAdmin(adminEmail);
      if (admin?.is_active) {
        await logEvent({ event: 'view', deckId: deck.id, ip, userAgent: ua }).catch(() => {});
        return htmlResponse(
          deck.visibility === 'public'
            ? html
            : wrapProtectedDeck(html, {
                email: adminEmail,
                name: admin.display_name ?? 'Quản trị viên',
                deckSlug: deck.slug,
              }),
        );
      }
    }
  } catch {
    // Không có phiên admin hợp lệ → tiếp tục luồng viewer bên dưới.
  }

  // Lớp mật khẩu (nếu deck có đặt): phải mở khoá TRƯỚC. Sau khi mở khoá thì tiếp tục
  // theo visibility (public → mở; protected → vẫn cần link cá nhân). Admin đã bỏ qua ở trên.
  if (deck.has_password) {
    const unlocked = await verifyDeckPwSession(
      req.cookies.get(deckPwCookieName(deck.id))?.value,
      deck.id,
    );
    if (!unlocked) return passwordForm(deck.slug);
  }

  // Public: mở tự do (đã qua mật khẩu nếu có), không watermark.
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

// Nhận mật khẩu deck: đúng → set cookie mở khoá + redirect về GET; sai → hiện lại form.
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const deck = await getDeckBySlug(params.slug);
  if (!deck || !deck.is_published || !deck.has_password) {
    return htmlResponse('<h1>404 — Không tìm thấy deck</h1>', 404);
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const ua = req.headers.get('user-agent');

  const form = await req.formData().catch(() => null);
  const pw = String(form?.get('password') ?? '');
  const ok = pw ? await verifyDeckPassword(deck.id, pw) : false;

  if (!ok) {
    await logEvent({ event: 'pw_fail', deckId: deck.id, ip, userAgent: ua }).catch(() => {});
    return passwordForm(deck.slug, 'Mật khẩu không đúng, thử lại.');
  }

  await logEvent({ event: 'pw_ok', deckId: deck.id, ip, userAgent: ua }).catch(() => {});
  const base = process.env.APP_URL ?? new URL(req.url).origin;
  const token = await signDeckPwSession(deck.id);
  const res = NextResponse.redirect(`${base}/d/${deck.slug}`, 303);
  res.cookies.set(deckPwCookieName(deck.id), token, deckPwCookieOptions);
  return res;
}
