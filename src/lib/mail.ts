// Gửi email qua webhook n8n (app KHÔNG giữ SMTP cred). No-op nếu chưa cấu hình webhook.
export async function sendMail(msg: {
  to: string;
  subject: string;
  html: string;
  kind: 'link' | 'otp';
}): Promise<boolean> {
  const url = process.env.N8N_MAIL_WEBHOOK;
  if (!url) {
    console.warn('[mail] N8N_MAIL_WEBHOOK chưa cấu hình — bỏ qua gửi:', msg.subject);
    return false;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(msg),
    });
    return res.ok;
  } catch (e) {
    console.error('[mail] gửi lỗi', e);
    return false;
  }
}
