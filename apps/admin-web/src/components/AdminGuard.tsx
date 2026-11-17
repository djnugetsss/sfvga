'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthContext } from '@/providers/AuthProvider';
import { AdminShell } from '@/components/layout/AdminShell';
import { Spinner } from '@/components/ui/primitives';
import { isEmbeddedInMemberApp, notifyMemberAppClosed } from '@/lib/adminAppReturn';
import { defaultAdminPath } from '@/lib/permissions';

/** Routes reachable without an authenticated, verified admin session. */
const PUBLIC_PREFIXES = ['/session', '/login', '/forgot-password', '/bootstrap'];

function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Centralized protected navigation for the admin dashboard. A user may view the dashboard
 * only after the member app supplies a short-lived Firebase custom token and the server
 * resolves at least one current organization or event permission.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, firebaseUser, isAdmin, access } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();

  const publicPath = isPublicPath(pathname);
  const isAuthorized = !!firebaseUser && isAdmin;

  useEffect(() => {
    if (isLoading) return;

    if (publicPath) {
      // Already fully authorized users shouldn't sit on the login screen.
      if (isAuthorized) router.replace(defaultAdminPath(access));
      return;
    }

    if (!firebaseUser) {
      // Embedded in the member app — close admin view instead of showing /login.
      if (isEmbeddedInMemberApp()) {
        notifyMemberAppClosed();
        return;
      }
      router.replace('/session');
    } else if (!isAdmin) {
      if (isEmbeddedInMemberApp()) notifyMemberAppClosed();
      else router.replace('/session?forbidden=1');
    }
  }, [access, isLoading, publicPath, isAuthorized, firebaseUser, isAdmin, router]);

  if (isLoading) return <Spinner label="Loading…" />;
  if (publicPath) return <>{children}</>;
  if (isAuthorized) return <AdminShell>{children}</AdminShell>;
  return <Spinner label="Loading…" />;
}
