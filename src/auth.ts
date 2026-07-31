import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';
import { getAdmin, type AdminRole } from '@/lib/admins';
import { hasAnyActiveGrant } from '@/lib/grants';

// Instance ĐẦY ĐỦ (Node runtime, chạm DB). Dùng ở server components + API.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      // Admin (allowlist) → phiên quản trị đầy đủ. Người xem được cấp (có grant còn hiệu lực) →
      // được phép có phiên để xem deck qua Google, NHƯNG isActive=false (jwt) nên bị chặn khỏi /admin và /.
      const admin = await getAdmin(email);
      if (admin?.is_active) return true;
      if (await hasAnyActiveGrant(email)) return true;
      return '/login?error=AccessDenied';
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
