// KHUNG EMAIL THƯƠNG HIỆU BTMH dùng chung cho MỌI email hệ thống (CFO 11/09):
// logo BTMH + tiêu đề (link tới đúng nội dung) + nội dung + nút CTA + chân trang.
// Bố cục dạng TABLE, CĂN TRÁI, inline-CSS → hiển thị đẹp & đồng nhất trên Gmail/Outlook/mobile.
// Logo dùng URL hosted (/icons/icon-192.png) vì Gmail chặn ảnh data-URI.
import { mailBaseUrl } from './mail';

export function emailEsc(s: string): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

export type EmailButton = { label: string; url: string };

export function brandedEmail(opts: {
  kicker?: string;          // dòng nhỏ trên tiêu đề (vd "Thông báo", "Biên bản cuộc họp · HOP-014")
  title: string;            // tiêu đề lớn (đã esc nếu là dữ liệu người dùng)
  titleUrl?: string;        // link cho tiêu đề (mở đúng nội dung)
  bodyHtml: string;         // nội dung chính (HTML an toàn)
  button?: EmailButton;     // nút CTA chính
  footerNote?: string;      // thêm vào chân (vd "gửi bởi Nguyễn Văn Thắng")
  preheader?: string;       // dòng ẩn xem trước trong hộp thư
}): string {
  const base = mailBaseUrl();
  const logo = `${base}/icons/icon-192.png`;
  const titleHtml = opts.titleUrl
    ? `<a href="${opts.titleUrl}" style="color:#ffffff;text-decoration:none">${opts.title}</a>`
    : opts.title;
  const kicker = opts.kicker
    ? `<div style="font-size:11.5px;letter-spacing:.5px;color:#f0c9b8;text-transform:uppercase">${opts.kicker}</div>` : '';
  const btn = opts.button ? `
        <div style="margin-top:22px">
          <a href="${opts.button.url}" style="background:#3595D5;color:#ffffff;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">${opts.button.label}</a>
        </div>
        <div style="margin-top:10px;font-size:12px;color:#64748b;word-break:break-all">${opts.button.url}</div>` : '';
  const pre = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${emailEsc(opts.preheader)}</div>` : '';

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  /* Lề sát mép hơn (CFO 12/09) — bóp thêm trên điện thoại để nội dung rộng, dễ đọc */
  .em-outer{padding:8px}
  .em-hd{padding:15px 18px}
  .em-bd{padding:18px 18px}
  @media only screen and (max-width:480px){
    .em-outer{padding:4px !important}
    .em-hd{padding:13px 13px !important}
    .em-bd{padding:15px 13px !important}
  }
</style></head>
<body style="margin:0;padding:0;background:#f1f5f9">${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9">
  <tr><td align="left" class="em-outer" style="padding:8px">
    <table role="presentation" cellpadding="0" cellspacing="0" width="680" style="width:680px;max-width:680px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#161A21;box-shadow:0 1px 4px rgba(0,0,0,.08)">
      <tr><td class="em-hd" style="background:#7C0312;padding:15px 18px">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="padding-right:14px;vertical-align:middle">
            <img src="${logo}" width="44" height="44" alt="BTMH" style="display:block;border:0;border-radius:9px" />
          </td>
          <td style="vertical-align:middle">
            ${kicker}
            <div style="font-size:19px;font-weight:700;color:#ffffff;margin-top:2px">${titleHtml}</div>
          </td>
        </tr></table>
      </td></tr>
      <tr><td class="em-bd" style="padding:18px 18px">
        ${opts.bodyHtml}
        ${btn}
        <div style="margin-top:20px;padding-top:14px;border-top:1px solid #eee;color:#94a3b8;font-size:12px">
          Email tự động từ Hệ thống Quản trị Hiệu suất BTMH${opts.footerNote ? ` · ${opts.footerNote}` : ''}. Vui lòng không trả lời email này.
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

/** Tiêu đề mục (maroon) trong thân email — để các builder dùng chung. */
export function emailSection(title: string): string {
  return `<div style="font-weight:700;font-size:15px;margin:18px 0 6px;color:#7C0312">${title}</div>`;
}
