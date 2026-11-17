import { onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { ticketValidateSchema } from '@sfvga/shared-validation';
import { requireAuth } from '../shared/requireAuth';
import { errors } from '../shared/errors';
import { canScanTickets } from '../shared/canScanTickets';
import { decryptPayload } from '../shared/qrCrypto';
import { workflowEligible } from '../shared/paymentWorkflow';
import {
  buildAlreadyRedeemedMessage,
  buildCheckedInMessage,
  invalidScanResponse,
  type TicketValidateResponse,
} from './validateLogic';

const qrSigningKey = defineSecret('QR_SIGNING_KEY');

interface TicketDoc {
  status: 'valid' | 'redeemed' | 'revoked';
  attendeeName: string;
  redeemedAt?: Timestamp;
}

/**
 * tickets_validate — the check-in scanner endpoint (tech design §8, architecture §14).
 *
 * Re-checks scan permission and ticket status inside a transaction. The client NEVER
 * decrypts — it relays the scanned string. Duplicate scans return a friendly message,
 * not an error code.
 */
export const tickets_validate = onCall({ secrets: [qrSigningKey] }, async (request) => {
  const uid = requireAuth(request);
  const { scannedString, eventId } = ticketValidateSchema.parse(request.data);

  const allowed = await canScanTickets(uid, eventId);
  if (!allowed) {
    throw errors.permissionDenied('You do not have permission to scan tickets for this event.');
  }

  let payload;
  const legacyQr = scannedString.startsWith('SFVGADEV1.');
  try {
    payload = legacyQr
      ? JSON.parse(Buffer.from(scannedString.slice('SFVGADEV1.'.length), 'base64').toString('utf8'))
      : decryptPayload(scannedString, qrSigningKey.value());
  } catch {
    return invalidScanResponse();
  }

  if (
    !payload ||
    payload.eventId !== eventId ||
    ![payload.registrationId, payload.ticketId].every(
      (id) => typeof id === 'string' && /^[^/]{1,128}$/.test(id),
    )
  ) {
    return invalidScanResponse();
  }

  const db = getFirestore();
  const ticketRef = db.doc(
    `events/${eventId}/registrations/${payload.registrationId}/tickets/${payload.ticketId}`,
  );
  const registrationRef = db.doc(`events/${eventId}/registrations/${payload.registrationId}`);

  return db.runTransaction(async (tx): Promise<TicketValidateResponse> => {
    const [ticketSnap, registrationSnap] = await Promise.all([
      tx.get(ticketRef),
      tx.get(registrationRef),
    ]);

    if (
      !ticketSnap.exists ||
      !registrationSnap.exists ||
      !workflowEligible(registrationSnap.data()!) ||
      (ticketSnap.get('generation') ?? 0) !== (registrationSnap.get('ticketGeneration') ?? 0)
    ) {
      return invalidScanResponse();
    }
    // Previously issued device-generated QRs are accepted only against the exact stored
    // historical ticket. Never trust the unsigned payload to authorize a new ticket.
    if (
      legacyQr &&
      (registrationSnap.get('workflowVersion') === 1 ||
        ticketSnap.get('qrPayloadEncrypted') !== scannedString)
    )
      return invalidScanResponse();

    const ticket = ticketSnap.data() as TicketDoc;
    const attendeeName = ticket.attendeeName || payload.attendeeName;

    if (!['valid', 'redeemed'].includes(ticket.status)) {
      return invalidScanResponse();
    }

    if (ticket.status === 'redeemed') {
      const redeemedAt = ticket.redeemedAt?.toDate();
      return {
        outcome: 'already_redeemed',
        attendeeName,
        message: buildAlreadyRedeemedMessage(redeemedAt),
      };
    }

    tx.update(ticketRef, {
      status: 'redeemed',
      redeemedAt: Timestamp.now(),
      redeemedBy: uid,
    });

    const attendees = (registrationSnap.data()?.attendees as unknown[] | undefined) ?? [];

    return {
      outcome: 'checked_in',
      attendeeName,
      partySize: attendees.length,
      message: buildCheckedInMessage(attendeeName),
    };
  });
});
