'use client';

import { EventNavigation } from '@/components/events/EventNavigation';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useEvent } from '@/hooks/useEvent';
import { useEventMutations } from '@/hooks/useEventMutations';
import { EventForm, type EventFormSubmitPayload } from '@/components/events/EventForm';
import { RequireEventPermission } from '@/components/RequireEventPermission';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { hasEventPermission } from '@/lib/permissions';
import { PageHeader, Skeleton, EmptyState, ErrorBanner, Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { functionsClient } from '@/services/functionsClient';

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const message = String((err as { message: unknown }).message);
    if (message) return message;
  }
  return fallback;
}

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { access } = useAdminAuth();
  const canEdit = hasEventPermission(access, eventId, 'events.edit');
  const canPublish = hasEventPermission(access, eventId, 'events.publish');
  useEffect(() => {
    if (!canEdit || !eventId) return;
    void Promise.resolve()
      .then(() => functionsClient.call('events_update', { eventId, prepare: true }))
      .catch(() => undefined);
  }, [canEdit, eventId]);
  const { data: event, isLoading, isError, refetch } = useEvent(eventId);
  const { updateEvent, setEventStatus } = useEventMutations();
  const [error, setError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const handleSubmit = async ({ input, media }: EventFormSubmitPayload) => {
    setError(null);
    setSaveNotice(null);
    try {
      const result = await updateEvent.mutateAsync({ eventId, input, media });
      const notify = result.photoNotify;
      if (notify?.announced) {
        if (notify.registrantCount === 0) {
          setSaveNotice(
            'Changes saved. Photo announcement posted in the app, but this event has no registrations yet — nobody to notify.',
          );
        } else {
          setSaveNotice(
            `Changes saved. Announcement posted for ${notify.registrantCount} registered member${notify.registrantCount === 1 ? '' : 's'} (visible under Announcements / this event). Phone push alerts also need Cloud Functions deployed and notifications enabled in the member app.`,
          );
        }
      } else {
        setSaveNotice('Changes saved.');
      }
    } catch (err) {
      setError(errorMessage(err, "Couldn't save changes. Please try again."));
    }
  };

  const togglePublish = async () => {
    if (!event) return;
    setError(null);
    setSaveNotice(null);
    try {
      await setEventStatus.mutateAsync({
        eventId,
        status: event.status === 'published' ? 'draft' : 'published',
      });
    } catch (err) {
      setError(errorMessage(err, "Couldn't update the event status. Please try again."));
    }
  };

  return (
    <RequireEventPermission eventId={eventId} permission="events.view">
      {isLoading ? (
        <div role="status" aria-label="Loading event details" className="space-y-5">
          <Skeleton className="h-9 w-2/3 max-w-96" />
          <Skeleton className="h-5 w-3/4 max-w-md" />
          <div className="flex flex-wrap gap-2 border-b border-border pb-3">
            {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-12 w-28" />)}
          </div>
          <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {[0, 1].map((item) => (
              <div key={item} className="space-y-4 rounded-xl border border-border bg-surface p-5">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        </div>
      ) : isError ? (
        <>
          <ErrorBanner message="Couldn't load this event." onRetry={() => refetch()} />
          <EmptyState message="We couldn't load this event. Check your connection and try again." />
        </>
      ) : !event ? (
        <EmptyState message="Event not found." />
      ) : (
        <>
          <PageHeader
            title={event.title}
            description="Edit details, media, and the post-event photo album link."
          />
          <EventNavigation
            eventId={eventId}
            actions={
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={event.status === 'published' ? 'success' : 'neutral'}>
                  {event.status}
                </Badge>
                {event.status !== 'ended' && canPublish ? (
                  <Button
                    type="button"
                    variant={event.status === 'published' ? 'secondary' : 'primary'}
                    loading={setEventStatus.isPending}
                    onClick={() => {
                      void togglePublish();
                    }}
                  >
                    {event.status === 'published' ? 'Unpublish' : 'Publish'}
                  </Button>
                ) : null}
              </div>
            }
          />
          {error ? <ErrorBanner message={error} /> : null}
          {saveNotice ? (
            <p className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-deepBlue">
              {saveNotice}
            </p>
          ) : null}
          {canEdit ? (
            <EventForm
              key={`${event.id}-${event.updatedAt?.seconds ?? ''}-${event.updatedAt?.nanoseconds ?? ''}`}
              event={event}
              submitting={updateEvent.isPending}
              submitLabel="Save changes"
              onSubmit={handleSubmit}
            />
          ) : (
            <EmptyState message="You have view-only access to this event." />
          )}
        </>
      )}
    </RequireEventPermission>
  );
}
