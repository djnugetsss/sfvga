import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { DocumentData, Transaction, DocumentReference } from 'firebase-admin/firestore';
import { errors } from './errors';

export function closingTime(event: DocumentData): number {
  return Math.min(
    event.registrationDeadline?.toMillis() ?? Infinity,
    event.endAt?.toMillis() ?? Infinity,
  );
}
export function actionOpen(event: DocumentData, reg?: DocumentData, now = Date.now()): boolean {
  return (
    event.status === 'published' &&
    (now < closingTime(event) || (reg?.correctionExpiresAt?.toMillis() ?? 0) > now)
  );
}
export function effectiveSignup(event: DocumentData, reg: DocumentData, now = Date.now()): string {
  if (reg.signupStatus === 'started' && !actionOpen(event, reg, now)) return 'expired';
  return reg.signupStatus ?? 'submitted';
}
export function holdsCapacity(event: DocumentData, reg: DocumentData): boolean {
  return reg.accountDeleted !== true && effectiveSignup(event, reg) !== 'expired';
}
export function assertCapacity(event: DocumentData, registrations: DocumentData[], count: number) {
  if (
    event.capacity != null &&
    registrations
      .filter((r) => holdsCapacity(event, r))
      .reduce((sum, r) => sum + (r.attendees?.length ?? 0), 0) +
      count >
      event.capacity
  ) {
    throw errors.failedPrecondition(
      'This event has reached capacity. Please contact an organizer.',
    );
  }
}
export function workflowEligible(reg: DocumentData): boolean {
  if (reg.accountDeleted === true) return false;
  return (
    reg.workflowVersion !== 1 ||
    (reg.signupStatus === 'submitted' && (reg.totalAmount === 0 || reg.reviewStatus === 'approved'))
  );
}
export function notice(
  tx: Transaction,
  regRef: DocumentReference,
  reg: DocumentData,
  id: string,
  title: string,
  body: string,
  type = 'payment',
  reviewRevision?: number,
) {
  const eventId = regRef.parent.parent!.id;
  tx.set(getFirestore().doc(`users/${reg.userId}/notifications/${eventId}-${regRef.id}-${id}`), {
    title,
    body,
    type,
    eventId,
    registrationId: regRef.id,
    createdAt: Timestamp.now(),
    deliveryStatus: 'pending',
    nextAttemptAt: Timestamp.now(),
    attempts: 0,
    ...(reviewRevision !== undefined ? { reviewRevision } : {}),
  });
}
