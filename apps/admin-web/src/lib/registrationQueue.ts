import type { Event, Registration } from '@sfvga/shared-types';
import { toDate } from './formatters';

/** Past events stay available in event history, but leave active admin inboxes. */
export function isEventPast(event: Event, now: number): boolean {
  return event.status === 'ended' || (toDate(event.endAt)?.getTime() ?? Infinity) <= now;
}

export function registrationAttentionState(
  event: Event,
  reg: Registration,
  now: number,
): string | null {
  if (
    reg.accountDeleted ||
    reg.workflowVersion !== 1 ||
    reg.totalAmount === 0 ||
    reg.reviewStatus === 'approved'
  )
    return null;
  if (reg.signupStatus === 'submitted') {
    return reg.reviewStatus === 'rejected'
      ? 'Payment issue'
      : reg.resubmittedAt
        ? 'Payment updated'
        : 'Awaiting review';
  }
  const close = Math.min(
    toDate(event.registrationDeadline)?.getTime() ?? Infinity,
    toDate(event.endAt)?.getTime() ?? Infinity,
  );
  return reg.signupStatus === 'started' &&
    event.status === 'published' &&
    (now < close || now < (toDate(reg.correctionExpiresAt)?.getTime() ?? 0))
    ? 'Waiting for member'
    : null;
}
