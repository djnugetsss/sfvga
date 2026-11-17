'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCreateAnnouncement, type CreateAnnouncementInput } from '@/hooks/useAnnouncements';
import { useEvents } from '@/hooks/useEvents';
import { AnnouncementComposer } from '@/components/announcements/AnnouncementComposer';
import { RequireCapability } from '@/components/RequireCapability';
import { PageHeader, ErrorBanner } from '@/components/ui/primitives';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { hasOrganizationPermission } from '@/lib/permissions';

export default function NewAnnouncementPage() {
  const router = useRouter();
  const { access } = useAdminAuth();
  const createAnnouncement = useCreateAnnouncement();
  const { data: events } = useEvents();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (input: CreateAnnouncementInput) => {
    setError(null);
    try {
      await createAnnouncement.mutateAsync(input);
      router.push('/announcements');
    } catch {
      setError("Couldn't send the announcement. Please try again.");
    }
  };

  const options = (events ?? [])
    .filter(
      (event) =>
        hasOrganizationPermission(access, 'announcements.create') ||
        access?.eventAccess.some(
          (entry) =>
            entry.eventId === event.id && entry.permissions.includes('announcements.create'),
        ),
    )
    .map((event) => ({ id: event.id, title: event.title }));

  return (
    <RequireCapability capability="announcements">
      <PageHeader title="New announcement" description="Send a message now to members." />
      {error ? <ErrorBanner message={error} /> : null}
      <AnnouncementComposer
        events={options}
        allowOrganizationWide={hasOrganizationPermission(access, 'announcements.create')}
        submitting={createAnnouncement.isPending}
        onSubmit={handleSubmit}
      />
    </RequireCapability>
  );
}
