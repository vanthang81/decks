import type { AdminRole } from '@/lib/admins';

declare module 'next-auth' {
  interface Session {
    user: {
      role?: AdminRole;
      isActive?: boolean;
      displayName?: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: AdminRole;
    isActive?: boolean;
    displayName?: string | null;
  }
}
