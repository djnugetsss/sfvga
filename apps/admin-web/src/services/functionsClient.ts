import { httpsCallable } from 'firebase/functions';
import type {
  AdminRoleAssignInput,
  AdminRoleCreateInput,
  AdminRoleUpdateInput,
  EventAdminRoleAssignInput,
  EventAdminRoleCreateInput,
  EventAdminRoleUpdateInput,
} from '@sfvga/shared-validation';
import type { AdminAccessSummary, AdminRoleDefinition } from '@sfvga/shared-types';
import { getFirebaseFunctions } from './firebase';

function call<TRequest, TResponse>(name: string, data: TRequest): Promise<TResponse> {
  return httpsCallable<TRequest, TResponse>(
    getFirebaseFunctions(),
    name,
  )(data).then((result) => result.data);
}

export interface AdminMemberSummary {
  uid: string;
  displayName: string;
  phone: string;
  email?: string;
  organizationRoleId: string | null;
  isSuperAdmin: boolean;
}

/**
 * Typed callable wrappers. Most admin writes go directly to Firestore (rules gate them by the
 * admin claim); callables are used for server-only writes like granting admin roles.
 */
export const functionsClient = {
  call,
  auth: {
    getAdminAccess: () =>
      call<Record<string, never>, AdminAccessSummary>('auth_getAdminAccess', {}),
  },
  adminRoles: {
    list: () => call<Record<string, never>, AdminRoleDefinition[]>('adminRoles_list', {}),
    seedDefaults: () =>
      call<Record<string, never>, { success: boolean }>('adminRoles_seedDefaults', {}),
    create: (data: AdminRoleCreateInput) =>
      call<AdminRoleCreateInput, { roleId: string }>('adminRoles_create', data),
    update: (data: AdminRoleUpdateInput) =>
      call<AdminRoleUpdateInput, { success: boolean }>('adminRoles_update', data),
    delete: (roleId: string) =>
      call<{ roleId: string }, { success: boolean; revokedAssignments: number }>(
        'adminRoles_delete',
        { roleId },
      ),
    assign: (data: AdminRoleAssignInput) =>
      call<AdminRoleAssignInput, { success: boolean }>('adminRoles_assign', data),
    revoke: (targetUid: string) =>
      call<{ targetUid: string }, { success: boolean }>('adminRoles_revoke', { targetUid }),
    grantSuperAdmin: (targetUid: string) =>
      call<{ targetUid: string }, { success: boolean }>('adminRoles_grantSuperAdmin', {
        targetUid,
      }),
    revokeSuperAdmin: (targetUid: string) =>
      call<{ targetUid: string }, { success: boolean }>('adminRoles_revokeSuperAdmin', {
        targetUid,
      }),
    migrateLegacy: () =>
      call<
        Record<string, never>,
        { success: boolean; migratedGrants: number; migratedSuperAdmins: number }
      >('adminRoles_migrateLegacy', {}),
  },
  members: {
    count: () => call<Record<string, never>, { count: number }>('adminMembers_count', {}),
    list: (eventId?: string) =>
      call<{ eventId?: string }, AdminMemberSummary[]>(
        'adminMembers_list',
        eventId ? { eventId } : {},
      ),
  },
  eventRoles: {
    list: (eventId: string) =>
      call<{ eventId: string }, { roles: unknown[]; grants: unknown[] }>('eventAdminRoles_list', {
        eventId,
      }),
    create: (data: EventAdminRoleCreateInput) =>
      call<EventAdminRoleCreateInput, { roleId: string }>('eventAdminRoles_create', data),
    ensureTicketScanner: (eventId: string) =>
      call<{ eventId: string }, { roleId: string; created: boolean }>(
        'eventAdminRoles_ensureTicketScanner',
        { eventId },
      ),
    update: (data: EventAdminRoleUpdateInput) =>
      call<EventAdminRoleUpdateInput, { success: boolean }>('eventAdminRoles_update', data),
    delete: (eventId: string, roleId: string) =>
      call<{ eventId: string; roleId: string }, { success: boolean; revokedAssignments: number }>(
        'eventAdminRoles_delete',
        { eventId, roleId },
      ),
    assign: (data: EventAdminRoleAssignInput) =>
      call<EventAdminRoleAssignInput, { grantId: string }>('eventAdminRoles_assign', data),
    revoke: (eventId: string, grantId: string) =>
      call<{ eventId: string; grantId: string }, { success: boolean }>('eventAdminRoles_revoke', {
        eventId,
        grantId,
      }),
  },
  announcements: {
    send: (data: { title: string; body: string; eventId?: string }) =>
      call<{ title: string; body: string; eventId?: string }, { announcementId: string }>(
        'announcements_send',
        data,
      ),
  },
};
