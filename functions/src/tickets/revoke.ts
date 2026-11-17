import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { ticketRevokeSchema } from '@sfvga/shared-validation';
import { requireAdminPermission } from '../shared/adminAccess';
import { errors } from '../shared/errors';

/**
 * tickets_revoke — admin-only. Instantly sets a ticket's status to "revoked" so even an
 * unscanned valid QR is rejected on the next scan attempt (tech design §8).
 */
export const tickets_revoke = onCall(async (request) => {
  const { eventId, registrationId, ticketId } = ticketRevokeSchema.parse(request.data);
  await requireAdminPermission(request, 'tickets.revoke', eventId);

  const db = getFirestore();
  const ticketRef = db.doc(`events/${eventId}/registrations/${registrationId}/tickets/${ticketId}`);
  const snap = await ticketRef.get();

  if (!snap.exists) {
    throw errors.notFound('Ticket not found.');
  }

  const status = snap.data()?.status as string | undefined;
  if (status === 'revoked') {
    return { success: true, alreadyRevoked: true };
  }

  await ticketRef.update({ status: 'revoked' });

  return { success: true, alreadyRevoked: false };
});
