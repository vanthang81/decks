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
