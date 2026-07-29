import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { upsertDeck, setDeckPassword, generateDeckPassword, getDeckBySlug, updateDeckMeta } from '@/lib/decks';
import { generateDeckThumbnail } from '@/lib/thumbnail';
import { isValidSlug } from '@/lib/content';

export const dynamic = 'force-dynamic';

// API publish deck cho máy/Claude: xác thực bằng header x-publish-key (secret trong .env).
// Body: { slug, title, html, description?, visibility?, require_otp?, is_published?, password?,
//         generate_password?, category?, tags?, company? }
// password: chuỗi(>=4) = đặt/đổi; '' hoặc null = gỡ; bỏ trống = giữ nguyên.
// generate_password: true (khi không truyền password) = tự sinh mật khẩu, trả về trong response.
const Body = z.object({
  slug: z.string(),
  title: z.string().min(1),
  html: z.string().min(20),
  description: z.string().nullish(),
  visibility: z.enum(['public', 'protected']).optional().default('protected'),
  require_otp: z.boolean().optional().default(false),
  is_published: z.boolean().optional().default(true),
  password: z.string().nullish(),
  generate_password: z.boolean().optional(),
  category: z.string().nullish(),
  tags: z.array(z.string()).optional(),
  company: z.string().optional(),
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

  // Xử lý mật khẩu. newPw = plaintext vừa đặt/sinh (trả về 1 lần cho người gọi); null = không đổi/gỡ.
  let newPw: string | null = null;
  let hasPassword: boolean;
  if (d.password !== undefined) {
    const pw = (d.password ?? '').trim();
    if (pw.length >= 4) { await setDeckPassword(deck.id, pw); newPw = pw; hasPassword = true; }
    else { await setDeckPassword(deck.id, null); hasPassword = false; } // '' hoặc <4 = gỡ
  } else if (d.generate_password) {
    newPw = generateDeckPassword();
    await setDeckPassword(deck.id, newPw);
    hasPassword = true;
  } else {
    hasPassword = (await getDeckBySlug(slug))?.has_password ?? false; // giữ nguyên
  }

  // Metadata phân loại (chỉ cập nhật field được truyền).
  if (d.category !== undefined || d.tags !== undefined || d.company !== undefined) {
    await updateDeckMeta(deck.id, {
      ...(d.category !== undefined ? { category: d.category ?? null } : {}),
      ...(d.tags !== undefined ? { tags: d.tags } : {}),
      ...(d.company !== undefined ? { company: d.company } : {}),
    });
  }

  // Ảnh preview: tự chụp slide đầu (best-effort, không chặn kết quả nếu lỗi).
  await generateDeckThumbnail({ id: deck.id, slug }).catch(() => false);

  const url = `${process.env.APP_URL ?? ''}/d/${slug}`;
  return NextResponse.json({
    ok: true, slug, id: deck.id, url, has_password: hasPassword,
    ...(newPw ? { password: newPw } : {}),
  });
}
