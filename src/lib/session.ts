import { SignJWT, jwtVerify } from 'jose';

// Phiên VIEWER (khác phiên admin của Auth.js). Cookie 'deck_session', ký bằng AUTH_SECRET.
export const VIEWER_COOKIE = 'deck_session';
const TTL_SECONDS = 8 * 60 * 60; // 8h

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET missing');
  return new TextEncoder().encode(s);
}

export type ViewerSession = {
  grantId: string;
  viewerId: string;
  deckId: string;
  deckSlug: string;
  email: string;
  name: string | null;
};

export async function signViewerSession(v: ViewerSession): Promise<string> {
  return new SignJWT({ ...v })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifyViewerSession(token: string | undefined): Promise<ViewerSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      grantId: String(payload.grantId),
      viewerId: String(payload.viewerId),
      deckId: String(payload.deckId),
      deckSlug: String(payload.deckSlug),
      email: String(payload.email),
      name: (payload.name as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export const viewerCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: TTL_SECONDS,
};

// ---- Phiên MẬT KHẨU deck (đã nhập đúng pass → mở khoá deck đó, không cần link cá nhân) ----
const PW_TTL_SECONDS = 12 * 60 * 60; // 12h

// Cookie riêng theo deck để mở nhiều deck có mật khẩu cùng lúc không đè nhau.
export function deckPwCookieName(deckId: string): string {
  return `dpw_${deckId.slice(0, 8)}`;
}

export async function signDeckPwSession(deckId: string): Promise<string> {
  return new SignJWT({ d: deckId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${PW_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifyDeckPwSession(
  token: string | undefined,
  deckId: string,
): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.d === deckId;
  } catch {
    return false;
  }
}

export const deckPwCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: PW_TTL_SECONDS,
};

// ---- Token ảnh preview cho EMAIL (Gmail chặn data-URI) ----
// Ký token gắn với deckId để nhúng <img src="/api/thumb/<id>?t=..."> vào email duyệt yêu cầu.
// Không cần phiên admin; chỉ server ký được nên link không đoán/giả được. Hết hạn 30 ngày.
export async function signThumbToken(deckId: string): Promise<string> {
  return new SignJWT({ d: deckId, p: 'thumb' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
}

export async function verifyThumbToken(token: string | undefined, deckId: string): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.p === 'thumb' && payload.d === deckId;
  } catch {
    return false;
  }
}
