import { onDocumentWritten, onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

export function roleAssignmentChanged(before: Record<string, unknown> | undefined, after: Record<string, unknown> | undefined, eventRole = false): boolean {
  if (!after || after.revokedAt) return false;
  if (!before || before.revokedAt) return true;
  const fields = eventRole ? ['roleDefinitionId', 'activatesAt', 'expiresAt'] : ['roleId'];
  return fields.some(field => JSON.stringify(before[field]) !== JSON.stringify(after[field]));
}

async function notifyAssignment(id: string, uid: string, roleName: string, eventId = '', eventTitle = '') {
  const db = getFirestore();
  const ref = db.doc(`users/${uid}/notifications/${id}`);
  await db.runTransaction(async tx => {
    if ((await tx.get(ref)).exists) return;
    tx.create(ref, {
      type: 'role_assigned', title: `You’re now ${roleName}`,
      body: eventId ? `You’ve been assigned ${roleName} for ${eventTitle}.` : `You’ve been given ${roleName} admin access.`,
      eventId, ...(eventTitle ? { eventTitle } : {}),
      createdAt: Timestamp.now(), deliveryStatus: 'pending', attempts: 0, nextAttemptAt: Timestamp.now(),
    });
  });
}

export const notifications_eventRoleAssigned = onDocumentWritten(
  { document: 'events/{eventId}/roles/{grantId}', retry: true },
  async event => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!roleAssignmentChanged(before, after, true) || !after?.userId) return;
    const db = getFirestore();
    const [role, gathering] = await Promise.all([
      db.doc(`events/${event.params.eventId}/roleDefinitions/${after.roleDefinitionId}`).get(),
      db.doc(`events/${event.params.eventId}`).get(),
    ]);
    if (!role.exists || !gathering.exists) return;
    await notifyAssignment(`event-role-${event.id}`, String(after.userId), String(role.get('name')), event.params.eventId, String(gathering.get('title')));
  },
);

export const notifications_organizationRoleAssigned = onDocumentWritten(
  { document: 'organizationAdminGrants/{uid}', retry: true },
  async event => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!roleAssignmentChanged(before, after) || !after) return;
    const role = await getFirestore().doc(`adminRoleDefinitions/${after.roleId}`).get();
    if (!role.exists) return;
    await notifyAssignment(`organization-role-${event.id}`, event.params.uid, String(role.get('name')));
  },
);

export const notifications_presidentAssigned = onDocumentCreated(
  { document: 'adminAuditLogs/{auditId}', retry: true },
  async event => {
    const audit = event.data?.data();
    if (audit?.action !== 'adminRoles.grantSuperAdmin' && !(audit?.action === 'adminRoles.legacyAssign' && audit.target?.adminLevel === 'super')) return;
    const uid = audit.target?.targetUid;
    if (typeof uid !== 'string') return;
    const role = await getFirestore().doc('adminRoleDefinitions/super-admin').get();
    await notifyAssignment(`president-role-${event.params.auditId}`, uid, String(role.get('name') || 'President'));
  },
);
