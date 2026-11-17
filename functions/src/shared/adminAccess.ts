import type { CallableRequest } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type {
  AdminAccessSummary,
  AdminPermission,
  AdminRoleDefinition,
  EventAdminAccessSummary,
  EventAdminRoleDefinition,
  EventAdminRoleGrant,
  OrganizationAdminGrant,
} from '@sfvga/shared-types';
import { errors } from './errors';
import { requireAuth } from './requireAuth';

const LEGACY_PERMISSIONS: Record<string, AdminPermission[]> = {
  org: [
    'dashboard.view',
    'events.view',
    'events.create',
    'events.edit',
    'events.publish',
    'registrations.view',
    'registrations.manage',
    'tickets.scan',
    'tickets.revoke',
    'staff.view',
    'staff.assign',
    'staff.revoke',
    'members.view',
  ],
  content: [
    'dashboard.view',
    'announcements.view',
    'announcements.create',
    'announcements.edit',
    'announcements.delete',
    'gallery.view',
    'gallery.manage',
    'members.view',
  ],
  finance: [
    'dashboard.view',
    'registrations.view',
    'payments.view',
    'payments.refund',
    'members.view',
  ],
};

export function isSuperClaims(token: Record<string, unknown> | undefined): boolean {
  return token?.superAdmin === true || (token?.role === 'admin' && token?.adminLevel === 'super');
}

async function hasCurrentSuperAdminClaim(uid: string): Promise<boolean> {
  const user = await getAuth().getUser(uid);
  return isSuperClaims(user.customClaims);
}

function timestampMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (value && typeof value === 'object' && 'seconds' in value) {
    return Number((value as { seconds: number }).seconds) * 1000;
  }
  return 0;
}

export async function resolveAdminAccess(
  uid: string,
  token?: Record<string, unknown>,
): Promise<AdminAccessSummary> {
  const db = getFirestore();
  // Resolve the current Auth record, not a possibly stale ID-token claim. This makes
  // grants effective immediately and revocations effective even with an old token.
  // These independent reads can start together; a sequential chain adds a network
  // round trip to every event save, publish, and staff action.
  const [isSuperAdmin, grantSnap, grants] = await Promise.all([
    hasCurrentSuperAdminClaim(uid),
    db.doc(`organizationAdminGrants/${uid}`).get(),
    db.collectionGroup('roles').where('userId', '==', uid).get(),
  ]);
  const superAdminRoleName = isSuperAdmin
    ? String((await db.doc('adminRoleDefinitions/super-admin').get()).data()?.name || 'Super Admin')
    : undefined;
  let organizationRole: AdminAccessSummary['organizationRole'] = null;

  if (grantSnap.exists) {
    const grant = grantSnap.data() as OrganizationAdminGrant;
    const roleSnap = await db.doc(`adminRoleDefinitions/${grant.roleId}`).get();
    if (roleSnap.exists) {
      const role = { id: roleSnap.id, ...roleSnap.data() } as AdminRoleDefinition;
      if (role.active && !role.deletedAt) {
        organizationRole = { id: role.id, name: role.name, permissions: role.permissions };
      }
    }
  } else if (token?.role === 'admin' && typeof token.adminLevel === 'string' && !isSuperAdmin) {
    const permissions = LEGACY_PERMISSIONS[token.adminLevel];
    if (permissions) {
      organizationRole = {
        id: `legacy-${token.adminLevel}`,
        name: `${token.adminLevel} admin`,
        permissions,
      };
    }
  }

  const now = Date.now();
  const eventAccess = (
    await Promise.all(
      grants.docs.map(async (grantDoc): Promise<EventAdminAccessSummary | null> => {
        const eventRef = grantDoc.ref.parent.parent;
        if (!eventRef || eventRef.parent.id !== 'events') return null;
        const grant = {
          id: grantDoc.id,
          eventId: eventRef.id,
          ...grantDoc.data(),
        } as EventAdminRoleGrant;
        if (grant.revokedAt) return null;
        if (timestampMillis(grant.activatesAt) > now || timestampMillis(grant.expiresAt) < now)
          return null;

        const [eventSnap, roleSnap] = await Promise.all([
          eventRef.get(),
          eventRef.collection('roleDefinitions').doc(grant.roleDefinitionId).get(),
        ]);
        if (!eventSnap.exists || !roleSnap.exists) return null;
        const role = { id: roleSnap.id, ...roleSnap.data() } as EventAdminRoleDefinition;
        if (!role.active || role.deletedAt || !role.permissions?.length) return null;

        return {
          eventId: eventRef.id,
          eventName: String(eventSnap.data()?.title || 'Event'),
          roleId: role.id,
          roleName: role.name,
          permissions: role.permissions,
          activatesAt: grant.activatesAt,
          expiresAt: grant.expiresAt,
        };
      }),
    )
  ).filter((entry): entry is EventAdminAccessSummary => entry !== null);

  return { isSuperAdmin, superAdminRoleName, organizationRole, eventAccess };
}

export function hasPermission(
  access: AdminAccessSummary,
  permission: AdminPermission,
  eventId?: string,
): boolean {
  if (access.isSuperAdmin) return true;
  if (access.organizationRole?.permissions.includes(permission)) return true;
  if (!eventId) return false;
  return access.eventAccess.some(
    (event) => event.eventId === eventId && event.permissions.includes(permission),
  );
}

