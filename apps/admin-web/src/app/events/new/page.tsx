'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EventForm, type EventFormSubmitPayload } from '@/components/events/EventForm';
import { useEventMutations } from '@/hooks/useEventMutations';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { hasOrganizationPermission } from '@/lib/permissions';
import { PageHeader, ErrorBanner } from '@/components/ui/primitives';
import { prepareEventCreation } from '@/lib/prepareEventCreation';

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const message = String((err as { message: unknown }).message);
    if (message) return message;
  }
  return fallback;
}

export default function NewEventPage() {
  const router = useRouter();
  const { access } = useAdminAuth();
  const { createEvent } = useEventMutations();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasOrganizationPermission(access, 'events.create')) return;
    void prepareEventCreation();
  }, [access]);

  const handleSubmit = async ({ input, media }: EventFormSubmitPayload) => {
    setError(null);
    try {
      const id = await createEvent.mutateAsync({ input, media });
      router.push(`/events/${id}`);
    } catch (err) {
      setError(errorMessage(err, "Couldn't create the event. Please try again."));
    }
  };

  return (
    <>
      {hasOrganizationPermission(access, 'events.create') ? (
        <>
          <PageHeader
            title="New event"
            description="New events are saved as drafts — publish when ready."
          />
          {error ? <ErrorBanner message={error} /> : null}
          <EventForm
            submitting={createEvent.isPending}
            submitLabel="Create event"
            onSubmit={handleSubmit}
          />
        </>
      ) : (
        <ErrorBanner message="Only an authorized organization admin can create events." />
      )}
    </>
  );
}
