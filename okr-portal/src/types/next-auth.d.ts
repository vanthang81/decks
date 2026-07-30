import type { Role } from '@/lib/rbac';

declare module 'next-auth' {
  interface Session {
    user: {
      role?: Role;
      isActive?: boolean;
      unitId?: string | null;
      displayName?: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: Role;
    isActive?: boolean;
    unitId?: string | null;
    displayName?: string | null;
  }
}
