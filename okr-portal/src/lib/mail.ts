// Gửi email qua webhook n8n "Deck Mail" (app KHÔNG giữ SMTP cred).
// No-op nếu chưa cấu hình N8N_MAIL_WEBHOOK.
export async function sendMail(msg: {
  to: string;
  subject: string;
  html: string;
  kind?: 'link' | 'otp';
}): Promise<boolean> {
  const url = process.env.N8N_MAIL_WEBHOOK;
  if (!url) {
    console.warn('[mail] N8N_MAIL_WEBHOOK chưa cấu hình — bỏ qua:', msg.subject);
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
    console.error('[mail] gửi lỗi', e);
    return false;
  }
}
