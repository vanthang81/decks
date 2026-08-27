import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { upsertDeck, upsertDeckGuarded, getDeckContentState, setDeckPassword, generateDeckPassword, getDeckBySlug, updateDeckMeta, setDeckSource, setDeckWatermark, type Deck } from '@/lib/decks';
import { resolveCategory, resolveDescription } from '@/lib/categorize';
import { generateDeckThumbnail } from '@/lib/thumbnail';
import { isValidSlug } from '@/lib/content';

export const dynamic = 'force-dynamic';

// API publish deck cho máy/Claude: xác thực bằng header x-publish-key (secret trong .env).
// Body: { slug, title, html | html_url, description?, visibility?, require_otp?, is_published?, password?,
//         generate_password?, category?, tags?, company? }
// html: HTML self-contained dán inline. HOẶC html_url: link để SERVER tự tải HTML về (cho deck lớn,
//   nhúng font — không phải dán cả file qua chat/MCP). Cần MỘT trong hai.
// password: chuỗi(>=4) = đặt/đổi; '' hoặc null = gỡ; bỏ trống = giữ nguyên.
// generate_password: true (khi không truyền password) = tự sinh mật khẩu, trả về trong response.
const Body = z.object({
  slug: z.string(),
  title: z.string().min(1),
  // Cần html HOẶC html_url (kiểm ở refine bên dưới).
  html: z.string().min(20).optional(),
  // Link để server tự tải HTML deck về (Google Drive / Dropbox / link http(s) trực tiếp…).
  html_url: z.string().optional(),
  description: z.string().nullish(),
  // Bỏ trống khi CẬP NHẬT deck có sẵn = GIỮ NGUYÊN giá trị hiện tại (không reset). Chỉ dùng mặc định
  // (protected / false / true) khi TẠO MỚI deck chưa tồn tại. → republish nội dung không đổi phân quyền.
  visibility: z.enum(['public', 'protected']).optional(),
  require_otp: z.boolean().optional(),
  is_published: z.boolean().optional(),
  password: z.string().nullish(),
  generate_password: z.boolean().optional(),
  category: z.string().nullish(),
  tags: z.array(z.string()).optional(),
  company: z.string().optional(),
  source_url: z.string().nullish(),
  // Watermark mặc định của deck. Bỏ trống: TẠO MỚI = BẬT (true); CẬP NHẬT = giữ nguyên.
  watermark: z.boolean().optional(),
  // Optimistic lock chống ghi đè khi nhiều phiên cùng sửa 1 deck:
  //   bỏ trống = không khoá (y như cũ) · "new" = chỉ tạo mới · <md5 32 hex> = chỉ ghi khi content hiện tại khớp.
  if_match: z.string().nullish(),
}).refine((d) => !!(d.html || d.html_url), {
  message: 'cần html hoặc html_url',
  path: ['html'],
});

// Tải HTML deck từ 1 URL (thay cho dán html inline) → cho phép publish deck lớn (nhúng font) mà không
// phải bê cả file qua chat/MCP. Fetch phía server (portal VPS có outbound). Giới hạn dung lượng + sniff HTML.
const MAX_HTML_BYTES = 25 * 1024 * 1024; // 25MB

