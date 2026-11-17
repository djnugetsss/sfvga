import { onCall } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { paymentDecisionsSchema } from '@sfvga/shared-validation';
import { requireAdminPermission } from '../shared/adminAccess';
import { errors } from '../shared/errors';
import { actionOpen, notice } from '../shared/paymentWorkflow';

export const registrations_confirmPayments = onCall(async (request) => {
  const input = paymentDecisionsSchema.parse(request.data);
  const { uid } = await requireAdminPermission(request, 'registrations.manage', input.eventId);
  const db = getFirestore();
  const results = [];
  for (const decision of input.decisions) {
    try {
      await db.runTransaction(async (tx) => {
        const ref = db.doc(`events/${input.eventId}/registrations/${decision.registrationId}`);
        const [snap, event] = await Promise.all([tx.get(ref), tx.get(ref.parent.parent!)]);
        const reg = snap.data();
        if (!reg) throw errors.notFound('Registration not found.');
        if (reg.accountDeleted)
          throw errors.failedPrecondition('This registration belongs to a deleted account.');
        if (reg.lastReviewRequest === input.requestId) return;
        if (reg.workflowVersion !== 1 || reg.signupStatus !== 'submitted' || reg.totalAmount === 0)
          throw errors.failedPrecondition('Only completed, priced signups can be reviewed.');
        if ((reg.reviewRevision ?? 0) !== decision.expectedRevision)
          throw errors.failedPrecondition(
            'Another organizer updated this registration. Refresh and review again.',
          );
        const reviewStatus = decision.approved ? 'approved' : 'rejected';
        if (reg.reviewStatus === reviewStatus) return;
        const revision = (reg.reviewRevision ?? 0) + 1;
        tx.update(ref, {
          reviewStatus,
          reviewRevision: revision,
          paymentStatus: decision.approved ? 'paid' : 'unpaid',
          ...(reg.reviewStatus === 'approved' && !decision.approved
            ? { ticketGeneration: (reg.ticketGeneration ?? 0) + 1 }
            : {}),
          reviewedAt: Timestamp.now(),
          reviewedBy: uid,
          lastReviewRequest: input.requestId,
        });
        if (!decision.approved) {
          const title = 'Payment update';
          const body =
            reg.reviewStatus === 'approved'
              ? `We’re reviewing an issue with your payment for ${event.get('title')}. Your current QR tickets can no longer be used. If your payment is approved again, new tickets will appear in Tickets. An SFVGA organizer will contact you here with the next steps.`
              : `We haven’t been able to verify your payment for ${event.get('title')}. ${
                  actionOpen(event.data()!, reg)
                    ? 'Please review your payment and use the event’s payment link if needed. If you’ve already paid, send our organizers a message so we can help.'
                    : 'Please message our organizers so we can help and arrange a payment-correction exception if needed.'
                }`;
          notice(
            tx,
            ref,
            reg,
            `review-${revision}`,
            title,
            'There’s an issue with your payment. Tap to resolve.',
            'payment',
            revision,
          );
          tx.set(ref.collection('messages').doc(`review-${revision}`), {
            body,
            senderId: uid,
            senderRole: 'system',
            createdAt: Timestamp.now(),
          });
          tx.update(ref, {
            memberUnread: true,
            lastMessageAt: Timestamp.now(),
            lastMessageId: `review-${revision}`,
          });
        }
      });
      results.push({ registrationId: decision.registrationId, ok: true });
    } catch (error) {
      results.push({
        registrationId: decision.registrationId,
        ok: false,
        error: error instanceof Error ? error.message : 'Unable to save decision.',
      });
    }
  }
  return { results };
});
