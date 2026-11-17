'use client';

import { PageHeader, EmptyState } from '@/components/ui/primitives';
import { RequireCapability } from '@/components/RequireCapability';

export default function SettingsPage() {
  return (
    <RequireCapability capability="grantAdmin">
      <PageHeader title="Settings" description="Admin account management." />
      <EmptyState message="Account management is not available yet. Contact a Super Admin for changes." />
    </RequireCapability>
  );
}
