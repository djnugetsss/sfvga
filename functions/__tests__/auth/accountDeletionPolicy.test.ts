import {
  registrationNamesExpireAt,
  scrubRegistrationNames,
} from '../../src/auth/accountDeletionPolicy';
import { holdsCapacity, workflowEligible } from '../../src/shared/paymentWorkflow';

describe('account deletion and interim name retention', () => {
  it('keeps names six months from the event end, including future events', () => {
    const deletedAt = new Date('2026-01-01T12:00:00Z');
    expect(
      registrationNamesExpireAt(new Date('2026-02-15T18:00:00Z'), deletedAt).toISOString(),
    ).toBe('2026-08-15T18:00:00.000Z');
  });

  it('does not roll a month-end deadline past six calendar months', () => {
    expect(
      registrationNamesExpireAt(new Date('2026-08-31T18:00:00Z'), new Date()).toISOString(),
    ).toBe('2027-02-28T18:00:00.000Z');
  });

  it('allows immediate name removal when a past event is already over six months old', () => {
    const expiry = registrationNamesExpireAt(
      new Date('2025-01-01T00:00:00Z'),
      new Date('2026-11-13T00:00:00Z'),
    );
    expect(expiry.getTime()).toBeLessThan(new Date('2026-11-13T00:00:00Z').getTime());
  });

  it('anonymizes attendee names without changing count or pricing attributes', () => {
    const original = {
      attendees: [
        { name: 'A', ageGroup: 'adult' },
        { name: 'B', ageGroup: 'child' },
      ],
    };
    expect(scrubRegistrationNames(original).attendees).toEqual([
      { name: 'Former member', ageGroup: 'adult' },
      { name: 'Former member', ageGroup: 'child' },
    ]);
    expect(original.attendees[0].name).toBe('A');
  });

  it('rejects screenshot scans for deleted accounts, even for historical or approved tickets', () => {
    expect(workflowEligible({ accountDeleted: true, paymentStatus: 'paid' })).toBe(false);
    expect(
      workflowEligible({
        accountDeleted: true,
        workflowVersion: 1,
        signupStatus: 'submitted',
        reviewStatus: 'approved',
        totalAmount: 10,
      }),
    ).toBe(false);
    expect(
      workflowEligible({
        accountDeleted: true,
        workflowVersion: 1,
        signupStatus: 'submitted',
        reviewStatus: 'approved',
        totalAmount: 0,
      }),
    ).toBe(false);
  });

  it('releases a deleted account’s reserved attendee places', () => {
    expect(
      holdsCapacity({ status: 'published' }, { accountDeleted: true, signupStatus: 'submitted' }),
    ).toBe(false);
  });
});
