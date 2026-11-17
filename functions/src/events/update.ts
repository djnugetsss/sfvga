import { onCall } from 'firebase-functions/v2/https';
import { requireAdminPermission } from '../shared/adminAccess';
import { errors } from '../shared/errors';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { eventUpdateSchema } from '@sfvga/shared-validation';
import { eventFields, safeEventId, validateEventPublication } from './eventFields';

/**
 * events_update — edits an existing event (details, schedule, FAQs, pricing, status).
 * Admin only.
 */
export const events_update = onCall(async (request) => {
  const eventId = safeEventId(request.data?.eventId);
  if (request.data?.prepare === true) {
    await requireAdminPermission(request, 'events.edit', eventId);
    return { ready: true };
  }
  const raw = { ...request.data };
  const cleared: string[] = [];
  for (const key of [
    'paymentUrl',
    'registrationDeadline',
    'capacity',
    'photoAlbumUrl',
    'bannerUrl',
    'flyerUrl',
  ]) {
    if (raw[key] === null) {
      cleared.push(key);
      delete raw[key];
    }
  }
  const input = eventUpdateSchema.parse(raw);
  const editsDetails =
    Object.keys(input).some((key) => !['eventId', 'status'].includes(key)) || cleared.length > 0;
  // When a save changes details and publication together, check both permissions
  // concurrently instead of adding two serial remote authorization round trips.
  await Promise.all([
    ...(editsDetails || input.status === undefined
      ? [requireAdminPermission(request, 'events.edit', eventId)]
      : []),
    ...(input.status !== undefined
      ? [requireAdminPermission(request, 'events.publish', eventId)]
      : []),
  ]);
  const db = getFirestore();
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`events/${eventId}`);
    const snap = await tx.get(ref);
    if (!snap.exists) throw errors.notFound('Event not found.');
    const fields = eventFields(input);
    const next = { ...snap.data(), ...fields };
    for (const key of cleared) delete next[key];
    validateEventPublication(next);
    for (const key of cleared) fields[key] = FieldValue.delete();
    tx.update(ref, { ...fields, updatedAt: Timestamp.now() });
  });
  return { eventId };
});
