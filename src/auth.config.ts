import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import type { AdminRole } from '@/lib/admins';

// Nền EDGE-SAFE (không import pg). Dùng cho middleware.
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
      // Middleware chỉ gác /admin/* (xem matcher ở middleware.ts) → cần có phiên hợp lệ.
      return Boolean(auth?.user);
    },
    async jwt({ token }) {
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as AdminRole) ?? 'editor';
        session.user.isActive = Boolean(token.isActive);
        session.user.displayName =
          (token.displayName as string) ?? session.user.name ?? null;
      }
      return session;
    },
  },
};
