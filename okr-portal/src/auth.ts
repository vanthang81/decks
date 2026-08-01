import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';
import { getUser, setUserAvatar } from '@/lib/users';
import type { Role } from '@/lib/rbac';

// Instance ĐẦY ĐỦ (Node runtime, chạm DB). Dùng ở server components + API.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      const u = await getUser(email);
      if (!u || !u.is_active) return '/login?error=AccessDenied';
      if (user.image) {
        try {
          await setUserAvatar(email, user.image);
        } catch {
          /* best-effort: lỗi avatar không chặn đăng nhập */
        }
      }
      return true;
    },
    async jwt({ token }) {
      const email = token.email?.toLowerCase();
      if (email) {
        const u = await getUser(email);
        token.role = (u?.role ?? 'staff') as Role;
        token.isActive = u?.is_active ?? false;
        token.unitId = u?.unit_id ?? null;
        token.displayName = u?.display_name ?? token.name ?? null;
      }
      return token;
    },
  },
});
