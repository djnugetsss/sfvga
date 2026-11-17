'use client';

import { RoleListEditor } from '@/components/roles/RoleListEditor';
import { RequireCapability } from '@/components/RequireCapability';
import { PageHeader } from '@/components/ui/primitives';

export default function RolesPage() {
  return (
    <RequireCapability capability="roles">
      <PageHeader title="Organization roles" />
      <RoleListEditor />
    </RequireCapability>
  );
}
