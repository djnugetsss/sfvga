import { onCall } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { registrationFinishSchema } from '@sfvga/shared-validation';
import { requireAuth } from '../shared/requireAuth';
import { errors } from '../shared/errors';
import { actionOpen } from '../shared/paymentWorkflow';

export const registrations_requestReview = onCall(async (request) => {
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
    if (reg.lastResubmissionRequest === input.requestId) return { submitted: true };
    if (
      reg.signupStatus !== 'submitted' ||
      reg.reviewStatus !== 'rejected' ||
      !actionOpen(event.data()!, reg)
    )
      throw errors.failedPrecondition('Contact an organizer before requesting another review.');
    tx.update(ref, {
      reviewStatus: 'pending',
      resubmittedAt: Timestamp.now(),
      payerName: input.payerName,
      paymentNote: input.paymentNote,
      reviewRevision: (reg.reviewRevision ?? 0) + 1,
      lastResubmissionRequest: input.requestId,
    });
    return { submitted: true };
  });
});
