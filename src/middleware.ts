import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

// Chỉ gác /admin/* bằng phiên Google (allowlist check ở signIn callback — auth.ts).
// Viewer (/v, /d) dùng cơ chế phiên riêng (cookie jose), KHÔNG qua đây.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ['/admin/:path*'],
};

export default middleware((req) => {
  // authorized callback (auth.config) đã quyết định; nếu chưa auth, Auth.js tự redirect /login.
  void req;
});
