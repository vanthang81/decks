import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { upsertDeck, setDeckPassword } from '@/lib/decks';
import { isValidSlug } from '@/lib/content';

export const dynamic = 'force-dynamic';

// API publish deck cho máy/Claude: xác thực bằng header x-publish-key (secret trong .env).
// Body JSON: { slug, title, html, description?, visibility?, require_otp?, is_published?, password? }
// password: chuỗi = đặt/đổi mật khẩu deck; '' hoặc null = gỡ mật khẩu; bỏ trống = giữ nguyên.
const Body = z.object({
  slug: z.string(),
  title: z.string().min(1),
  html: z.string().min(20),
  description: z.string().nullish(),
  visibility: z.enum(['public', 'protected']).optional().default('protected'),
  require_otp: z.boolean().optional().default(false),
  is_published: z.boolean().optional().default(true),
  password: z.string().nullish(),
});

export async function POST(req: NextRequest) {
  const key = process.env.PUBLISH_KEY;
  if (!key || req.headers.get('x-publish-key') !== key) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const slug = d.slug.trim().toLowerCase();
  if (!isValidSlug(slug)) {
    return NextResponse.json({ ok: false, error: 'invalid slug (a-z 0-9 -)' }, { status: 400 });
  }

  const deck = await upsertDeck({
    slug,
    title: d.title,
    description: d.description ?? null,
    visibility: d.visibility,
    require_otp: d.require_otp,
    is_published: d.is_published,
    content: d.html,
    createdBy: 'api',
  });

  // password: chỉ đụng khi field có mặt trong body (undefined = giữ nguyên).
  if (d.password !== undefined) {
    const pw = (d.password ?? '').trim();
    await setDeckPassword(deck.id, pw.length >= 4 ? pw : null);
  }

  const url = `${process.env.APP_URL ?? ''}/d/${slug}`;
  return NextResponse.json({ ok: true, slug, id: deck.id, url, has_password: deck.has_password || (d.password ? d.password.trim().length >= 4 : false) });
}
