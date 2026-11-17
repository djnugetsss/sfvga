'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/providers/AuthProvider';
import { Spinner } from '@/components/ui/primitives';
import { defaultAdminPath } from '@/lib/permissions';

/** Auth-aware landing redirect (Architecture §5 — admin dashboard entry). */
export function HomeRedirect() {
  const { isLoading, firebaseUser, isAdmin, access } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (firebaseUser && isAdmin) {
      router.replace(defaultAdminPath(access));
    } else {
      router.replace('/session');
    }
  }, [access, firebaseUser, isAdmin, isLoading, router]);

  return <Spinner label="Loading…" />;
}
