import type { NextRequest } from 'next/server';

// URL gốc tuyệt đối theo ĐÚNG domain người dùng đang truy cập (đa domain: deck.consultx.vn /
// deck.vanthang.io). Lấy từ header nginx (X-Forwarded-Host / Host + X-Forwarded-Proto) để mọi
// redirect/link giữ nguyên domain đang dùng (không nhảy sang domain khác giữa chừng → mất cookie).
// Fallback APP_URL rồi origin của request khi thiếu header.
export function reqBaseUrl(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (host) return `${proto}://${host}`;
  return process.env.APP_URL ?? new URL(req.url).origin;
}
