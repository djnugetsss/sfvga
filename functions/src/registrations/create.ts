import { onCall } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import {
  registrationCreateSchema,
  normalizeEventPricing,
  priceForAttendee,
} from '@sfvga/shared-validation';
import { requireAuth } from '../shared/requireAuth';
import { errors } from '../shared/errors';
import { actionOpen, assertCapacity } from '../shared/paymentWorkflow';

export const registrations_create = onCall(async (request) => {
  const uid = requireAuth(request);
  const input = registrationCreateSchema.parse(request.data);
  if (input.eventId.includes('/')) throw errors.invalidArgument('Invalid event.');
  const db = getFirestore();
  const eventRef = db.doc(`events/${input.eventId}`);
  return db.runTransaction(async (tx) => {
    const [eventSnap, regs, user] = await Promise.all([
      tx.get(eventRef),
      tx.get(eventRef.collection('registrations')),
      tx.get(db.doc(`users/${uid}`)),
    ]);
    if (!eventSnap.exists) throw errors.notFound('Event not found.');
    if (!user.exists || user.get('deletionRequestedAt'))
      throw errors.failedPrecondition('This account is being deleted.');
    const event = eventSnap.data()!;
    const existing = regs.docs.find((d) => d.get('userId') === uid);
    if (existing) {
      return {
        registrationId: existing.id,
        paymentStatus: existing.get('paymentStatus'),
        totalAmount: existing.get('totalAmount'),
        resumePayment: true,
      };
    }
    if (!actionOpen(event))
      throw errors.failedPrecondition('Registration has closed for this event.');
    const pricing = normalizeEventPricing(event.pricing);
    if (pricing.childRule && input.attendees.some((a) => a.ageYears == null)) {
      throw errors.invalidArgument('Enter an age for each attendee.');
    }
    const totalAmount = input.attendees.reduce(
      (sum, a) =>
        sum +
        priceForAttendee(pricing, {
          isGuest: Boolean(a.isGuest),
          ageYears: a.ageYears,
        }),
      0,
    );
    if (
      totalAmount > 0 &&
      (!event.paymentUrl?.startsWith('https://') || !event.registrationDeadline)
    ) {
      throw errors.failedPrecondition('Payment setup is not ready. Please contact an organizer.');
    }
    assertCapacity(
      event,
      regs.docs.map((d) => d.data()),
      input.attendees.length,
    );
    const ref = eventRef.collection('registrations').doc(uid);
    const now = Timestamp.now();
    const registration = {
      id: ref.id,
      eventId: input.eventId,
      userId: uid,
      attendees: JSON.parse(JSON.stringify(input.attendees)),
      accountPhone: user.get('phone') || request.auth?.token.phone_number || '',
      totalAmount,
      paymentStatus: totalAmount > 0 ? 'unpaid' : 'free',
      workflowVersion: 1,
      signupStatus: totalAmount > 0 ? 'started' : 'submitted',
      reviewStatus: totalAmount > 0 ? 'pending' : 'approved',
      reviewRevision: 0,
      createdAt: now,
      ...(totalAmount === 0 ? { submittedAt: now } : {}),
    };
    tx.create(ref, registration);
    // Serialize all capacity changes through the parent event.
    tx.update(eventRef, { registrationVersion: (event.registrationVersion ?? 0) + 1 });
    return { registrationId: ref.id, paymentStatus: registration.paymentStatus, totalAmount };
  });
});
