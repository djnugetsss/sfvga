import { onCall } from 'firebase-functions/v2/https';
import { requireOrganizationPermission } from '../shared/adminAccess';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { eventCreateSchema } from '@sfvga/shared-validation';
import { eventFields, validateEventPublication } from './eventFields';
import { ticketScannerRoleData } from '../roles/ticketScannerRole';

/**
 * events_create — creates a new event document in status "draft".
 * Admin only; validated against eventSchema from @sfvga/shared-validation.
 */
export const events_create = onCall(async (request) => {
  const { uid } = await requireOrganizationPermission(request, 'events.create');
  // The form may call this read-only preparation path while the admin is typing.
  // It warms the same callable used by Create without creating a draft event.
  if (request.data?.prepare === true) return { ready: true };
  const fields = eventFields(eventCreateSchema.parse(request.data));
  validateEventPublication({ ...fields, status: 'draft' });
  const db = getFirestore();
  const ref = db.collection('events').doc();
  const now = Timestamp.now();
  const batch = db.batch();
  batch.set(ref, {
    ...fields,
    status: 'draft',
    createdBy: uid,
    createdAt: now,
    updatedAt: now,
  });
  // A new event's standard scanner role is ready before the staff screen opens.
  batch.set(
    ref.collection('roleDefinitions').doc('ticket-scanner'),
    ticketScannerRoleData(ref.id, uid, now),
  );
  await batch.commit();
  return { eventId: ref.id };
});
