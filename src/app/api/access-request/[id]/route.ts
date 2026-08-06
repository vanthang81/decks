import { type NextRequest } from 'next/server';
import { getRequest, verifyActionToken, setRequestStatus, approveAndGrant, denyRequest } from '@/lib/accessRequests';
import { getDeckById } from '@/lib/decks';
import { reqBaseUrl } from '@/lib/http';

export const dynamic = 'force-dynamic';

// Trang kết quả gọn, có thương hiệu (admin bấm nút trong email sẽ thấy trang này).
function page(kind: 'ok-approve' | 'ok-deny' | 'already' | 'error', opts: { deckTitle?: string; email?: string; status?: string; msg?: string }): Response {
  const brand = '#3595D5';
  const map: Record<string, { color: string; icon: string; title: string; sub: string }> = {
    'ok-approve': { color: '#157F4A', icon: '✓', title: 'Đã đồng ý cấp quyền', sub: `Đã gửi link xem cá nhân tới <b>${opts.email ?? ''}</b>.` },
    'ok-deny': { color: '#C0432B', icon: '✕', title: 'Đã từ chối yêu cầu', sub: `Yêu cầu của <b>${opts.email ?? ''}</b> đã được đánh dấu không duyệt.` },
    'already': { color: brand, icon: 'ℹ', title: 'Yêu cầu đã được xử lý', sub: `Trạng thái hiện tại: <b>${opts.status ?? ''}</b>. Bạn có thể đổi ở trang quản trị deck.` },
    'error': { color: '#C0432B', icon: '!', title: 'Không xử lý được', sub: opts.msg ?? 'Link không hợp lệ hoặc đã hết hạn.' },
  };
  const s = map[kind];
  return new Response(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
     <title>${s.title}</title>
     <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0F1620;color:#EAF0F6;display:grid;place-items:center;min-height:100vh;margin:0;padding:20px}
       .card{width:min(94vw,440px);background:#172230;border:1px solid #26323F;border-radius:16px;padding:34px 28px;text-align:center;box-shadow:0 30px 70px -40px rgba(0,0,0,.7)}
       .ic{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;margin:0 auto 14px;font-size:30px;color:#fff;background:${s.color}}
       h2{margin:2px 0 6px;font-size:22px} p{color:#9EAAB8;font-size:14px;margin:0} .tag{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#52A8E6;font-weight:700;margin-bottom:8px}
       .deck{margin-top:14px;color:#C6D0DB;font-size:13px}</style></head>
     <body><div class="card"><div class="tag">deck.consultx.vn</div><div class="ic">${s.icon}</div>
       <h2>${s.title}</h2><p>${s.sub}</p>
       ${opts.deckTitle ? `<div class="deck">Deck: <b>${opts.deckTitle}</b></div>` : ''}
     </div></body></html>`,
    { status: kind === 'error' ? 400 : 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  );
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const action = req.nextUrl.searchParams.get('a');
  const token = req.nextUrl.searchParams.get('t') ?? '';
  if (action !== 'approve' && action !== 'deny') return page('error', { msg: 'Thiếu hành động.' });
  if (!(await verifyActionToken(params.id, token))) return page('error', {});

  const reqRow = await getRequest(params.id);
  if (!reqRow) return page('error', { msg: 'Yêu cầu không tồn tại.' });
  const deck = await getDeckById(reqRow.deck_id).catch(() => null);
  const deckTitle = deck?.title ?? '';

  // Idempotent: đã xử lý rồi thì báo trạng thái hiện tại (không làm lại).
  if (reqRow.status !== 'pending') {
    const label = reqRow.status === 'approved' ? 'đã đồng ý' : 'đã từ chối';
    return page('already', { deckTitle, status: label, email: reqRow.email });
  }

  if (action === 'approve') {
    await setRequestStatus(params.id, 'approved', 'email-link');
    await approveAndGrant(reqRow, reqBaseUrl(req), 'email-link').catch(() => {});
    return page('ok-approve', { deckTitle, email: reqRow.email });
  }
  await setRequestStatus(params.id, 'denied', 'email-link');
  await denyRequest(reqRow).catch(() => {});
  return page('ok-deny', { deckTitle, email: reqRow.email });
}
