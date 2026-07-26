import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';
import { getAdmin, type AdminRole } from '@/lib/admins';

// Instance ĐẦY ĐỦ (Node runtime, chạm DB). Dùng ở server components + API.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      const admin = await getAdmin(email);
      if (!admin || !admin.is_active) return '/login?error=AccessDenied';
      return true;
    },
    async jwt({ token }) {
      const email = token.email?.toLowerCase();
      if (email) {
        const admin = await getAdmin(email);
        token.role = (admin?.role ?? 'editor') as AdminRole;
        token.isActive = admin?.is_active ?? false;
        token.displayName = admin?.display_name ?? token.name ?? null;
      }
      return token;
    },
  },
});
