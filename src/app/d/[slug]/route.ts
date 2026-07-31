import { NextResponse, type NextRequest } from 'next/server';
import { getDeckBySlug, verifyDeckPassword, type Deck } from '@/lib/decks';
import { readDeckHtml } from '@/lib/content';
import { getActiveGrant, findActiveGrantByDeckEmail, rotateGrantToken } from '@/lib/grants';
import {
  verifyViewerSession, VIEWER_COOKIE,
  deckPwCookieName, verifyDeckPwSession, signDeckPwSession, deckPwCookieOptions,
} from '@/lib/session';
import { wrapProtectedDeck } from '@/lib/watermark';
import { logEvent } from '@/lib/log';
import { sendMail } from '@/lib/mail';
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

// Trang "gate" hợp nhất: hiện MỌI cách vào deck theo phân quyền hiện có.
//  - Deck có mật khẩu chung  -> ô nhập mật khẩu.
//  - Deck bảo mật (cấp qua email) -> ô nhập email để tự gửi lại link cá nhân.
// Cả hai POST về chính URL /d/<slug>, phân biệt bằng field 'mode'.
function accessGate(
  deck: Pick<Deck, 'slug' | 'title' | 'has_password' | 'visibility'>,
  opts: { pwErr?: string; emailErr?: string; emailInfo?: string } = {},
): Response {
  const showPw = deck.has_password;
  const showEmail = deck.visibility === 'protected';
  const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]!));

  const pwSection = showPw
    ? `<form class="sec" method="post" action="/d/${deck.slug}">
         <input type="hidden" name="mode" value="password" />
         <label>Mật khẩu chung</label>
         <input type="password" name="password" placeholder="Nhập mật khẩu được cấp" autocomplete="off" required />
         <button type="submit">Mở deck</button>
         ${opts.pwErr ? `<div class="err">${esc(opts.pwErr)}</div>` : ''}
       </form>`
    : '';

  const emailSection = showEmail
    ? `<form class="sec" method="post" action="/d/${deck.slug}">
         <input type="hidden" name="mode" value="email" />
         <label>Đăng nhập bằng email được cấp</label>
         <input type="email" name="email" placeholder="email@congty.com" autocomplete="email" required />
         <button type="submit" class="ghost">Gửi link vào email của tôi</button>
         ${opts.emailErr ? `<div class="err">${esc(opts.emailErr)}</div>` : ''}
         ${opts.emailInfo ? `<div class="info">${esc(opts.emailInfo)}</div>` : ''}
       </form>`
    : '';

  const divider = showPw && showEmail ? `<div class="or"><span>hoặc</span></div>` : '';
  const help = showEmail && !showPw
    ? `<p class="hint">Bạn cần link cá nhân được cấp. Nhập email để nhận lại link, hoặc liên hệ người gửi.</p>`
    : '';

  return htmlResponse(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8">
     <meta name="viewport" content="width=device-width,initial-scale=1">
     <title>Cần quyền truy cập — ${esc(deck.title)}</title>
     <style>
       :root{color-scheme:light dark}
       *{box-sizing:border-box}
       body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0F1620;color:#EAF0F6;display:grid;place-items:center;min-height:100vh;margin:0;padding:20px}
       .card{width:min(94vw,400px);background:#172230;border:1px solid #26323F;border-radius:16px;padding:30px 28px;box-shadow:0 30px 70px -40px rgba(0,0,0,.7)}
       .tag{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#52A8E6;font-weight:700;text-align:center}
       h2{margin:6px 0 2px;font-size:21px;text-align:center} .sub{color:#9EAAB8;margin:4px 0 20px;font-size:13.5px;text-align:center}
       .sec{display:flex;flex-direction:column;gap:8px;margin:0}
       label{font-size:12.5px;color:#B9C4D0;font-weight:600}
       input{width:100%;padding:11px 13px;border:1px solid #33414F;border-radius:9px;background:#0F1620;color:#EAF0F6;font-size:15px}
       input:focus{outline:none;border-color:#52A8E6;box-shadow:0 0 0 3px #15324A}
       button{margin-top:4px;width:100%;padding:11px;border:0;border-radius:9px;background:#3595D5;color:#fff;font-weight:700;font-size:15px;cursor:pointer}
       button:hover{background:#2478B8}
       button.ghost{background:transparent;border:1px solid #33414F;color:#EAF0F6}
       button.ghost:hover{border-color:#52A8E6;background:#12283b}
       .err{color:#E27a63;font-size:13px} .info{color:#7FD1A6;font-size:13px}
       .hint{color:#9EAAB8;font-size:12.5px;text-align:center;margin:2px 0 16px}
       .or{display:flex;align-items:center;gap:12px;color:#5C6B7A;font-size:12px;margin:18px 0}
       .or::before,.or::after{content:"";flex:1;height:1px;background:#26323F}
     </style></head>
     <body><div class="card">
       <div class="tag">deck.consultx.vn</div>
       <h2>${esc(deck.title)}</h2>
       <p class="sub">Deck bảo mật — chọn cách bạn được cấp quyền để xem.</p>
       ${help}${pwSection}${divider}${emailSection}
     </div></body></html>`,
    opts.pwErr || opts.emailErr ? 401 : 200,
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

  // Các đường vào hợp lệ (HOẶC): (1) link cá nhân còn hiệu lực, (2) mật khẩu chung đã mở khoá,
  // (3) public không mật khẩu. Không đường nào → form mật khẩu (nếu deck có mật khẩu) hoặc gate.

  // (1) Link cá nhân: phiên viewer + grant active → watermark định danh riêng.
  const sess = await verifyViewerSession(req.cookies.get(VIEWER_COOKIE)?.value);
  if (sess && sess.deckSlug === deck.slug) {
    const grant = await getActiveGrant(sess.grantId);
    if (grant && grant.deck_id === deck.id) {
      await logEvent({ event: 'view', deckId: deck.id, viewerId: sess.viewerId, grantId: sess.grantId, ip, userAgent: ua }).catch(() => {});
      return htmlResponse(wrapProtectedDeck(html, { email: sess.email, name: sess.name, deckSlug: deck.slug }));
    }
    // Có phiên nhưng grant đã thu hồi/hết hạn → ghi nhận, vẫn cho thử đường mật khẩu bên dưới.
    await logEvent({ event: 'revoked_hit', deckId: deck.id, viewerId: sess.viewerId, grantId: sess.grantId, ip, userAgent: ua }).catch(() => {});
  }

  // (2) Mật khẩu chung đã mở khoá → xem được (public: raw; bảo mật: watermark chung + chặn tải).
  if (deck.has_password) {
    const unlocked = await verifyDeckPwSession(req.cookies.get(deckPwCookieName(deck.id))?.value, deck.id);
    if (unlocked) {
      await logEvent({ event: 'view', deckId: deck.id, ip, userAgent: ua }).catch(() => {});
      return htmlResponse(
        deck.visibility === 'public'
          ? html
          : wrapProtectedDeck(html, { email: 'mật khẩu chung', name: null, deckSlug: deck.slug }),
      );
    }
  }

  // (3) Public không mật khẩu → mở tự do.
  if (deck.visibility === 'public' && !deck.has_password) {
    await logEvent({ event: 'view', deckId: deck.id, ip, userAgent: ua }).catch(() => {});
    return htmlResponse(html);
  }

  // Chưa vào được: hiện trang gate hợp nhất (mật khẩu chung và/hoặc đăng nhập bằng email được cấp).
  return accessGate(deck);
}

// Xử lý gate: mode='password' (mật khẩu chung) hoặc mode='email' (tự gửi lại link cá nhân).
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const deck = await getDeckBySlug(params.slug);
  // Cho POST khi deck có mật khẩu HOẶC là deck bảo mật (đường email). Ngược lại 404.
  if (!deck || !deck.is_published || (!deck.has_password && deck.visibility !== 'protected')) {
    return htmlResponse('<h1>404 — Không tìm thấy deck</h1>', 404);
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const ua = req.headers.get('user-agent');

  const form = await req.formData().catch(() => null);
  const mode = String(form?.get('mode') ?? '');

  // (A) Đăng nhập bằng email: nếu email có grant còn hiệu lực → cấp lại token + gửi link. Trả lời TRUNG TÍNH.
  if (mode === 'email') {
    if (deck.visibility !== 'protected') {
      return accessGate(deck, { emailErr: 'Deck này không dùng đăng nhập bằng email.' });
    }
    const email = String(form?.get('email') ?? '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return accessGate(deck, { emailErr: 'Email không hợp lệ.' });
    }
    const grant = await findActiveGrantByDeckEmail(deck.id, email);
    if (grant) {
      const token = await rotateGrantToken(grant.id);
      if (token) {
        const base = process.env.APP_URL ?? new URL(req.url).origin;
        const link = `${base}/v/${token}`;
        await sendMail({
          to: grant.viewer_email,
          subject: `Link xem deck: ${deck.title}`,
          html: `<p>Bạn yêu cầu xem deck <b>${deck.title}</b>.</p>
                 <p><a href="${link}">Mở deck</a> — link cá nhân, chỉ dành cho bạn${deck.require_otp ? ' (sẽ cần mã OTP gửi qua email)' : ''}.</p>`,
          kind: 'link',
        }).catch(() => {});
        await logEvent({ event: 'link_resend', deckId: deck.id, viewerId: grant.viewer_id, grantId: grant.id, ip, userAgent: ua }).catch(() => {});
      }
    }
    return accessGate(deck, {
      emailInfo: 'Nếu email của bạn có quyền xem, link đã được gửi vào hộp thư (kiểm tra cả mục spam).',
    });
  }

  // (B) Mật khẩu chung: đúng → set cookie mở khoá + redirect; sai → hiện lại gate.
  if (!deck.has_password) return accessGate(deck, { pwErr: 'Deck này không dùng mật khẩu.' });
  const pw = String(form?.get('password') ?? '');
  const ok = pw ? await verifyDeckPassword(deck.id, pw) : false;
  if (!ok) {
    await logEvent({ event: 'pw_fail', deckId: deck.id, ip, userAgent: ua }).catch(() => {});
    return accessGate(deck, { pwErr: 'Mật khẩu không đúng, thử lại.' });
  }
  await logEvent({ event: 'pw_ok', deckId: deck.id, ip, userAgent: ua }).catch(() => {});
  const base = process.env.APP_URL ?? new URL(req.url).origin;
  const token = await signDeckPwSession(deck.id);
  const res = NextResponse.redirect(`${base}/d/${deck.slug}`, 303);
  res.cookies.set(deckPwCookieName(deck.id), token, deckPwCookieOptions);
  return res;
}
