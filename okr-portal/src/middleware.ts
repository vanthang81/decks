import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

// Gác TOÀN BỘ app bằng phiên Google (allowlist check ở signIn callback — auth.ts).
// Chưa đăng nhập → Auth.js tự đẩy về /login. Loại trừ: /login, /api/auth, asset tĩnh.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)'],
};

export default middleware((req) => {
  void req;
});
