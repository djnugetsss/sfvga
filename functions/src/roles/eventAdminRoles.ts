import { onCall } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import {
  eventAdminRoleAssignSchema,
  eventAdminRoleCreateSchema,
  eventAdminRoleDeleteSchema,
  eventAdminRoleRevokeSchema,
  eventAdminRoleUpdateSchema,
} from '@sfvga/shared-validation';
import type { AdminPermission, EventAdminRoleDefinition } from '@sfvga/shared-types';
import { errors } from '../shared/errors';
import {
  hasOrganizationPermission,
  requireAdminPermission,
  resolveAdminAccess,
} from '../shared/adminAccess';
import { requireAuth } from '../shared/requireAuth';
import { stageAdminAudit, writeAdminAudit } from '../shared/adminAudit';
import { ticketScannerRoleData } from './ticketScannerRole';

async function requireEventRoleDefinitionManager(
  request: Parameters<typeof requireAuth>[0],
  eventId: string,
) {
  const uid = requireAuth(request);
  const access = await resolveAdminAccess(uid, request.auth?.token);
  if (hasOrganizationPermission(access, 'staff.assign')) return uid;
  const event = await getFirestore().doc(`events/${eventId}`).get();
  if (event.exists && event.data()?.createdBy === uid) return uid;
  throw errors.permissionDenied(
    'Only the event creator or an authorized organization admin can manage event role definitions.',
  );
}

export const eventAdminRoles_list = onCall(async (request) => {
  const eventId = String(request.data?.eventId || '');
  if (!eventId) throw errors.invalidArgument('Event is required.');
  await requireAdminPermission(request, 'staff.view', eventId);
  const eventRef = getFirestore().doc(`events/${eventId}`);
  const [roles, grants] = await Promise.all([
    eventRef.collection('roleDefinitions').orderBy('name').get(),
    eventRef.collection('roles').get(),
  ]);
  return {
    roles: roles.docs.map((doc) => ({ id: doc.id, eventId, ...doc.data() })),
    grants: grants.docs.map((doc) => ({ id: doc.id, eventId, ...doc.data() })),
  };
});

export const eventAdminRoles_create = onCall(async (request) => {
  const input = eventAdminRoleCreateSchema.parse(request.data);
  const uid = await requireEventRoleDefinitionManager(request, input.eventId);
  const now = Timestamp.now();
  const ref = getFirestore().collection(`events/${input.eventId}/roleDefinitions`).doc();
  await ref.set({
    eventId: input.eventId,
    name: input.name,
    description: input.description ?? '',
    permissions: input.permissions,
    active: true,
    system: false,
    createdBy: uid,
    createdAt: now,
    updatedAt: now,
  });
  await writeAdminAudit(uid, 'eventAdminRoles.create', { eventId: input.eventId, roleId: ref.id });
  return { roleId: ref.id };
});

/** Adds the standard scan-only role to existing events without creating duplicates. */
export const eventAdminRoles_ensureTicketScanner = onCall(async (request) => {
  const eventId = String(request.data?.eventId || '');
  if (!eventId) throw errors.invalidArgument('Event is required.');
  const uid = await requireEventRoleDefinitionManager(request, eventId);
  const db = getFirestore();
  const roles = db.collection(`events/${eventId}/roleDefinitions`);
  const existing = await roles.where('name', '==', 'Ticket Scanner').limit(1).get();
  if (!existing.empty) return { roleId: existing.docs[0].id, created: false };

  const ref = roles.doc('ticket-scanner');
  const created = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists) return false;
    const now = Timestamp.now();
    transaction.set(ref, ticketScannerRoleData(eventId, uid, now));
    return true;
  });
  if (created) {
    await writeAdminAudit(uid, 'eventAdminRoles.create', {
      eventId,
      roleId: ref.id,
      defaultRole: true,
    });
  }
  return { roleId: ref.id, created };
});

export const eventAdminRoles_update = onCall(async (request) => {
  const { eventId, roleId, ...patch } = eventAdminRoleUpdateSchema.parse(request.data);
  const uid = await requireEventRoleDefinitionManager(request, eventId);
  const ref = getFirestore().doc(`events/${eventId}/roleDefinitions/${roleId}`);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.deletedAt) throw errors.notFound('Event role not found.');
  await ref.update({ ...patch, updatedAt: Timestamp.now() });
  await writeAdminAudit(uid, 'eventAdminRoles.update', {
    eventId,
    roleId,
    fields: Object.keys(patch),
  });
  return { success: true };
});

