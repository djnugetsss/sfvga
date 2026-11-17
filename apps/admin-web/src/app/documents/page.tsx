'use client';

import { PageHeader, EmptyState } from '@/components/ui/primitives';

export default function DocumentsPage() {
  return (
    <>
      <PageHeader title="Documents" description="Shared files for board members and volunteers." />
      <EmptyState message="The document library is not available yet. Check back after a future release." />
    </>
  );
}
