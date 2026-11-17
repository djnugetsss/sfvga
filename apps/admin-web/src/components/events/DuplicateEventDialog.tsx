'use client';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface DuplicateEventDialogProps {
  open: boolean;
  eventTitle: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation for "Duplicate this event" (Architecture §16 quick action). The copy is created
 * as a draft with a "Copy of …" title so it never accidentally goes live.
 */
export function DuplicateEventDialog({
  open,
  eventTitle,
  loading,
  onConfirm,
  onCancel,
}: DuplicateEventDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title="Duplicate event"
      description={
        <>
          Create a draft copy of{' '}
          <strong className="font-semibold text-deepBlue">{eventTitle}</strong>? You can edit the
          dates and details before publishing.
        </>
      }
      confirmLabel="Create draft copy"
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
