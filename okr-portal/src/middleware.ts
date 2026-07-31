import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

// Gác TOÀN BỘ app bằng phiên Google (allowlist check ở signIn callback — auth.ts).
// Chưa đăng nhập → Auth.js tự đẩy về /login. Loại trừ: /login, /api/auth, asset tĩnh.
export const { auth: middleware } = NextAuth(authConfig);

// Loại TOÀN BỘ /api khỏi middleware — các route API tự gác (Auth.js /api/auth,
// /api/kpi/sync gác bằng session admin HOẶC header x-sync-key cho cron).
export const config = {
  matcher: ['/((?!login|api|_next/static|_next/image|favicon.ico).*)'],
};

export default middleware((req) => {
  void req;
});
