import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { logError } from '@/lib/errlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Nhận báo lỗi từ error boundary phía trình duyệt (client) → ghi nhật ký lỗi.
// Không cần quyền đặc biệt (chỉ ghi log), nhưng giới hạn kích thước + gắn user nếu có phiên.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const s = await auth().catch(() => null);
    await logError({
      kind: 'client',
      path: typeof body.path === 'string' ? body.path.slice(0, 300) : null,
      digest: typeof body.digest === 'string' ? body.digest.slice(0, 60) : null,
      message: typeof body.message === 'string' ? body.message : null,
      user_email: s?.user?.email ?? null,
    });
  } catch {
    /* best-effort */
  }
  return NextResponse.json({ ok: true });
}
