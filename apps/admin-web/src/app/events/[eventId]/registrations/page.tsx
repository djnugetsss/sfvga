'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { EventNavigation } from '@/components/events/EventNavigation';
import { useMemo } from 'react';
import { useEvent } from '@/hooks/useEvent';
import { useRegistrations } from '@/hooks/useRegistrations';
import { useEventTickets } from '@/hooks/useEventTickets';
import { RegistrationTable } from '@/components/registrations/RegistrationTable';
import { RequireEventPermission } from '@/components/RequireEventPermission';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { hasEventPermission } from '@/lib/permissions';
import { PageHeader, Skeleton, ErrorBanner } from '@/components/ui/primitives';

export default function EventRegistrationsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { access } = useAdminAuth();
  const {
    data: event,
    isLoading: eventLoading,
    isError: eventError,
    refetch: refetchEvent,
  } = useEvent(eventId);
  const { data: registrations, isLoading, isError, refetch } = useRegistrations(eventId);
  const registrationIds = useMemo(() => (registrations ?? []).map((r) => r.id), [registrations]);
  const { data: ticketsByRegistration } = useEventTickets(eventId, registrationIds);
  return (
    <RequireEventPermission eventId={eventId} permission="registrations.view">
      <PageHeader
        title="Registrations"
        description={event ? `${event.title} — manage registrations and tickets` : 'Loading event…'}
        actions={
          <Link href={`/events/${eventId}`} className="text-sm font-medium text-accentStrong">
            Back to event
          </Link>
        }
      />

      <EventNavigation eventId={eventId} />
      {eventError ? (
        <ErrorBanner message="Couldn't load event details." onRetry={() => refetchEvent()} />
      ) : null}
      {eventLoading && !event ? <Skeleton className="mb-5 h-5 w-40" /> : null}

      {isError ? (
        <ErrorBanner message="Couldn't load registrations." onRetry={() => refetch()} />
      ) : null}

      {isLoading ? (
        <div
          role="status"
          aria-label="Loading registrations"
          className="space-y-4"
        >
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-12 w-64 max-w-full" />
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-12 w-24" />
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[32px_1.5fr_1fr_1fr_1fr_72px_1fr] items-center gap-4 border-b border-border px-4 py-3">
                {[0, 1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} className="h-4 w-full" />)}
              </div>
              {[0, 1, 2].map((row) => (
                <div key={row} className="grid min-h-20 grid-cols-[32px_1.5fr_1fr_1fr_1fr_72px_1fr] items-center gap-4 border-b border-border px-4 py-3 last:border-0">
                  <Skeleton className="h-8 w-8" />
                  <div className="space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-3 w-1/3" /></div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-7 w-full rounded-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <RegistrationTable
          eventId={eventId}
          canManage={hasEventPermission(access, eventId, 'registrations.manage')}
          registrations={registrations ?? []}
          eventTitle={event?.title ?? 'event'}
          ticketsByRegistration={ticketsByRegistration}
        />
      )}
    </RequireEventPermission>
  );
}
