import { onCall } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { registrationMessageSchema } from '@sfvga/shared-validation';
import { requireAuth } from '../shared/requireAuth';
import { requireAdminPermission } from '../shared/adminAccess';
import { errors } from '../shared/errors';
import { notice } from '../shared/paymentWorkflow';

export const registrations_sendMessage = onCall(async (request) => {
  const uid = requireAuth(request);
  if (request.data?.prepare === true) {
    const { eventId, registrationId, senderRole } = registrationMessageSchema
      .pick({ eventId: true, registrationId: true, senderRole: true })
      .parse(request.data);
    const ref = getFirestore().doc(`events/${eventId}/registrations/${registrationId}`);
    const snap = await ref.get();
    if (!snap.exists) throw errors.notFound('Registration not found.');
    if (snap.get('accountDeleted'))
      throw errors.failedPrecondition('This registration belongs to a deleted account.');
    if (senderRole === 'organizer') {
      await requireAdminPermission(request, 'registrations.manage', eventId);
    } else if (snap.get('userId') !== uid) {
      throw errors.permissionDenied();
    }
    return { ready: true };
  }
  const input = registrationMessageSchema.parse(request.data);
  const db = getFirestore();
  const ref = db.doc(`events/${input.eventId}/registrations/${input.registrationId}`);
  const initial = input.senderRole ? null : await ref.get();
  if (initial && !initial.exists) throw errors.notFound('Registration not found.');
  const ownsRegistration = initial?.get('userId') === uid;
  // One account can act on either side. The selected screen determines intent,
  // while ownership/permissions below remain the server's authority.
  const isMember = input.senderRole ? input.senderRole === 'member' : ownsRegistration;
  if (!isMember) await requireAdminPermission(request, 'registrations.manage', input.eventId);
  await db.runTransaction(async (tx) => {
    const messageRef = ref.collection('messages').doc(input.requestId);
    const [prior, snap] = await Promise.all([tx.get(messageRef), tx.get(ref)]);
    if (!snap.exists) throw errors.notFound('Registration not found.');
    const reg = snap.data()!;
    if (reg.accountDeleted)
      throw errors.failedPrecondition('This registration belongs to a deleted account.');
    if (isMember && reg.userId !== uid) throw errors.permissionDenied();
    if (prior.exists) return;
    tx.create(messageRef, {
      body: input.body,
      senderId: uid,
      senderRole: isMember ? 'member' : 'organizer',
      createdAt: Timestamp.now(),
      eventId: input.eventId,
      registrationId: input.registrationId,
    });
    tx.update(ref, {
      [isMember ? 'adminUnread' : 'memberUnread']: true,
      lastMessageAt: Timestamp.now(),
      lastMessageId: input.requestId,
    });
    if (!isMember)
      notice(
        tx,
        ref,
        reg,
        input.requestId,
        'Message from SFVGA',
        'An SFVGA organizer sent you a private registration message. Open the app to read it.',
        'registration_message',
      );
  });
  return { sent: true };
});
