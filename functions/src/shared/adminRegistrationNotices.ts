import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { AdminPermission, AdminRegistrationNotification } from '@sfvga/shared-types';
import { hasPermission, isSuperClaims, resolveAdminAccess } from './adminAccess';

async function notifyAdmins(
  input: {
    id: string;
    eventId: string;
    registrationId?: string;
    title: string;
    body: string;
    type: AdminRegistrationNotification['type'];
    actorId?: string;
  },
  permissions: AdminPermission[],
) {
  const db = getFirestore();
  const [orgGrants, eventGrants, event] = await Promise.all([
    db.collection('organizationAdminGrants').get(),
    db.collection(`events/${input.eventId}/roles`).get(),
    db.doc(`events/${input.eventId}`).get(),
  ]);
  if (!event.exists) return;
  const candidates = new Set([
    ...orgGrants.docs.map((doc) => doc.id),
    ...eventGrants.docs.map((doc) => String(doc.get('userId'))),
  ]);
  // Enumerate Auth once instead of resolving access for every member profile.
  let pageToken: string | undefined;
  do {
    const page = await getAuth().listUsers(1000, pageToken);
    for (const user of page.users) {
      if (user.disabled || user.uid === input.actorId) continue;
      const claims = user.customClaims;
      if (!candidates.has(user.uid) && !isSuperClaims(claims) && claims?.role !== 'admin') continue;
      const access = await resolveAdminAccess(user.uid, claims);
      if (!permissions.every((permission) => hasPermission(access, permission, input.eventId)))
        continue;
      const ref = db.doc(`users/${user.uid}/adminNotifications/${input.id}`);
      await db.runTransaction(async (tx) => {
        if ((await tx.get(ref)).exists) return;
        tx.create(ref, {
          title: input.title,
          body: input.body,
          type: input.type,
          eventId: input.eventId,
          eventTitle: String(event.get('title') || 'Event'),
          ...(input.registrationId ? { registrationId: input.registrationId } : {}),
          createdAt: Timestamp.now(),
          deliveryStatus: 'pending',
          nextAttemptAt: Timestamp.now(),
          attempts: 0,
        });
      });
    }
    pageToken = page.pageToken;
  } while (pageToken);
}

export function notifyRegistrationManagers(input: {
  id: string;
  eventId: string;
  registrationId: string;
  title: string;
  body: string;
  type: 'admin_registration_message' | 'admin_registration_attention';
  actorId?: string;
}) {
  return notifyAdmins(input, ['registrations.view', 'registrations.manage']);
}

export function notifyEventEditors(input: {
  id: string;
  eventId: string;
  title: string;
  body: string;
}) {
  return notifyAdmins({ ...input, type: 'admin_photo_album_reminder' }, [
    'events.view',
    'events.edit',
  ]);
}
