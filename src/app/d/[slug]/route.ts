import { NextResponse, type NextRequest } from 'next/server';
import { getDeckBySlug, verifyDeckPassword, type Deck } from '@/lib/decks';
import { readDeckHtml } from '@/lib/content';
import { getActiveGrant, findActiveGrantByDeckEmail, rotateGrantToken } from '@/lib/grants';
import {
  verifyViewerSession, VIEWER_COOKIE,
  deckPwCookieName, verifyDeckPwSession, signDeckPwSession, deckPwCookieOptions,
} from '@/lib/session';
import { wrapProtectedDeck } from '@/lib/watermark';
import { reqBaseUrl } from '@/lib/http';
import { logEvent } from '@/lib/log';
import { sendMail } from '@/lib/mail';
import { auth } from '@/auth';
import { getAdmin, listAdmins } from '@/lib/admins';
import { createOrUpdateRequest } from '@/lib/accessRequests';
import { adminRequestEmail } from '@/lib/emails';
import { parseUA } from '@/lib/ua';
import { signThumbToken } from '@/lib/session';

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
  opts: { pwErr?: string; reqErr?: string; reqInfo?: string } = {},
): Response {
  const showPw = deck.has_password;
  const showRequest = deck.visibility === 'protected'; // gửi yêu cầu cấp quyền / lấy lại link
  const showGoogle = deck.visibility === 'protected'; // Google login: admin + viewer được cấp
  const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]!));
  const cb = encodeURIComponent(`/d/${deck.slug}`);

  const googleSection = showGoogle
    ? `<div class="sec">
         <label>Đăng nhập bằng Google</label>
         <a class="gbtn" href="/login?callbackUrl=${cb}">
           <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 8.1 29.3 6 24 6 14.1 6 6 14.1 6 24s8.1 18 18 18c9.9 0 18-8.1 18-18 0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M8.3 14.7l6.6 4.8C16.7 15.1 20 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 8.1 29.3 6 24 6 16.3 6 9.7 10.3 6.3 16.7l2-2z"/><path fill="#4CAF50" d="M24 42c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 33 26.7 34 24 34c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 37.6 16.2 42 24 42z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C41.4 35.5 44 30.2 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
           Tiếp tục với Google
         </a>
         <p class="note">Dùng nếu email Google của bạn đã được cấp quyền (hoặc bạn là quản trị viên).</p>
       </div>`
    : '';

  const pwSection = showPw
    ? `<form class="sec" method="post" action="/d/${deck.slug}">
         <input type="hidden" name="mode" value="password" />
         <label>Mật khẩu chung</label>
         <input type="password" name="password" placeholder="Nhập mật khẩu được cấp" autocomplete="off" required />
         <button type="submit">Mở deck</button>
         ${opts.pwErr ? `<div class="err">${esc(opts.pwErr)}</div>` : ''}
       </form>`
    : '';

  const requestSection = showRequest
    ? `<form class="sec" method="post" action="/d/${deck.slug}">
         <input type="hidden" name="mode" value="request" />
         <label>Yêu cầu quyền xem deck</label>
         <input type="email" name="email" placeholder="email@congty.com" autocomplete="email" required />
         <input type="text" name="name" placeholder="Tên của bạn (tuỳ chọn)" autocomplete="name" maxlength="120" />
         <input type="text" name="message" placeholder="Lý do cần xem (tuỳ chọn)" maxlength="300" />
         <button type="submit" class="ghost">Gửi yêu cầu</button>
         ${opts.reqErr ? `<div class="err">${esc(opts.reqErr)}</div>` : ''}
         ${opts.reqInfo ? `<div class="info">${esc(opts.reqInfo)}</div>` : ''}
       </form>`
    : '';

  const sections = [googleSection, pwSection, requestSection].filter(Boolean);
  const body = sections.join(`<div class="or"><span>hoặc</span></div>`);
  const help = showRequest && !showPw
    ? `<p class="hint">Bạn cần được cấp quyền để xem. Đăng nhập Google (nếu email đã được cấp), hoặc gửi yêu cầu để quản trị viên duyệt — hệ sẽ email link cho bạn khi được duyệt.</p>`
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
       .gbtn{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:4px;width:100%;padding:11px;border-radius:9px;background:#fff;color:#1F2937;font-weight:700;font-size:15px;text-decoration:none}
       .gbtn:hover{background:#F1F3F5}
       .note{color:#7A8794;font-size:12px;margin:6px 0 0;text-align:center}
       .err{color:#E27a63;font-size:13px} .info{color:#7FD1A6;font-size:13px}
       .hint{color:#9EAAB8;font-size:12.5px;text-align:center;margin:2px 0 16px}
       .or{display:flex;align-items:center;gap:12px;color:#5C6B7A;font-size:12px;margin:18px 0}
       .or::before,.or::after{content:"";flex:1;height:1px;background:#26323F}
     </style></head>
     <body><div class="card">
       <div class="tag">deck.consultx.vn</div>
       <h2>${esc(deck.title)}</h2>
       <p class="sub">Deck bảo mật — chọn cách bạn được cấp quyền để xem.</p>
       ${help}${body}
     </div></body></html>`,
    opts.pwErr ? 401 : 200,
  );
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const deck = await getDeckBySlug(params.slug);
  if (!deck || !deck.is_published) return htmlResponse('<h1>404 — Không tìm thấy deck</h1>', 404);

  const html = await readDeckHtml(deck.slug);
  if (html === null) return htmlResponse('<h1>404 — Thiếu nội dung deck</h1>', 404);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const ua = req.headers.get('user-agent');

  // Phiên Google (Auth.js): admin xem MỌI deck; viewer được cấp xem deck có grant khớp email.
  try {
    const gEmail = (await auth())?.user?.email?.toLowerCase();
    if (gEmail) {
      // (a) Admin → xem được mọi deck (công khai raw; bảo mật bọc watermark định danh admin).
      const admin = await getAdmin(gEmail);
      if (admin?.is_active) {
        await logEvent({ event: 'view', deckId: deck.id, ip, userAgent: ua }).catch(() => {});
        return htmlResponse(
          deck.visibility === 'public'
            ? html
            : wrapProtectedDeck(html, {
                email: gEmail,
                name: admin.display_name ?? 'Quản trị viên',
                deckSlug: deck.slug,
              }),
        );
      }
      // (b) Viewer đăng nhập Google + có grant còn hiệu lực cho deck này → xem watermark định danh.
      //     Google đã xác thực chủ email nên bỏ qua OTP (tương đương/tốt hơn OTP-email).
      const grant = await findActiveGrantByDeckEmail(deck.id, gEmail);
      if (grant) {
        await logEvent({ event: 'view', deckId: deck.id, viewerId: grant.viewer_id, grantId: grant.id, ip, userAgent: ua }).catch(() => {});
        return htmlResponse(
          deck.visibility === 'public'
            ? html
            : wrapProtectedDeck(html, { email: grant.viewer_email, name: grant.viewer_name, deckSlug: deck.slug }),
        );
      }
    }
  } catch {
    // Không có phiên Google hợp lệ → tiếp tục luồng viewer (link/mật khẩu) bên dưới.
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

  // (A) Yêu cầu quyền xem: nếu email ĐÃ có grant → gửi lại link ngay; nếu CHƯA → tạo yêu cầu + email admin duyệt.
  //     Trả lời TRUNG TÍNH (không tiết lộ email nào đã có quyền).
  if (mode === 'request' || mode === 'email') {
    if (deck.visibility !== 'protected') {
      return accessGate(deck, { reqErr: 'Deck này không cần yêu cầu cấp quyền.' });
    }
    const email = String(form?.get('email') ?? '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return accessGate(deck, { reqErr: 'Email không hợp lệ.' });
    }
    const name = String(form?.get('name') ?? '').trim().slice(0, 120) || null;
    const message = String(form?.get('message') ?? '').trim().slice(0, 300) || null;
    const base = reqBaseUrl(req);

    const grant = await findActiveGrantByDeckEmail(deck.id, email);
    if (grant) {
      // Đã có quyền → gửi lại link cá nhân (rotate token).
      const token = await rotateGrantToken(grant.id);
      if (token) {
        await sendMail({
          to: grant.viewer_email,
          subject: `Link xem deck: ${deck.title}`,
          html: `<p>Bạn yêu cầu xem deck <b>${deck.title}</b>.</p>
                 <p><a href="${base}/v/${token}">Mở deck</a> — link cá nhân, chỉ dành cho bạn${deck.require_otp ? ' (sẽ cần mã OTP gửi qua email)' : ''}.</p>`,
          kind: 'link',
        }).catch(() => {});
        await logEvent({ event: 'link_resend', deckId: deck.id, viewerId: grant.viewer_id, grantId: grant.id, ip, userAgent: ua }).catch(() => {});
      }
    } else {
      // Chưa có quyền → tạo yêu cầu + gửi email tới các admin để duyệt (nút Đồng ý/Không đồng ý).
      try {
        const { req: reqRow, token } = await createOrUpdateRequest({ deckId: deck.id, email, name, message, ip, ua });
        const admins = (await listAdmins().catch(() => [])).filter((a) => a.is_active && a.email);
        if (admins.length) {
          const info = parseUA(ua);
          const thumbUrl = deck.has_thumbnail ? `${base}/api/thumb/${deck.id}?t=${await signThumbToken(deck.id)}` : null;
          const whenVN = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
          const html = adminRequestEmail({
            deckTitle: deck.title, deckUrl: `${base}/d/${deck.slug}`, category: deck.category, company: deck.company,
            thumbUrl, email, name, message, ip, browser: info.browser, os: info.os, whenVN, domain: base,
            approveUrl: `${base}/api/access-request/${reqRow.id}?a=approve&t=${token}`,
            denyUrl: `${base}/api/access-request/${reqRow.id}?a=deny&t=${token}`,
            manageUrl: `${base}/admin/decks/${deck.id}`,
          });
          for (const a of admins) {
            await sendMail({ to: a.email, subject: `[Deck] Xin quyền xem: ${deck.title} — ${email}`, html, kind: 'link' }).catch(() => {});
          }
        }
      } catch { /* best-effort: không chặn phản hồi người dùng */ }
    }
    return accessGate(deck, {
      reqInfo: 'Đã ghi nhận. Nếu email của bạn đã có quyền, link xem đã được gửi vào hộp thư; nếu chưa, yêu cầu đã được chuyển tới quản trị viên để duyệt.',
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
  const base = reqBaseUrl(req);
  const token = await signDeckPwSession(deck.id);
  const res = NextResponse.redirect(`${base}/d/${deck.slug}`, 303);
  res.cookies.set(deckPwCookieName(deck.id), token, deckPwCookieOptions);
  return res;
}
