'use client';

import { useAuthContext, type AuthContextValue } from '@/providers/AuthProvider';

/**
 * useAdminAuth — read the current admin auth state (signed in, admin claim, email
 * verified). Route protection/redirects are centralized in <AdminGuard>; this hook is for
 * components that need to read the state (e.g. hide Super-Admin-only UI).
 */
export function useAdminAuth(): AuthContextValue {
  return useAuthContext();
}
