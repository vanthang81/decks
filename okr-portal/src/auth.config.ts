import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import type { Role } from '@/lib/rbac';

// Nền EDGE-SAFE (không import pg) — dùng cho middleware.
export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Ghi thẳng Google Calendar (CFO 11/08): CHỈ xin thêm scope calendar.events + offline khi đã
      // bật env GOOGLE_CALENDAR_ENABLED=1 (và cấu hình Console). Mặc định KHÔNG đổi luồng đăng nhập.
      authorization:
        process.env.GOOGLE_CALENDAR_ENABLED === '1'
          ? {
              params: {
                scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
                access_type: 'offline',
                prompt: 'consent',
              },
            }
          : undefined,
    }),
  ],
  pages: { signIn: '/login', error: '/login' },
  callbacks: {
    authorized({ auth }) {
      // Mọi trang (trừ /login, /api/auth) đều cần phiên hợp lệ — xem matcher middleware.ts.
      return Boolean(auth?.user);
    },
    async jwt({ token }) {
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as Role) ?? 'staff';
        session.user.isActive = Boolean(token.isActive);
        session.user.unitId = (token.unitId as string | null) ?? null;
        session.user.displayName = (token.displayName as string) ?? session.user.name ?? null;
      }
      return session;
    },
  },
};
