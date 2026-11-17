'use client';

import type { ReactNode } from 'react';
import type { AdminPermission } from '@sfvga/shared-types';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { hasEventPermission } from '@/lib/permissions';

export function RequireEventPermission({
  eventId,
  permission,
  children,
}: {
  eventId: string;
  permission: AdminPermission;
  children: ReactNode;
}) {
  const { access } = useAdminAuth();
  if (!hasEventPermission(access, eventId, permission)) {
    return (
      <div className="rounded-2xl border border-warmGray400/20 bg-white p-10 text-center text-warmGray400">
        You don&apos;t have permission to view this event section.
      </div>
    );
  }
  return <>{children}</>;
}
