'use client';

import { PageHeader, EmptyState } from '@/components/ui/primitives';

export default function GalleryPage() {
  return (
    <>
      <PageHeader title="Gallery" description="Review and approve member-submitted event photos." />
      <EmptyState message="Gallery moderation is not available yet. Check back after a future release." />
    </>
  );
}
