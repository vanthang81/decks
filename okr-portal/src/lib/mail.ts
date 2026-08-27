// Gửi email. Ưu tiên SMTP TRỰC TIẾP (nodemailer) khi có cấu hình `SMTP_HOST` (dùng cho OKR
// portal: gửi từ okr@baotinmanhhai.vn). Nếu chưa cấu hình SMTP → fallback webhook n8n
// (`N8N_MAIL_WEBHOOK`, giữ tương thích cũ). Chưa có cả hai → no-op (chỉ cảnh báo log).
import nodemailer, { type Transporter } from 'nodemailer';

let _tx: Transporter | null | undefined; // undefined = chưa khởi tạo; null = không có SMTP

function transport(): Transporter | null {
  if (_tx !== undefined) return _tx;
  const host = process.env.SMTP_HOST;
  if (!host) {
    _tx = null;
    return null;
  }
  const port = Number(process.env.SMTP_PORT || 587);
  _tx = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = SSL/TLS ngầm; 587 = STARTTLS (secure=false rồi nâng cấp)
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return _tx;
}

export async function sendMail(msg: {
  to: string;
  subject: string;
  html: string;
  kind?: 'link' | 'otp';
}): Promise<boolean> {
  // 1) SMTP trực tiếp (ưu tiên)
  const tx = transport();
  if (tx) {
    const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'okr@baotinmanhhai.vn';
    try {
      await tx.sendMail({ from, to: msg.to, subject: msg.subject, html: msg.html });
      return true;
    } catch (e) {
      console.error('[mail] SMTP gửi lỗi', e);
      return false;
    }
  }
  // 2) Fallback webhook n8n (tương thích cũ)
  const url = process.env.N8N_MAIL_WEBHOOK;
  if (!url) {
    console.warn('[mail] Chưa cấu hình SMTP_HOST lẫn N8N_MAIL_WEBHOOK — bỏ qua:', msg.subject);
    return false;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'link', ...msg }),
    });
    return res.ok;
  } catch (e) {
    console.error('[mail] webhook gửi lỗi', e);
    return false;
  }
}
