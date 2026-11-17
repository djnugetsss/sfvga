'use client';

import { PageHeader, EmptyState } from '@/components/ui/primitives';

export default function FeedbackPage() {
  return (
    <>
      <PageHeader title="Feedback" description="Post-event member feedback summaries." />
      <EmptyState message="Feedback reports are not available yet. Check back after a future release." />
    </>
  );
}
