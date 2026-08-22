#!/usr/bin/env node
/**
 * deck-publisher-mcp-server — MCP server (Streamable HTTP) để publish deck lên deck.consultx.vn.
 * Dùng làm custom connector cho claude.ai. Xác thực bằng header `Authorization: Bearer <MCP_TOKEN>`.
 * Tool: deck_publish -> gọi portal POST /api/publish (kèm PUBLISH_KEY, server-side).
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';

const PORT = parseInt(process.env.PORT || '8620', 10);
const MCP_TOKEN = process.env.MCP_TOKEN || '';
const PUBLISH_KEY = process.env.PUBLISH_KEY || '';
const PORTAL_URL = process.env.PORTAL_URL || 'http://127.0.0.1:8610';

if (!MCP_TOKEN || !PUBLISH_KEY) {
  console.error('ERROR: cần MCP_TOKEN và PUBLISH_KEY trong env');
  process.exit(1);
}

function buildServer(): McpServer {
  const server = new McpServer({ name: 'deck-publisher-mcp-server', version: '1.0.0' });

  server.registerTool(
    'deck_publish',
    {
      title: 'Publish deck lên deck.consultx.vn',
      description: `Tạo hoặc cập nhật một slide deck trên deck.consultx.vn và trả về URL.

Truyền HTML self-contained (1 file, không CDN/webfont nặng). Deck 'public' hiện ở gallery công khai;
deck 'protected' KHÔNG công khai — chỉ xem được qua link cá nhân do admin cấp (có watermark + log).

Kiểm soát truy cập bằng MẬT KHẨU (tùy chọn): đặt 'password' hoặc bật 'generate_password' để khoá deck
bằng một mật khẩu chung — ai có link + mật khẩu là xem được ngay (không cần cấp link cá nhân).

Args:
  - slug (string): định danh URL, chỉ a-z 0-9 và gạch nối, vd 'btmh-investor-2026'
  - title (string): tiêu đề deck
  - html (string): TOÀN BỘ HTML self-contained của deck
  - visibility ('public' | 'protected'): khi TẠO MỚI mặc định 'protected'. Khi CẬP NHẬT deck có sẵn mà BỎ TRỐNG = GIỮ NGUYÊN chế độ hiện tại (không đổi phân quyền).
  - require_otp (boolean): bắt OTP email khi xem (chỉ áp dụng deck protected). Khi CẬP NHẬT mà bỏ trống = GIỮ NGUYÊN.
  - is_published (boolean, tùy chọn): xuất bản/ẩn deck. Khi CẬP NHẬT mà bỏ trống = GIỮ NGUYÊN (không tự bỏ ẩn deck đang ẩn).
  - description (string, tùy chọn): mô tả ngắn
  - password (string, tùy chọn): đặt mật khẩu chung cho deck (>=4 ký tự). '' = gỡ mật khẩu. Bỏ trống = giữ nguyên.
  - generate_password (boolean, tùy chọn): TỰ SINH mật khẩu ngẫu nhiên dễ đọc (dùng thay 'password'). Mật khẩu sinh ra được trả về trong kết quả để gửi cho người xem.
  - company (string, tùy chọn): tên công ty, mặc định BTMH — để phân loại ở thư viện
  - category (string, tùy chọn): danh mục deck (vd 'Nhà đầu tư', 'Đối tác', 'Nội bộ')
  - tags (string[], tùy chọn): danh sách thẻ để lọc/tìm ở thư viện
  - source_url (string, tùy chọn): link "Nguồn / Chat gốc" (vd URL cuộc chat claude.ai này) để admin mở lại chat mà chỉnh sửa deck sau
  - if_match (string, tùy chọn): KHOÁ CHỐNG GHI ĐÈ khi nhiều phiên cùng sửa 1 deck. Bỏ trống = không khoá (như cũ). "new" = chỉ tạo mới, slug đã có sẽ báo lỗi. <md5> = md5 nội dung bạn nghĩ đang có trên server (lấy từ 'content_md5' của lần publish/đọc trước); nếu server đã đổi thì publish bị TỪ CHỐI (không ghi gì) và trả về md5 mới để bạn đọc lại rồi rebase.

Ảnh preview (chụp slide đầu) được TỰ ĐỘNG tạo sau khi publish.

Returns JSON: { "ok": true, "slug": string, "url": string, "has_password": boolean, "content_md5": string, "content_len": number, "password"?: string }
Nếu if_match không khớp: HTTP 409, body { "error": "conflict", "reason": "md5_mismatch"|"slug_exists", "current_md5", "current_len", "current_updated_at" } — KHÔNG ghi gì.

Lưu ý: gọi lại cùng slug = cập nhật (ghi đè nội dung) deck đó. Khi cập nhật, những thứ KHÔNG truyền lại được
GIỮ NGUYÊN: mật khẩu chung, link "Nguồn / Chat gốc" (source_url), phân quyền (visibility/require_otp/is_published),
danh mục/thẻ, và MỌI link cá nhân đã cấp (grants) + nhóm. Mật khẩu chỉ trả về 1 lần khi vừa đặt/sinh.`,
      inputSchema: {
        slug: z
          .string()
          .regex(/^[a-z0-9][a-z0-9-]{0,80}$/, 'slug chỉ gồm a-z, 0-9 và gạch nối')
          .describe("Định danh URL, vd 'btmh-investor-2026'"),
        title: z.string().min(1).describe('Tiêu đề deck'),
        html: z.string().min(20).describe('Toàn bộ HTML self-contained của deck'),
        visibility: z
          .enum(['public', 'protected'])
          .optional()
          .describe("'public' hoặc 'protected'. TẠO MỚI: mặc định 'protected'. CẬP NHẬT: bỏ trống = giữ nguyên"),
        require_otp: z
          .boolean()
          .optional()
          .describe('Bắt OTP email (chỉ deck protected). CẬP NHẬT: bỏ trống = giữ nguyên'),
        is_published: z
          .boolean()
          .optional()
          .describe('Xuất bản/ẩn deck. CẬP NHẬT: bỏ trống = giữ nguyên (không tự bỏ ẩn)'),
        description: z.string().optional().describe('Mô tả ngắn (tùy chọn)'),
        password: z
          .string()
          .optional()
          .describe('Đặt mật khẩu chung cho deck (>=4 ký tự); "" = gỡ; bỏ trống = giữ nguyên'),
        generate_password: z
          .boolean()
          .optional()
          .describe('Tự sinh mật khẩu ngẫu nhiên dễ đọc (thay cho password). Mật khẩu sinh ra trả về trong kết quả'),
        company: z.string().optional().describe('Tên công ty (mặc định BTMH) — để phân loại ở thư viện'),
        category: z.string().optional().describe("Danh mục deck, vd 'Nhà đầu tư', 'Đối tác', 'Nội bộ'"),
        tags: z.array(z.string()).optional().describe('Danh sách thẻ (tags) để lọc/tìm, vd ["2026","chiến lược"]'),
        source_url: z
          .string()
          .optional()
          .describe('Link "Nguồn / Chat gốc" (vd URL cuộc chat claude.ai này) để admin mở lại chat mà chỉnh sửa deck sau'),
        if_match: z
          .string()
          .optional()
          .describe('Khoá chống ghi đè: bỏ trống = không khoá; "new" = chỉ tạo mới; <md5 nội dung server> = chỉ ghi nếu khớp (lệch → 409, không ghi)'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const res = await fetch(`${PORTAL_URL}/api/publish`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-publish-key': PUBLISH_KEY },
          body: JSON.stringify(args),
        });
        const data: unknown = await res.json().catch(() => ({}));
        const ok = res.ok && typeof data === 'object' && data !== null && (data as { ok?: boolean }).ok === true;
        if (!ok) {
          // 409 = lệch phiên bản (if_match không khớp): báo rõ để người gọi đọc lại + rebase + gọi lại.
          if (res.status === 409) {
            const c = data as { reason?: string; current_md5?: string; current_len?: number; current_updated_at?: string };
            return {
              content: [{
                type: 'text',
                text: `Bị từ chối do lệch phiên bản (${c.reason ?? 'conflict'}) — KHÔNG ghi gì. `
                  + `Nội dung trên server hiện tại: md5=${c.current_md5 ?? '?'}, len=${c.current_len ?? '?'}, updated_at=${c.current_updated_at ?? '?'}. `
                  + `Hãy đọc lại bản mới, rebase sửa đổi rồi publish lại với if_match=${c.current_md5 ?? '<md5 mới>'}.`,
              }],
              isError: true,
            };
          }
          return {
            content: [{ type: 'text', text: `Lỗi publish (HTTP ${res.status}): ${JSON.stringify(data)}` }],
            isError: true,
          };
        }
        const d = data as { slug: string; url: string; has_password?: boolean; password?: string; content_md5?: string; content_len?: number };
        const out = {
          ok: true as const,
          slug: d.slug,
          url: d.url,
          has_password: !!d.has_password,
          ...(d.content_md5 ? { content_md5: d.content_md5 } : {}),
          ...(typeof d.content_len === 'number' ? { content_len: d.content_len } : {}),
          ...(d.password ? { password: d.password } : {}),
        };
        const md5note = d.content_md5 ? `\n(content_md5=${d.content_md5} — dùng làm if_match cho lần publish sau)` : '';
        const text = d.password
          ? `Đã publish deck: ${d.url}\nMật khẩu deck (gửi kèm link cho người xem): ${d.password}${md5note}`
          : `Đã publish deck: ${d.url}${d.has_password ? ' (deck có mật khẩu)' : ''}${md5note}`;
        return { content: [{ type: 'text', text }], structuredContent: out };
      } catch (e) {
        return {
          content: [{ type: 'text', text: `Lỗi kết nối portal: ${e instanceof Error ? e.message : String(e)}` }],
          isError: true,
        };
      }
    },
  );

  return server;
}

const app = express();
app.use(express.json({ limit: '8mb' }));

app.get('/healthz', (_req, res) => {
  res.status(200).send('ok');
});

// Chỉ những method THỰC THI mới cần token. initialize/tools/list mở để claude.ai
// hoàn tất bước "Connect" (discovery của nó không kèm header auth). Token vẫn được
// claude.ai gửi ở các lần gọi tool -> tools/call bị gác, không token = không publish.
const AUTH_METHODS = new Set(['tools/call']);

function needsAuth(body: unknown): boolean {
  const arr = Array.isArray(body) ? body : [body];
  return arr.some((m) => typeof m === 'object' && m !== null && AUTH_METHODS.has((m as { method?: string }).method ?? ''));
}

function authorized(req: express.Request): boolean {
  return req.headers['authorization'] === `Bearer ${MCP_TOKEN}`;
}

async function handleMcp(req: express.Request, res: express.Response): Promise<void> {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on('close', () => transport.close());
  const server = buildServer();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}

const notAllowed = (_req: express.Request, res: express.Response) =>
  res.status(405).set('Allow', 'POST').json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method Not Allowed' }, id: null });

// (A) Biến thể TOKEN-TRONG-URL: dùng khi client chỉ có ô URL (vd claude.ai custom connector
//     không có ô "Request headers"). URL = https://deck.consultx.vn/mcp/<MCP_TOKEN> — path gác tất cả.
app.post('/mcp/:token', async (req, res) => {
  if (req.params.token !== MCP_TOKEN) {
    res.status(404).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Not found' }, id: null });
    return;
  }
  await handleMcp(req, res);
});
app.get('/mcp/:token', notAllowed);
app.delete('/mcp/:token', notAllowed);

// (B) Biến thể HEADER: dùng khi client có ô request header. initialize/tools/list mở, tools/call cần Bearer.
app.post('/mcp', async (req, res) => {
  if (needsAuth(req.body) && !authorized(req)) {
    res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Unauthorized: thiếu/sai header Authorization: Bearer <MCP_TOKEN>' },
      id: (req.body && (req.body as { id?: unknown }).id) ?? null,
    });
    return;
  }
  await handleMcp(req, res);
});
app.get('/mcp', notAllowed);
app.delete('/mcp', notAllowed);

app.listen(PORT, '0.0.0.0', () => {
  console.error(`deck-publisher-mcp-server lắng nghe :${PORT}/mcp`);
});
