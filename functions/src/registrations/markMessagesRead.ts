import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { registrationActionSchema } from '@sfvga/shared-validation';
import { requireAuth } from '../shared/requireAuth';
import { requireAdminPermission } from '../shared/adminAccess';
import { errors } from '../shared/errors';

export const registrations_markMessagesRead = onCall(async (request) => {
  const uid = requireAuth(request);
  const input = registrationActionSchema.parse(request.data);
  const ref = getFirestore().doc(`events/${input.eventId}/registrations/${input.registrationId}`);
  const snap = await ref.get();
  if (!snap.exists) throw errors.notFound('Registration not found.');
  // An organizer may also own this signup. Honor the admin screen's read context
  // only after checking event permissions below, rather than treating it as a member read.
  const member = snap.get('userId') === uid && request.data?.audience !== 'admin';
  if (!member) await requireAdminPermission(request, 'registrations.manage', input.eventId);
  await getFirestore().runTransaction(async (tx) => {
    const messages = await tx.get(ref.collection('messages').orderBy('createdAt', 'desc').limit(1));
    // Do not clear a newer message which arrived after the caller's read.
    if (
      typeof request.data?.lastMessageId === 'string' &&
      messages.docs[0]?.id === request.data.lastMessageId
    )
      tx.update(ref, { [member ? 'memberUnread' : 'adminUnread']: false });
  });
  return { read: true };
});
