import type { AdminAccessSummary, AdminPermission } from '@sfvga/shared-types';

/**
 * Coarse admin capabilities mapped to admin levels (Architecture §6 role matrix). This is the
 * client-side gate for nav/route visibility; Firestore rules + callables remain the real
 * enforcement. Deliberately simple — no fine-grained permission matrix (see "keep it simple").
 */
export type Capability =
  'dashboard' | 'events' | 'registrations' | 'announcements' | 'roles' | 'members' | 'grantAdmin';

const CAPABILITY_PERMISSIONS: Partial<Record<Capability, AdminPermission[]>> = {
  dashboard: ['dashboard.view'],
  events: ['events.view', 'events.create', 'events.edit'],
  registrations: ['registrations.view', 'registrations.manage'],
  announcements: ['announcements.view', 'announcements.create', 'announcements.edit'],
  members: ['members.view'],
};

export function effectivePermissions(access: AdminAccessSummary | null): AdminPermission[] {
  if (!access) return [];
  return Array.from(
    new Set([
      ...(access.organizationRole?.permissions ?? []),
      ...access.eventAccess.flatMap((event) => event.permissions),
    ]),
  );
}

export function defaultAdminPath(access: AdminAccessSummary | null): string {
  if (hasCapability(access, 'dashboard')) return '/dashboard';
  if (hasCapability(access, 'events')) return '/events';
  if (hasCapability(access, 'announcements')) return '/announcements';
  if (hasCapability(access, 'members')) return '/members';
  const registrationEvent = access?.eventAccess.find((event) =>
    event.permissions.includes('registrations.view'),
  );
  if (registrationEvent) return `/events/${registrationEvent.eventId}/registrations`;
  const staffEvent = access?.eventAccess.find((event) => event.permissions.includes('staff.view'));
  if (staffEvent) return `/events/${staffEvent.eventId}/staff`;
  return '/events';
}

export function hasOrganizationPermission(
  access: AdminAccessSummary | null,
  permission: AdminPermission,
): boolean {
  return Boolean(
    access?.isSuperAdmin || access?.organizationRole?.permissions.includes(permission),
  );
}

export function hasEventPermission(
  access: AdminAccessSummary | null,
  eventId: string,
  permission: AdminPermission,
): boolean {
  return Boolean(
    hasOrganizationPermission(access, permission) ||
    access?.eventAccess.some(
      (event) => event.eventId === eventId && event.permissions.includes(permission),
    ),
  );
}

export function hasCapability(access: AdminAccessSummary | null, capability: Capability): boolean {
  if (access?.isSuperAdmin) return true;
  if (capability === 'roles' || capability === 'grantAdmin') return hasOrganizationPermission(access, 'roles.manage');
  const permissions = effectivePermissions(access);
  return (CAPABILITY_PERMISSIONS[capability] ?? []).some((permission) =>
    permissions.includes(permission),
  );
}

export function adminAccessLabel(access: AdminAccessSummary | null): string {
  if (access?.isSuperAdmin) return access.superAdminRoleName || 'Super Admin';
  if (access?.organizationRole) return access.organizationRole.name;
  if (access?.eventAccess.length) {
    return access.eventAccess.length === 1
      ? access.eventAccess[0].roleName
      : `${access.eventAccess.length} event roles`;
  }
  return 'Admin';
}
