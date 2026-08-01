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
    async jwt({ token, user }) {
      // Ưu tiên ảnh từ profile Google lúc mới đăng nhập; nếu không có thì
      // dùng picture đã lưu trong JWT (các phiên cũ vẫn mang picture).
      const pic =
        (user && typeof user.image === 'string' ? user.image : null) ??
        (typeof token.picture === 'string' ? token.picture : null);
      const email = token.email?.toLowerCase();
      if (email) {
        const u = await getUser(email);
        token.role = (u?.role ?? 'staff') as Role;
        token.isActive = u?.is_active ?? false;
        token.unitId = u?.unit_id ?? null;
        token.displayName = u?.display_name ?? token.name ?? null;
        // Backfill avatar cho comment/thông báo — không cần đăng nhập lại.
        if (pic && u && u.avatar_url !== pic) {
          try {
            await setUserAvatar(email, pic);
          } catch {
            /* best-effort */
          }
        }
      }
      return token;
    },
  },
});
