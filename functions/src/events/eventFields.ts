import { Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { normalizeEventPricing } from '@sfvga/shared-validation';
import { errors } from '../shared/errors';

export function eventFields(input: Record<string, unknown>): DocumentData {
  const fields: DocumentData = { ...input };
  delete fields.eventId;
  for (const key of ['startAt', 'endAt', 'registrationDeadline']) {
    if (typeof fields[key] === 'string') fields[key] = Timestamp.fromDate(new Date(fields[key]));
  }
  return fields;
}

export function validateEventPublication(event: DocumentData): void {
  if (event.endAt.toMillis() <= event.startAt.toMillis()) {
    throw errors.invalidArgument('The event end must be after its start.');
  }
  if (
    event.registrationDeadline &&
    event.registrationDeadline.toMillis() > event.endAt.toMillis()
  ) {
    throw errors.invalidArgument('Registration must close no later than the event end.');
  }
  const pricing = normalizeEventPricing(event.pricing);
  const priced = pricing.member > 0 || pricing.guest > 0 || (pricing.childRule?.price ?? 0) > 0;
  if (
    event.status === 'published' &&
    priced &&
    (!event.paymentUrl || !event.registrationDeadline)
  ) {
    throw errors.failedPrecondition(
      'Add an HTTPS payment link and registration closing date/time before publishing a priced event.',
    );
  }
}

export function safeEventId(value: unknown): string {
  if (typeof value !== 'string' || !/^[^/]{1,128}$/.test(value))
    throw errors.invalidArgument('A valid event is required.');
  return value;
}