export const eventAdminRoles_delete = onCall(async (request) => {
  const { eventId, roleId } = eventAdminRoleDeleteSchema.parse(request.data);
  const uid = await requireEventRoleDefinitionManager(request, eventId);
  const db = getFirestore();
  const roleRef = db.doc(`events/${eventId}/roleDefinitions/${roleId}`);
  const role = await roleRef.get();
  if (!role.exists) throw errors.notFound('Event role not found.');
  const grants = await db
    .collection(`events/${eventId}/roles`)
    .where('roleDefinitionId', '==', roleId)
    .get();
  const now = Timestamp.now();
  await roleRef.update({ active: false, deletedAt: now, updatedAt: now });
  const writer = db.bulkWriter();
  grants.docs.forEach((grant) => writer.update(grant.ref, { revokedAt: now }));
  await writer.close();
  await writeAdminAudit(uid, 'eventAdminRoles.delete', {
    eventId,
    roleId,
    revokedAssignments: grants.size,
  });
  return { success: true, revokedAssignments: grants.size };
});

export const eventAdminRoles_assign = onCall(async (request) => {
  const input = eventAdminRoleAssignSchema.parse(request.data);
  const uid = requireAuth(request);
  const access = await resolveAdminAccess(uid, request.auth?.token);
  const canAssignOrganizationWide = hasOrganizationPermission(access, 'staff.assign');
  const ownEventAccess = access.eventAccess.find((item) => item.eventId === input.eventId);
  const db = getFirestore();
  const event = await db.doc(`events/${input.eventId}`).get();
  const isEventCreator = event.exists && event.data()?.createdBy === uid;
  if (
    !canAssignOrganizationWide &&
    !isEventCreator &&
    !ownEventAccess?.permissions.includes('staff.assign')
  ) {
    throw errors.permissionDenied('You cannot assign staff for this event.');
  }

  const activatesAt = Timestamp.fromDate(new Date(input.activatesAt));
  const expiresAt = Timestamp.fromDate(new Date(input.expiresAt));
  if (expiresAt.toMillis() <= activatesAt.toMillis()) {
    throw errors.invalidArgument('The role expiration must be after its activation.');
  }

  const roleRef = db.doc(`events/${input.eventId}/roleDefinitions/${input.roleId}`);
  const roleSnap = await roleRef.get();
  if (!roleSnap.exists || roleSnap.data()?.active !== true || roleSnap.data()?.deletedAt) {
    throw errors.failedPrecondition('Choose an active event role.');
  }
  const role = { id: roleSnap.id, ...roleSnap.data() } as EventAdminRoleDefinition;
  if (!canAssignOrganizationWide && !isEventCreator) {
    const own = new Set(ownEventAccess?.permissions ?? []);
    const escalates = role.permissions.some((permission: AdminPermission) => !own.has(permission));
    if (escalates) throw errors.permissionDenied('You cannot assign permissions you do not have.');
  }

  const now = Timestamp.now();
  // One effective event-admin role per member/event keeps security-rule lookup
  // deterministic at events/{eventId}/roles/{uid}.
  const ref = db.doc(`events/${input.eventId}/roles/${input.targetUid}`);
  const batch = db.batch();
  batch.set(
    ref,
    {
      eventId: input.eventId,
      userId: input.targetUid,
      roleDefinitionId: input.roleId,
      activatesAt,
      expiresAt,
      grantedBy: uid,
      createdAt: now,
    },
    { merge: false },
  );
  stageAdminAudit(batch, uid, 'eventAdminRoles.assign', {
    eventId: input.eventId,
    roleId: input.roleId,
    targetUid: input.targetUid,
    grantId: ref.id,
  });
  await batch.commit();
  return { grantId: ref.id };
});

export const eventAdminRoles_revoke = onCall(async (request) => {
  const { eventId, grantId } = eventAdminRoleRevokeSchema.parse(request.data);
  const uid = requireAuth(request);
  const db = getFirestore();
  const access = await resolveAdminAccess(uid, request.auth?.token);
  const event = await db.doc(`events/${eventId}`).get();
  const isEventCreator = event.exists && event.data()?.createdBy === uid;
  const canRevoke =
    hasOrganizationPermission(access, 'staff.revoke') ||
    access.eventAccess
      .find((item) => item.eventId === eventId)
      ?.permissions.includes('staff.revoke');
  if (!isEventCreator && !canRevoke) {
    throw errors.permissionDenied('You cannot revoke staff access for this event.');
  }
  const ref = db.doc(`events/${eventId}/roles/${grantId}`);
  const snap = await ref.get();
  if (!snap.exists) throw errors.notFound('Role assignment not found.');
  const batch = db.batch();
  batch.update(ref, { revokedAt: Timestamp.now() });
  stageAdminAudit(batch, uid, 'eventAdminRoles.revoke', { eventId, grantId });
  await batch.commit();
  return { success: true };
});
