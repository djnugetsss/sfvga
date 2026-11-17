import { onCall } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { registrationFinishSchema } from '@sfvga/shared-validation';
import { requireAuth } from '../shared/requireAuth';
import { errors } from '../shared/errors';
import { actionOpen } from '../shared/paymentWorkflow';

export const registrations_finish = onCall(async (request) => {
  const uid = requireAuth(request);
  const input = registrationFinishSchema.parse(request.data);
  const db = getFirestore();
  const ref = db.doc(`events/${input.eventId}/registrations/${input.registrationId}`);
  return db.runTransaction(async (tx) => {
    const [snap, event, user] = await Promise.all([
      tx.get(ref),
      tx.get(ref.parent.parent!),
      tx.get(db.doc(`users/${uid}`)),
    ]);
    const reg = snap.data();
    if (!user.exists || user.get('deletionRequestedAt') || reg?.accountDeleted)
      throw errors.failedPrecondition('This account is being deleted.');
    if (!reg || reg.userId !== uid) throw errors.permissionDenied('Registration access required.');
    if (reg.signupStatus === 'submitted') return { submitted: true };
    if (
      reg.workflowVersion !== 1 ||
      reg.signupStatus !== 'started' ||
      !event.exists ||
      !actionOpen(event.data()!, reg)
    ) {
      throw errors.failedPrecondition(
        'Registration has closed. Please message an organizer for help.',
      );
    }
    tx.update(ref, {
      signupStatus: 'submitted',
      submittedAt: Timestamp.now(),
      payerName: input.payerName,
      paymentNote: input.paymentNote,
      reviewStatus: 'pending',
    });
    return { submitted: true };
  });
});
