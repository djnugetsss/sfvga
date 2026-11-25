'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Event } from '@sfvga/shared-types';
import { useEvents } from '@/hooks/useEvents';
import { useEventMutations } from '@/hooks/useEventMutations';
import { EventList } from '@/components/events/EventList';
import { DuplicateEventDialog } from '@/components/events/DuplicateEventDialog';
import { RequireCapability } from '@/components/RequireCapability';
import { PageHeader, Skeleton, EmptyState, ErrorBanner } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { hasEventPermission, hasOrganizationPermission } from '@/lib/permissions';
import { toDate } from '@/lib/formatters';

export default function EventsPage() {
  const { access } = useAdminAuth();
  const { data: events, isLoading, isError, refetch } = useEvents();
  const { setEventStatus, duplicateEvent, deleteEvent } = useEventMutations();
  const [dupTarget, setDupTarget] = useState<Event | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const [deleteError, setDeleteError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const upcoming = (events ?? [])
    .filter((event) => {
      const end = toDate(event.endAt)?.getTime() ?? 0;
      return event.status !== 'ended' && (end === 0 || end > now);
    })
    .sort(
      (a, b) =>
        (toDate(a.startAt)?.getTime() ?? Number.POSITIVE_INFINITY) -
        (toDate(b.startAt)?.getTime() ?? Number.POSITIVE_INFINITY),
    );
  const upcomingIds = new Set(upcoming.map((event) => event.id));
  const past = (events ?? []).filter((event) => !upcomingIds.has(event.id));
  const visibleEvents = filter === 'upcoming' ? upcoming : past;

  const togglePublish = async (event: Event) => {
    setBusyId(event.id);
    try {
      await setEventStatus.mutateAsync({
        eventId: event.id,
        status: event.status === 'published' ? 'draft' : 'published',
      });
    } finally {
      setBusyId(null);
    }
  };

  const confirmDuplicate = async () => {
    if (!dupTarget) return;
    setBusyId(dupTarget.id);
    try {
      await duplicateEvent.mutateAsync(dupTarget.id);
      setDupTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await deleteEvent.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteError(false);
    } catch {
      setDeleteError(true);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <RequireCapability capability="events">
      <PageHeader
        title="Events"
        actions={
          hasOrganizationPermission(access, 'events.create') ? (
            <Link href="/events/new">
              <Button>New event</Button>
            </Link>
          ) : null
        }
      />

      {isError ? <ErrorBanner message="Couldn't load events." onRetry={() => refetch()} /> : null}

      {!isLoading && !!events?.length ? (
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Event period">
          {(['upcoming', 'past'] as const).map((period) => (
            <button
              key={period}
              type="button"
              aria-pressed={filter === period}
              onClick={() => setFilter(period)}
              className={`min-h-12 rounded-xl border px-5 text-base font-semibold transition-colors ${filter === period ? 'border-brand/25 bg-brandSoft text-brand' : 'border-border bg-surface text-muted hover:text-ink'}`}
            >
              {period === 'upcoming' ? 'Upcoming' : 'Past'} (
              {period === 'upcoming' ? upcoming.length : past.length})
            </button>
          ))}
        </div>
      ) : null}

      {isLoading ? (
        <div role="status" aria-label="Loading events">
          <div className="mb-5 flex gap-2">
            <Skeleton className="h-12 w-32 rounded-xl" />
            <Skeleton className="h-12 w-24 rounded-xl" />
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_80px_32px] gap-4 border-b border-border bg-surfaceMuted/55 px-4 py-3">
              {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-4 w-full" />)}
            </div>
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="grid min-h-20 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_80px_32px] items-center gap-4 border-b border-border px-4 py-3 last:border-0">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : !events || events.length === 0 ? (
        <EmptyState message="No events yet. Create your first event." />
      ) : visibleEvents.length === 0 ? (
        <EmptyState
          message={filter === 'upcoming' ? 'No upcoming events.' : 'No past events yet.'}
        />
      ) : (
        <EventList
          events={visibleEvents}
          onTogglePublish={togglePublish}
          onDuplicate={(event) => setDupTarget(event)}
          onDelete={(event) => {
            setDeleteError(false);
            setDeleteTarget(event);
          }}
          busyId={busyId}
          canEdit={(eventId) => hasEventPermission(access, eventId, 'events.edit')}
          canPublish={(eventId) => hasEventPermission(access, eventId, 'events.publish')}
          canDelete={() => hasOrganizationPermission(access, 'events.delete')}
          canManageRegistrations={(eventId) =>
            hasEventPermission(access, eventId, 'registrations.view')
          }
          canManageStaff={(eventId) => hasEventPermission(access, eventId, 'staff.view')}
          canMessage={(eventId) =>
            hasEventPermission(access, eventId, 'registrations.view') &&
            hasEventPermission(access, eventId, 'registrations.manage')
          }
        />
      )}

      <DuplicateEventDialog
        open={!!dupTarget}
        eventTitle={dupTarget?.title ?? ''}
        loading={!!dupTarget && busyId === dupTarget.id}
        onConfirm={confirmDuplicate}
        onCancel={() => setDupTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        tone="danger"
        title="Delete event?"
        description={
          <>
            Delete <strong className="font-semibold text-deepBlue">{deleteTarget?.title}</strong>?
            This cannot be undone. Registrations, private messages, tickets, announcements, and
            volunteer roles for this event will be deleted too.
            {deleteError ? (
              <span className="mt-3 block font-semibold text-error" role="alert">
                Couldn’t delete this event. Please try again or contact an administrator.
              </span>
            ) : null}
          </>
        }
        confirmLabel="Delete event"
        loading={!!deleteTarget && busyId === deleteTarget.id}
        onConfirm={() => {
          void confirmDelete();
        }}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(false);
        }}
      />
    </RequireCapability>
  );
}
