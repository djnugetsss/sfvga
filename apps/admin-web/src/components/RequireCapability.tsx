'use client';

import React from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { hasCapability, type Capability } from '@/lib/permissions';

/**
 * Client-side capability gate for a page section. Nav already hides links the admin can't use;
 * this stops direct URL access too. Real enforcement remains in Firestore rules / callables.
 */
export function RequireCapability({
  capability,
  children,
}: {
  capability: Capability;
  children: React.ReactNode;
}) {
  const { access } = useAdminAuth();
  if (!hasCapability(access, capability)) {
    return (
      <div className="rounded-2xl border border-warmGray400/20 bg-white p-10 text-center text-warmGray400">
        You don&apos;t have permission to view this section.
      </div>
    );
  }
  return <>{children}</>;
}
