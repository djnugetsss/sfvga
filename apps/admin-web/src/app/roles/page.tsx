'use client';

import { RoleListEditor } from '@/components/roles/RoleListEditor';
import { RequireCapability } from '@/components/RequireCapability';

export default function RolesPage() {
  return (
    <RequireCapability capability="roles">
      <RoleListEditor />
    </RequireCapability>
  );
}
