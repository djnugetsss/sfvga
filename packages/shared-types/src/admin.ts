import type { FirestoreTimestamp } from './user';

export const ADMIN_PERMISSIONS = [
  'dashboard.view',
  'events.view',
  'events.create',
  'events.edit',
  'events.publish',
  'events.delete',
  'registrations.view',
  'registrations.manage',
  'tickets.scan',
  'tickets.revoke',
  'staff.view',
  'staff.assign',
  'staff.revoke',
  'announcements.view',
  'announcements.create',
  'announcements.edit',
  'announcements.delete',
  'gallery.view',
  'gallery.manage',
  'members.view',
  'payments.view',
  'payments.refund',
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

/** Permissions that require opening the embedded admin dashboard (scan-only roles use the scanner). */
export const ADMIN_DASHBOARD_PERMISSIONS = ADMIN_PERMISSIONS.filter(
  (permission) => permission !== 'tickets.scan',
);

export const EVENT_ADMIN_PERMISSIONS = [
  'dashboard.view',
  'events.view',
  'events.edit',
  'events.publish',
  'registrations.view',
  'registrations.manage',
  'tickets.scan',
  'tickets.revoke',
  'staff.view',
  'staff.assign',
  'staff.revoke',
  'announcements.view',
  'announcements.create',
  'announcements.edit',
  'announcements.delete',
  'gallery.view',
  'gallery.manage',
] as const satisfies readonly AdminPermission[];

export type EventAdminPermission = (typeof EVENT_ADMIN_PERMISSIONS)[number];

export interface AdminRoleDefinition {
  id: string;
  name: string;
  description?: string;
  permissions: AdminPermission[];
  active: boolean;
  system: boolean;
  deletedAt?: FirestoreTimestamp;
  createdBy: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface OrganizationAdminGrant {
  userId: string;
  roleId: string;
  grantedBy: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface EventAdminRoleDefinition extends AdminRoleDefinition {
  eventId: string;
}

export interface EventAdminRoleGrant {
  id: string;
  eventId: string;
  userId: string;
  roleDefinitionId: string;
  activatesAt: FirestoreTimestamp;
  expiresAt: FirestoreTimestamp;
  grantedBy: string;
  createdAt: FirestoreTimestamp;
  revokedAt?: FirestoreTimestamp;
}

export interface EventAdminAccessSummary {
  eventId: string;
  eventName: string;
  roleId: string;
  roleName: string;
  permissions: AdminPermission[];
  activatesAt: FirestoreTimestamp;
  expiresAt: FirestoreTimestamp;
}

export interface AdminAccessSummary {
  isSuperAdmin: boolean;
  /** Display name of the protected role; access remains full regardless of its saved permissions. */
  superAdminRoleName?: string;
  organizationRole: Pick<AdminRoleDefinition, 'id' | 'name' | 'permissions'> | null;
  eventAccess: EventAdminAccessSummary[];
}
