import { onCall } from 'firebase-functions/v2/https';
import { requireAuth } from '../shared/requireAuth';

/**
 * registrations_update — edits an existing registration up to registrationDeadline
 * (adjust attendees), re-running the same capacity/price validation (tech design §6).
 */
export const registrations_update = onCall(async (request) => {
  requireAuth(request);

  // TODO: Phase 2 — verify caller owns the registration and the deadline has not passed,
  // parse with registrationUpdateSchema, re-validate capacity/pricing, update the doc.
  throw new Error('registrations_update not implemented — Phase 2 (Events & Registration)');
});
