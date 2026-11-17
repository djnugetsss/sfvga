import { onCall } from 'firebase-functions/v2/https';
import { requireAdminPermission } from '../shared/adminAccess';
import { errors } from '../shared/errors';

/**
 * registrations_cancel — admin-initiated cancellation that revokes associated tickets.
 * Refund behavior will be defined with the replacement payment method.
 */
export const registrations_cancel = onCall(async (request) => {
  const eventId = String(request.data?.eventId || '');
  if (!eventId) throw errors.invalidArgument('Event is required.');
  await requireAdminPermission(request, 'registrations.manage', eventId);

  // TODO: mark the registration cancelled and revoke its tickets. Refund behavior depends
  // on the replacement payment method and must not be guessed here.
  throw new Error('registrations_cancel not implemented — Phase 2 (Events & Registration)');
});
