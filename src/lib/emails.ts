// HTML email chuyên nghiệp (inline CSS — email client không đọc <style>). Palette ConsultX #3595D5.
// An toàn Gmail: dùng bảng, màu nền inline, ảnh preview qua URL có token (không data-URI).

function esc(s: string): string {
  return String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]!));
}

const BRAND = '#3595D5';
const INK = '#161A21';
const MUTED = '#5B6673';
const LINE = '#E4E9F0';

function shell(title: string, inner: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#EEF2F7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF2F7;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${LINE};border-radius:14px;overflow:hidden;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <tr><td style="background:${BRAND};padding:16px 24px;">
          <span style="color:#fff;font-weight:800;font-size:15px;letter-spacing:.02em;">ConsultX · Deck Portal</span>
          <span style="color:#DCEBF9;font-size:13px;"> — ${esc(title)}</span>
        </td></tr>
        <tr><td style="padding:24px;color:${INK};font-size:14px;line-height:1.55;">${inner}</td></tr>
        <tr><td style="padding:14px 24px;border-top:1px solid ${LINE};color:${MUTED};font-size:12px;">
          Email tự động từ deck.consultx.vn — vui lòng không trả lời trực tiếp.
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

function btn(href: string, label: string, bg: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;padding:12px 22px;margin:4px 6px 4px 0;background:${bg};color:#fff;text-decoration:none;border-radius:9px;font-weight:700;font-size:14px;">${esc(label)}</a>`;
}

function row(k: string, v: string): string {
  return `<tr>
    <td style="padding:7px 10px 7px 0;color:${MUTED};font-size:13px;white-space:nowrap;vertical-align:top;">${esc(k)}</td>
    <td style="padding:7px 0;color:${INK};font-size:13px;vertical-align:top;">${v}</td>
  </tr>`;
}

// Email gửi ADMIN khi có người xin cấp quyền. approveUrl/denyUrl = link 1-chạm (kèm token).
export function adminRequestEmail(args: {
  deckTitle: string;
  deckUrl: string;
  category: string | null;
  company: string;
  thumbUrl: string | null;
  email: string;
  name: string | null;
  message: string | null;
  ip: string | null;
  browser: string;
  os: string;
  whenVN: string;
  domain: string;
  approveUrl: string;
  denyUrl: string;
  manageUrl: string;
}): string {
  const preview = args.thumbUrl
    ? `<img src="${esc(args.thumbUrl)}" width="252" alt="preview slide" style="width:252px;max-width:100%;border:1px solid ${LINE};border-radius:8px;display:block;" />`
    : `<div style="width:252px;height:142px;background:${BRAND};border-radius:8px;color:#fff;text-align:center;line-height:142px;font-weight:700;">${esc(args.deckTitle.slice(0, 1).toUpperCase())}</div>`;

  const inner = `
    <p style="margin:0 0 4px;font-size:16px;font-weight:700;">Có người xin quyền xem một deck bảo mật</p>
    <p style="margin:0 0 18px;color:${MUTED};">Xem thông tin bên dưới rồi bấm <b>Đồng ý</b> hoặc <b>Không đồng ý</b>.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td style="padding-right:16px;vertical-align:top;">${preview}</td>
        <td style="vertical-align:top;">
          <div style="font-size:16px;font-weight:700;color:${INK};margin-bottom:4px;">${esc(args.deckTitle)}</div>
          <div style="color:${MUTED};font-size:13px;margin-bottom:8px;">${esc(args.company)}${args.category ? ' · ' + esc(args.category) : ''}</div>
          <a href="${esc(args.deckUrl)}" style="color:${BRAND};font-size:13px;">${esc(args.deckUrl)}</a>
        </td>
      </tr>
    </table>

    <div style="border:1px solid ${LINE};border-radius:10px;padding:6px 14px;margin-bottom:20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${row('Người yêu cầu', `<b>${esc(args.email)}</b>`)}
        ${args.name ? row('Tên', esc(args.name)) : ''}
        ${args.message ? row('Lý do', esc(args.message)) : ''}
        ${row('Thời gian', esc(args.whenVN))}
        ${row('Truy cập từ', esc(args.domain))}
        ${row('Trình duyệt', esc(args.browser))}
        ${row('Hệ điều hành', esc(args.os))}
        ${row('Địa chỉ IP', esc(args.ip ?? 'Không rõ'))}
      </table>
    </div>

    <div style="margin-bottom:8px;">
      ${btn(args.approveUrl, '✓ Đồng ý cấp quyền', '#157F4A')}
      ${btn(args.denyUrl, '✕ Không đồng ý', '#C0432B')}
    </div>
    <p style="margin:12px 0 0;color:${MUTED};font-size:12px;">
      Bấm <b>Đồng ý</b> sẽ tự cấp link xem cá nhân cho người này qua email. Bạn có thể đổi quyết định bất cứ lúc nào ở
      <a href="${esc(args.manageUrl)}" style="color:${BRAND};">trang quản trị deck</a>.
    </p>`;
  return shell('Yêu cầu cấp quyền', inner);
}

// Email gửi NGƯỜI XEM khi được duyệt.
export function userApprovedEmail(deckTitle: string, link: string, name: string | null): string {
  const inner = `
    <p style="margin:0 0 6px;font-size:16px;font-weight:700;">Bạn đã được cấp quyền xem deck 🎉</p>
    <p style="margin:0 0 18px;">${name ? esc(name) + ', y' : 'Y'}êu cầu xem deck <b>${esc(deckTitle)}</b> của bạn đã được duyệt.</p>
    <div>${btn(link, 'Mở deck', BRAND)}</div>
    <p style="margin:16px 0 0;color:${MUTED};font-size:12px;">Link cá nhân, chỉ dành cho bạn. Nếu không phải bạn yêu cầu, hãy bỏ qua email này.</p>`;
  return shell('Đã cấp quyền', inner);
}
