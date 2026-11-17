import type { AdminAccessSummary } from '@sfvga/shared-types';
import { hasEventPermission, hasOrganizationPermission } from './permissions';

export function canReceiveAdminNotifications(access: AdminAccessSummary | null): boolean {
  if (
    hasOrganizationPermission(access, 'events.view') &&
    hasOrganizationPermission(access, 'events.edit')
  )
    return true;
  if (
    hasOrganizationPermission(access, 'registrations.view') &&
    hasOrganizationPermission(access, 'registrations.manage')
  )
    return true;
  return Boolean(
    access?.eventAccess.some(
      ({ eventId }) =>
        (hasEventPermission(access, eventId, 'events.view') &&
          hasEventPermission(access, eventId, 'events.edit')) ||
        (hasEventPermission(access, eventId, 'registrations.view') &&
          hasEventPermission(access, eventId, 'registrations.manage')),
    ),
  );
}
