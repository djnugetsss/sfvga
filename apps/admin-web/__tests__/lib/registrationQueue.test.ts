import type { Event, Registration } from '@sfvga/shared-types';
import { isEventPast, registrationAttentionState } from '@/lib/registrationQueue';
const event = {
  status: 'published',
  registrationDeadline: { seconds: 100, nanoseconds: 0 },
} as Event;
const reg = {
  workflowVersion: 1,
  totalAmount: 25,
  signupStatus: 'started',
  reviewStatus: 'pending',
} as Registration;
describe('registration attention queue', () => {
  it('hides ended events from active inboxes but not events still in progress', () => {
    const scheduled = { ...event, endAt: { seconds: 200, nanoseconds: 0 } };
    expect(isEventPast(scheduled, 199999)).toBe(false);
    expect(isEventPast(scheduled, 200000)).toBe(true);
    expect(isEventPast({ ...scheduled, status: 'ended' }, 100000)).toBe(true);
  });
  it('removes unfinished reservations exactly at closing', () => {
    expect(registrationAttentionState(event, reg, 99999)).toBe('Waiting for member');
    expect(registrationAttentionState(event, reg, 100000)).toBeNull();
  });
  it('retains completed pending and rejected signups after closing', () => {
    expect(registrationAttentionState(event, { ...reg, signupStatus: 'submitted' }, 100001)).toBe(
      'Awaiting review',
    );
    expect(
      registrationAttentionState(
        event,
        { ...reg, signupStatus: 'submitted', reviewStatus: 'rejected' },
        100001,
      ),
    ).toBe('Payment issue');
  });
  it('distinguishes payment resubmissions', () => {
    expect(
      registrationAttentionState(
        event,
        { ...reg, signupStatus: 'submitted', resubmittedAt: { seconds: 90, nanoseconds: 0 } },
        100001,
      ),
    ).toBe('Payment updated');
  });
  it('excludes approved and free registrations even when they have unread messages', () => {
    expect(
      registrationAttentionState(event, { ...reg, reviewStatus: 'approved', adminUnread: true }, 0),
    ).toBeNull();
    expect(registrationAttentionState(event, { ...reg, totalAmount: 0 }, 0)).toBeNull();
  });
  it('honors a correction window but never silently reopens an expired record', () => {
    const exception = { ...reg, correctionExpiresAt: { seconds: 200, nanoseconds: 0 } };
    expect(registrationAttentionState(event, exception, 150000)).toBe('Waiting for member');
    expect(
      registrationAttentionState(event, { ...exception, signupStatus: 'expired' }, 150000),
    ).toBeNull();
  });
});