export function hasOrganizationPermission(
  access: AdminAccessSummary,
  permission: AdminPermission,
): boolean {
  return access.isSuperAdmin || Boolean(access.organizationRole?.permissions.includes(permission));
}

export async function requireAdminPermission(
  request: CallableRequest,
  permission: AdminPermission,
  eventId?: string,
): Promise<{ uid: string; access: AdminAccessSummary }> {
  const uid = requireAuth(request);
  if (eventId) {
    const db = getFirestore();
    // A single-event action needs only that event's grant. Loading all of a
    // person's event roles makes every message and read receipt slower as the
    // organization grows.
    const [isSuperAdmin, organizationGrant, eventGrant] = await Promise.all([
      hasCurrentSuperAdminClaim(uid),
      db.doc(`organizationAdminGrants/${uid}`).get(),
      db.doc(`events/${eventId}/roles/${uid}`).get(),
    ]);
    const minimalAccess: AdminAccessSummary = {
      isSuperAdmin,
      organizationRole: null,
      eventAccess: [],
    };
    if (isSuperAdmin) return { uid, access: minimalAccess };
    if (organizationGrant.exists) {
      const grant = organizationGrant.data() as OrganizationAdminGrant;
      const roleSnap = await db.doc(`adminRoleDefinitions/${grant.roleId}`).get();
      const role = roleSnap.data() as AdminRoleDefinition | undefined;
      if (role?.active && !role.deletedAt && role.permissions?.includes(permission))
        return { uid, access: minimalAccess };
    } else if (
      request.auth?.token.role === 'admin' &&
      typeof request.auth.token.adminLevel === 'string' &&
      LEGACY_PERMISSIONS[request.auth.token.adminLevel]?.includes(permission)
    ) {
      return { uid, access: minimalAccess };
    }
    if (eventGrant.exists) {
      const grant = eventGrant.data() as EventAdminRoleGrant;
      const now = Date.now();
      if (
        grant.userId === uid &&
        !grant.revokedAt &&
        timestampMillis(grant.activatesAt) <= now &&
        timestampMillis(grant.expiresAt) >= now
      ) {
        const [eventSnap, roleSnap] = await Promise.all([
          db.doc(`events/${eventId}`).get(),
          db.doc(`events/${eventId}/roleDefinitions/${grant.roleDefinitionId}`).get(),
        ]);
        const role = roleSnap.data() as EventAdminRoleDefinition | undefined;
        if (
          eventSnap.exists &&
          role?.active &&
          !role.deletedAt &&
          role.permissions?.includes(permission)
        )
          return { uid, access: minimalAccess };
      }
    }
    throw errors.permissionDenied('You do not have permission to perform this admin action.');
  }
  const access = await resolveAdminAccess(uid, request.auth?.token);
  if (!hasPermission(access, permission, eventId)) {
    throw errors.permissionDenied('You do not have permission to perform this admin action.');
  }
  return { uid, access };
}

export async function requireSuperAdmin(request: CallableRequest): Promise<string> {
  const uid = requireAuth(request);
  if (!(await hasCurrentSuperAdminClaim(uid))) {
    throw errors.permissionDenied('Only a Super Admin can manage organization admin roles.');
  }
  return uid;
}

export async function requireOrganizationPermission(
  request: CallableRequest,
  permission: AdminPermission,
): Promise<{ uid: string; access: AdminAccessSummary }> {
  const uid = requireAuth(request);
  const db = getFirestore();
  // Organization actions never use event-scoped grants. Avoid resolving every
  // event assignment (and its event/role documents) for a single event save.
  const [isSuperAdmin, grantSnap] = await Promise.all([
    hasCurrentSuperAdminClaim(uid),
    db.doc(`organizationAdminGrants/${uid}`).get(),
  ]);
  if (isSuperAdmin) {
    return { uid, access: { isSuperAdmin: true, organizationRole: null, eventAccess: [] } };
  }

  let organizationRole: AdminAccessSummary['organizationRole'] = null;
  if (grantSnap.exists) {
    const grant = grantSnap.data() as OrganizationAdminGrant;
    const roleSnap = await db.doc(`adminRoleDefinitions/${grant.roleId}`).get();
    if (roleSnap.exists) {
      const role = { id: roleSnap.id, ...roleSnap.data() } as AdminRoleDefinition;
      if (role.active && !role.deletedAt) {
        organizationRole = { id: role.id, name: role.name, permissions: role.permissions };
      }
    }
  } else if (
    request.auth?.token.role === 'admin' &&
    typeof request.auth.token.adminLevel === 'string'
  ) {
    const permissions = LEGACY_PERMISSIONS[request.auth.token.adminLevel];
    if (permissions) {
      organizationRole = {
        id: `legacy-${request.auth.token.adminLevel}`,
        name: `${request.auth.token.adminLevel} admin`,
        permissions,
      };
    }
  }
  const access: AdminAccessSummary = { isSuperAdmin: false, organizationRole, eventAccess: [] };
  if (!hasOrganizationPermission(access, permission)) {
    throw errors.permissionDenied('Organization admin access required.');
  }
  return { uid, access };
}
