'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAnnouncements, useDeleteAnnouncement } from '@/hooks/useAnnouncements';
import { RequireCapability } from '@/components/RequireCapability';
import { PageHeader, Spinner, EmptyState, ErrorBanner } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toDate, formatDateTime } from '@/lib/formatters';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { hasEventPermission, hasOrganizationPermission } from '@/lib/permissions';

export default function AnnouncementsPage() {
  const { access } = useAdminAuth();
  const { data: announcements, isLoading, isError, refetch } = useAnnouncements();
  const deleteAnnouncement = useDeleteAnnouncement();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setError(null);
    setBusyId(deleteTarget.id);
    try {
      await deleteAnnouncement.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      setError("Couldn't delete that announcement. Please try again.");
      setDeleteTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <RequireCapability capability="announcements">
      <PageHeader
        title="Announcements"
        actions={
          hasOrganizationPermission(access, 'announcements.create') ||
          access?.eventAccess.some((event) =>
            event.permissions.includes('announcements.create'),
          ) ? (
            <Link href="/announcements/new">
              <Button>New announcement</Button>
            </Link>
          ) : null
        }
      />

      {isError ? (
        <ErrorBanner message="Couldn't load announcements." onRetry={() => refetch()} />
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}

      {isLoading ? (
        <Spinner />
      ) : !announcements || announcements.length === 0 ? (
        <EmptyState message="No announcements yet." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <ul className="divide-y divide-border">
            {announcements.map((announcement) => {
              const created = toDate(announcement.createdAt);
              const busy = busyId === announcement.id;
              return (
                <li key={announcement.id} className="px-4 py-4 hover:bg-brandSoft/20 sm:px-5">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h2 className="text-base font-semibold text-brand">{announcement.title}</h2>
                        <span className="text-sm text-muted">
                          {created ? formatDateTime(created) : ''}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                        {announcement.body}
                      </p>
                    </div>
                    {(
                      announcement.eventId
                        ? hasEventPermission(access, announcement.eventId, 'announcements.delete')
                        : hasOrganizationPermission(access, 'announcements.delete')
                    ) ? (
                      <ActionMenu
                        label={`Actions for ${announcement.title}`}
                        disabled={busy}
                        items={[
                          {
                            id: 'delete',
                            label: 'Delete',
                            tone: 'danger',
                            disabled: busy,
                            onSelect: () =>
                              setDeleteTarget({ id: announcement.id, title: announcement.title }),
                          },
                        ]}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        tone="danger"
        title="Delete announcement?"
        description={
          <>
            Delete <strong className="font-semibold text-deepBlue">{deleteTarget?.title}</strong>?
            This cannot be undone.
          </>
        }
        confirmLabel="Delete announcement"
        loading={!!deleteTarget && busyId === deleteTarget.id}
        onConfirm={() => {
          void confirmDelete();
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </RequireCapability>
  );
}
