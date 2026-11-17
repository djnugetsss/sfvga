import { onCall } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { correctionExceptionSchema } from '@sfvga/shared-validation';
import { requireAdminPermission } from '../shared/adminAccess';
import { errors } from '../shared/errors';
import { assertCapacity, effectiveSignup, notice } from '../shared/paymentWorkflow';

export const registrations_grantCorrection = onCall(async (request) => {
  const input = correctionExceptionSchema.parse(request.data);
  const { uid } = await requireAdminPermission(request, 'registrations.manage', input.eventId);
  const db = getFirestore();
  const ref = db.doc(`events/${input.eventId}/registrations/${input.registrationId}`);
  return db.runTransaction(async (tx) => {
    const [snap, eventSnap, regs] = await Promise.all([
      tx.get(ref),
      tx.get(ref.parent.parent!),
      tx.get(ref.parent),
    ]);
    const reg = snap.data(),
      event = eventSnap.data();
    if (!reg || !event || reg.workflowVersion !== 1) throw errors.notFound('Signup not found.');
    if (reg.lastCorrectionRequest === input.requestId) return { granted: true };
    const expiry = new Date(input.expiresAt).getTime();
    if (event.status !== 'published')
      throw errors.failedPrecondition('The event must be published to grant an exception.');
    if (expiry <= Date.now() || expiry > event.endAt.toMillis())
      throw errors.invalidArgument('Choose a future expiry before the event ends.');
    if (reg.reviewStatus === 'approved')
      throw errors.failedPrecondition('Payment is already approved.');
    if (effectiveSignup(event, reg) === 'expired') {
      assertCapacity(
        event,
        regs.docs.filter((d) => d.id !== ref.id).map((d) => d.data()),
        reg.attendees.length,
      );
    }
    tx.update(ref, {
      correctionExpiresAt: Timestamp.fromMillis(expiry),
      ...(reg.signupStatus !== 'submitted' ? { signupStatus: 'started' } : {}),
      lastCorrectionRequest: input.requestId,
      memberUnread: true,
      lastMessageAt: Timestamp.now(),
      lastMessageId: input.requestId,
      // Keep the explanation in the private conversation, not the view-only registration.
      correctionMessageId: input.requestId,
      correctionGrantedBy: uid,
      correctionGrantedAt: Timestamp.now(),
    });
    tx.update(eventSnap.ref, { registrationVersion: (event.registrationVersion ?? 0) + 1 });
    const body = `${input.explanation}\nYou may correct your payment and complete this signup until ${new Date(expiry).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', timeZoneName: 'short' })}.`;
    tx.set(ref.collection('messages').doc(input.requestId), {
      body,
      senderId: uid,
      senderRole: 'organizer',
      createdAt: Timestamp.now(),
    });
    notice(
      tx,
      ref,
      reg,
      input.requestId,
      'Payment correction available',
      'An SFVGA organizer sent you a private message about a payment-correction exception. Open the app to read it.',
      'registration_message',
    );
    return { granted: true };
  });
});