function normalizeFetchUrl(raw: string): string {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error('html_url không hợp lệ'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('html_url chỉ hỗ trợ http/https');
  // Google Drive: đổi link chia sẻ → link tải trực tiếp.
  //   /file/d/<ID>/view…  hoặc  ?id=<ID>  →  uc?export=download&id=<ID>
  if (u.hostname === 'drive.google.com') {
    const m = u.pathname.match(/\/file\/d\/([^/]+)/);
    const id = m?.[1] ?? u.searchParams.get('id');
    if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
  }
  // Dropbox: ép tải trực tiếp.
  if (u.hostname.endsWith('dropbox.com')) { u.searchParams.set('dl', '1'); return u.toString(); }
  return raw;
}

async function fetchHtmlFromUrl(raw: string): Promise<string> {
  const url = normalizeFetchUrl(raw);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  let res: Response;
  try {
    res = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': 'decks-portal/1.0' } });
  } catch (e) {
    throw new Error(`không tải được html_url: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`html_url trả HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_HTML_BYTES) throw new Error(`file quá lớn (${buf.length} bytes > ${MAX_HTML_BYTES})`);
  const html = buf.toString('utf8');
  if (html.length < 20) throw new Error('html tải về quá ngắn');
  if (!/<html[\s>]|<!doctype html/i.test(html)) {
    throw new Error('nội dung tải về không phải HTML (có thể là trang xác nhận/đăng nhập của nguồn — hãy dùng link tải trực tiếp / chia sẻ "ai có link")');
  }
  // Chặn nhầm trang cảnh báo quét virus của Google Drive (khi file quá lớn).
  if (/Google Drive.*(can.?t scan|virus scan)/is.test(html) && html.length < 20000) {
    throw new Error('Google Drive trả trang cảnh báo quét virus thay vì file — file có thể quá lớn để tải trực tiếp');
  }
  return html;
}

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

  // Nội dung HTML: dán inline (html) HOẶC để server tự tải về (html_url). html_url được ưu tiên khi có.
  let htmlContent: string;
  if (d.html_url) {
    try { htmlContent = await fetchHtmlFromUrl(d.html_url); }
    catch (e) { return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'không tải được html_url' }, { status: 400 }); }
  } else {
    htmlContent = d.html as string; // refine đảm bảo có html khi thiếu html_url
  }

  // Deck hiện tại (nếu có) — dùng để GIỮ NGUYÊN phân quyền/mật khẩu khi caller không truyền lại.
  // upsert KHÔNG đụng password_hash/password_plain/source_url ⇒ mật khẩu + link chat gốc tự bảo toàn;
  // grants (link cá nhân) + entitlement nhóm gắn theo deck_id ⇒ giữ nguyên vì upsert giữ cùng 1 dòng deck.
  const existing = await getDeckBySlug(slug);
  const visibility = d.visibility ?? existing?.visibility ?? 'protected';
  const require_otp = d.require_otp ?? existing?.require_otp ?? false;
  const is_published = d.is_published ?? existing?.is_published ?? true;
  // Mô tả ngắn cho card: người nhập > mô tả hiện có (GIỮ NGUYÊN khi republish thiếu) > tự suy từ nội dung.
  // → card luôn có "đoạn tóm tắt" giống các tài liệu khác; đồng thời không mất mô tả cũ khi update chỉ đổi nội dung.
  const description = resolveDescription(d.description, existing?.description, { content: htmlContent, title: d.title });

  // Optimistic lock (tuỳ chọn). Kiểm tra + ghi atomic trong upsertDeckGuarded → không có khe TOCTOU.
  let guard: { mode: 'new' } | { mode: 'md5'; md5: string } | null = null;
  const im = d.if_match?.trim();
  if (im) {
    if (im === 'new') guard = { mode: 'new' };
    else if (/^[0-9a-f]{32}$/i.test(im)) guard = { mode: 'md5', md5: im.toLowerCase() };
    else return NextResponse.json({ ok: false, error: 'if_match phải là "new" hoặc md5 32 hex' }, { status: 400 });
  }

  let deck: Deck | null;
  if (guard) {
    deck = await upsertDeckGuarded(
      {
        slug,
        title: d.title,
        description,
        visibility,
        require_otp,
        is_published,
        content: htmlContent,
        createdBy: 'api',
      },
      guard,
    );
    if (!deck) {
      // Lệch phiên bản: KHÔNG ghi gì. Trả trạng thái hiện tại để người gọi đọc lại + rebase + gọi lại.
      const st = await getDeckContentState(slug);
      return NextResponse.json(
        {
          ok: false,
          error: 'conflict',
          reason: guard.mode === 'new' ? 'slug_exists' : 'md5_mismatch',
          current_md5: st?.md5 ?? null,
          current_len: st?.len ?? null,
          current_updated_at: st?.updated_at ?? null,
        },
        { status: 409 },
      );
    }
  } else {
    deck = await upsertDeck({
      slug,
      title: d.title,
      description,
      visibility,
      require_otp,
      is_published,
      content: htmlContent,
      createdBy: 'api',
    });
  }

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
    hasPassword = existing?.has_password ?? false; // giữ nguyên (upsert không đụng mật khẩu)
  }

  // Metadata phân loại. LUÔN đảm bảo deck có danh mục: ưu tiên category truyền vào > danh mục hiện có >
  // tự suy từ tiêu đề/mô tả/thẻ (có thể sinh danh mục mới). deck.category = danh mục hiện tại (upsert không đổi nó).
  const category = resolveCategory(d.category, deck.category, {
    content: htmlContent,
    title: d.title, description, tags: d.tags,
  });
  await updateDeckMeta(deck.id, {
    category,
    ...(d.tags !== undefined ? { tags: d.tags } : {}),
    ...(d.company !== undefined ? { company: d.company } : {}),
  });

  // Link nguồn / chat gốc (tuỳ chọn). Chỉ đặt khi truyền vào (không truyền = giữ nguyên).
  if (d.source_url !== undefined) {
    await setDeckSource(deck.id, d.source_url ?? null);
  }

  // Watermark: TẠO MỚI (deck chưa tồn tại) = mặc định BẬT; caller truyền watermark thì theo caller.
  // CẬP NHẬT mà không truyền = KHÔNG đụng (giữ nguyên). upsert không đụng cột watermark.
  if (d.watermark !== undefined || !existing) {
    await setDeckWatermark(deck.id, d.watermark ?? existing?.watermark ?? true);
  }

  // Ảnh preview: tự chụp slide đầu (best-effort, không chặn kết quả nếu lỗi).
  await generateDeckThumbnail({ id: deck.id, slug }).catch(() => false);

  // md5/len nội dung vừa ghi (đọc lại từ DB cho đúng giá trị Postgres tính) → dùng làm if_match lần sau.
  const state = await getDeckContentState(slug);
  const url = `${process.env.APP_URL ?? ''}/d/${slug}`;
  return NextResponse.json({
    ok: true, slug, id: deck.id, url, has_password: hasPassword,
    content_md5: state?.md5 ?? null,
    content_len: state?.len ?? null,
    ...(newPw ? { password: newPw } : {}),
  });
}
