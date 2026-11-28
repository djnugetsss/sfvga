import { onCall } from 'firebase-functions/v2/https';
import { requireOrganizationPermission } from '../shared/adminAccess';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { normalizeEventPricing } from '@sfvga/shared-validation';
import { safeEventId } from './eventFields';
import { errors } from '../shared/errors';
import { ticketScannerRoleData, standardEventRoleData } from '../roles/ticketScannerRole';

/**
 * events_duplicate — copies title/description/schedule/FAQs/pricing from a past event
 * into a new draft (tech design doc §5). Admin just updates the date afterward.
 */
export const events_duplicate = onCall(async (request) => {
  const { uid } = await requireOrganizationPermission(request, 'events.create');
  const sourceEventId = safeEventId(request.data?.sourceEventId);
  const db = getFirestore();
  const snap = await db.doc(`events/${sourceEventId}`).get();
  if (!snap.exists) throw errors.notFound('Source event not found.');
  const source = snap.data()!;
  const fields: Record<string, unknown> = {};
  for (const key of [
    'description',
    'startAt',
    'endAt',
    'location',
    'faqs',
    'parkingNote',
    'whatToBring',
    'schedule',
    'capacity',
    'bannerUrl',
    'flyerUrl',
    'paymentUrl',
  ]) {
    if (source[key] !== undefined) fields[key] = source[key];
  }
  const ref = db.collection('events').doc();
  const now = Timestamp.now();
  const batch = db.batch();
  batch.set(ref, {
    ...fields,
    title: `Copy of ${source.title}`,
    pricing: normalizeEventPricing(source.pricing),
    status: 'draft',
    duplicatedFromEventId: sourceEventId,
    createdBy: uid,
    createdAt: now,
    updatedAt: now,
  });
  batch.set(
    ref.collection('roleDefinitions').doc('ticket-scanner'),
    ticketScannerRoleData(ref.id, uid, now),
  );
  for (const role of standardEventRoleData(ref.id, uid, now)) {
    batch.set(ref.collection('roleDefinitions').doc(role.id), role);
  }
  await batch.commit();
  return { eventId: ref.id };
});
