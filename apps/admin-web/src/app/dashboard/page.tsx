'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useEvents } from '@/hooks/useEvents';
import { useMemberCount } from '@/hooks/useMembers';
import { RegistrationReviewQueue } from '@/components/registrations/RegistrationReviewQueue';
import { PageHeader, Badge, Skeleton, EmptyState, ErrorBanner } from '@/components/ui/primitives';
import { toDate } from '@/lib/formatters';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { hasCapability, hasOrganizationPermission } from '@/lib/permissions';
import { RequireCapability } from '@/components/RequireCapability';
import { prepareEventCreation } from '@/lib/prepareEventCreation';

export default function DashboardPage() {
  const { access } = useAdminAuth();
  useEffect(() => {
    if (hasOrganizationPermission(access, 'events.create')) void prepareEventCreation();
  }, [access]);
  const canViewMembers = hasCapability(access, 'members');
  const eventsQuery = useEvents();
  const membersQuery = useMemberCount(canViewMembers);

  const events = eventsQuery.data ?? [];
  const now = Date.now();
  const upcoming = events
    .filter((e) => (toDate(e.startAt)?.getTime() ?? 0) >= now)
    .sort((a, b) => (toDate(a.startAt)?.getTime() ?? 0) - (toDate(b.startAt)?.getTime() ?? 0));
  const published = events.filter((e) => e.status === 'published').length;
  return (
    <RequireCapability capability="dashboard">
      <div>
        <PageHeader
          title="Dashboard"
          description="Your events, registrations, and the work that needs attention."
          actions={hasCapability(access, 'roles') ? (
            <Link href="/roles" className="inline-flex min-h-12 items-center rounded-xl border border-border bg-surface px-4 text-base font-semibold text-brand hover:bg-brandSoft">
              Manage access
            </Link>
          ) : undefined}
        />

        {eventsQuery.isError ? (
          <ErrorBanner message="Couldn't load events." onRetry={() => eventsQuery.refetch()} />
        ) : null}
        {membersQuery.isError ? (
          <ErrorBanner message="Couldn't load members." onRetry={() => membersQuery.refetch()} />
        ) : null}
        {eventsQuery.isLoading ? (
          <div role="status" aria-label="Loading dashboard" className="space-y-8">
            <div className="grid grid-cols-2 gap-5 border-y border-border py-5 sm:grid-cols-4">
              {Array.from({ length: canViewMembers ? 4 : 3 }, (_, item) => item).map((item) => (
                <div key={item} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-12" />
                </div>
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-5 w-14" />
                </div>
                {[0, 1, 2].map((item) => (
                  <div key={item} className="flex min-h-20 items-center gap-3 border-t border-border py-3">
                    <Skeleton className="h-14 w-14 shrink-0" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-4 w-4/5" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <Skeleton className="h-6 w-3/4" />
                <div className="my-4 grid grid-cols-2 gap-3">
                  {[0, 1].map((item) => <Skeleton key={item} className="h-24 w-full rounded-xl" />)}
                </div>
                {[0, 1].map((item) => (
                  <div key={item} className="space-y-2 border-t border-border py-4">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <dl className="mb-8 grid grid-cols-2 gap-x-5 gap-y-5 border-y border-border py-6 text-base sm:grid-cols-4">
              {[
                ['Total events', events.length],
                ['Published', published],
                ['Upcoming', upcoming.length],
                ...(canViewMembers
                  ? [['Members', membersQuery.isLoading ? '…' : (membersQuery.data?.count ?? '—')]]
                  : []),
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-muted">{label}</dt>
                  <dd className="mt-2 text-[28px] font-semibold leading-none text-brand">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="min-w-0">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-brand">Upcoming events</h2>
                  <Link
                    href="/events"
                    className="inline-flex min-h-11 items-center text-sm font-medium text-brand"
                  >
                    View all
                  </Link>
                </div>
                {upcoming.length === 0 ? (
                  <EmptyState message="No upcoming events." />
                ) : (
                  <ul className="flex flex-col divide-y divide-border border-y border-border">
                    {upcoming.slice(0, 5).map((event) => {
                      const start = toDate(event.startAt);
                      return (
                        <li key={event.id} className="flex min-h-20 items-center gap-3 py-3">
                          <div
                            className="flex w-14 shrink-0 flex-col items-center rounded-lg border border-border bg-surfaceMuted py-2 text-brand"
                            aria-hidden="true"
                          >
                            <span className="text-xs font-semibold uppercase tracking-wide">
                              {start
                                ? new Intl.DateTimeFormat('en-US', {
                                    timeZone: 'America/Los_Angeles',
                                    month: 'short',
                                  }).format(start)
                                : 'TBD'}
                            </span>
                            <span className="text-xl font-semibold leading-tight">
                              {start
                                ? new Intl.DateTimeFormat('en-US', {
                                    timeZone: 'America/Los_Angeles',
                                    day: 'numeric',
                                  }).format(start)
                                : '—'}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/events/${event.id}`}
                              className="block break-words text-base font-semibold text-brand hover:underline"
                            >
                              {event.title}
                            </Link>
                            <p className="mt-1 text-base text-muted">
                              {start
                                ? new Intl.DateTimeFormat('en-US', {
                                    timeZone: 'America/Los_Angeles',
                                    weekday: 'short',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    timeZoneName: 'short',
                                  }).format(start)
                                : 'Date to be announced'}
                              {event.location?.name ? ` · ${event.location.name}` : ''}
                            </p>
                          </div>
                          <Badge tone={event.status === 'published' ? 'success' : 'neutral'}>
                            {event.status === 'published' ? 'Published' : 'Draft'}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <RegistrationReviewQueue events={events} />
            </div>
          </>
        )}
      </div>
    </RequireCapability>
  );
}
