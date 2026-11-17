'use client';
import Link from 'next/link';
import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { fetchEventAdminRoles } from '@/hooks/useEventAdminRoles';
import { functionsClient } from '@/services/functionsClient';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { hasEventPermission } from '@/lib/permissions';

export function EventNavigation({ eventId, actions }: { eventId: string; actions?: ReactNode }) {
  const { access } = useAdminAuth();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const canViewStaff = hasEventPermission(access, eventId, 'staff.view');
  useEffect(() => {
    if (!canViewStaff || pathname === `/events/${eventId}/staff`) return;
    void queryClient.prefetchQuery({
      queryKey: ['admin', 'eventRoles', eventId],
      queryFn: () => fetchEventAdminRoles(eventId),
      staleTime: 5 * 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: ['admin', 'members', eventId],
      queryFn: () => functionsClient.members.list(eventId),
      staleTime: 5 * 60_000,
    });
  }, [canViewStaff, eventId, pathname, queryClient]);
  const items = [
    {
      label: 'Event details',
      path: '',
      allowed: hasEventPermission(access, eventId, 'events.view'),
    },
    {
      label: 'Registrations',
      path: '/registrations',
      allowed: hasEventPermission(access, eventId, 'registrations.view'),
    },
    {
      label: 'Messages',
      path: '/messages',
      allowed:
        hasEventPermission(access, eventId, 'registrations.view') &&
        hasEventPermission(access, eventId, 'registrations.manage'),
    },
    { label: 'Staff', path: '/staff', allowed: canViewStaff },
  ];
  return (
    <nav
      aria-label="Event sections"
      className="mb-6 flex flex-wrap items-center gap-2 border-b border-border pb-3"
    >
      {items
        .filter((item) => item.allowed)
        .map((item) => {
          const href = `/events/${eventId}${item.path}`;
          return (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              className={`inline-flex min-h-12 items-center rounded-lg px-4 text-sm font-semibold ${pathname === href ? 'bg-brandSoft text-brand' : 'text-muted hover:bg-surfaceMuted'}`}
            >
              {item.label}
            </Link>
          );
        })}
      {actions ? <div className="ml-auto flex flex-wrap items-center gap-3">{actions}</div> : null}
    </nav>
  );
}
