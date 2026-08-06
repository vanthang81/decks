import { type NextRequest } from 'next/server';
import { getDeckThumbnail } from '@/lib/decks';
import { auth } from '@/auth';
import { getAdmin } from '@/lib/admins';
import { verifyThumbToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Ảnh preview deck. Truy cập bằng: (a) phiên admin đang hoạt động (trang quản trị), HOẶC
// (b) token ký sẵn ?t=... (nhúng ảnh vào email duyệt yêu cầu — Gmail chặn data-URI nên phải qua URL).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const t = req.nextUrl.searchParams.get('t') ?? undefined;
  const viaToken = await verifyThumbToken(t, params.id);
  if (!viaToken) {
    const email = (await auth().catch(() => null))?.user?.email;
    if (!email || !(await getAdmin(email).catch(() => null))?.is_active) {
      return new Response('unauthorized', { status: 401 });
    }
  }

  const uri = await getDeckThumbnail(params.id).catch(() => null);
  const m = uri?.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!m) return new Response('not found', { status: 404 });

  const buf = Buffer.from(m[2], 'base64');
  return new Response(buf, {
    headers: {
      'content-type': m[1],
      'cache-control': 'private, max-age=120',
    },
  });
}
