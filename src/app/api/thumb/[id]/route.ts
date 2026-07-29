import { type NextRequest } from 'next/server';
import { getDeckThumbnail } from '@/lib/decks';
import { auth } from '@/auth';
import { getAdmin } from '@/lib/admins';

export const dynamic = 'force-dynamic';

// Ảnh preview deck — CHỈ admin đã đăng nhập (trang chủ là nội bộ; tránh lộ slide deck bảo mật).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const email = (await auth().catch(() => null))?.user?.email;
  if (!email || !(await getAdmin(email).catch(() => null))?.is_active) {
    return new Response('unauthorized', { status: 401 });
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
