import { Timestamp } from 'firebase-admin/firestore';
import {
  actionOpen,
  assertCapacity,
  effectiveSignup,
  workflowEligible,
} from '../../src/shared/paymentWorkflow';
import { validateEventPublication } from '../../src/events/eventFields';
import {
  paymentDecisionsSchema,
  registrationFinishSchema,
  eventCreateSchema,
} from '@sfvga/shared-validation';

const now = 2_000_000_000_000;
const event = {
  status: 'published',
  registrationDeadline: Timestamp.fromMillis(now),
  startAt: Timestamp.fromMillis(now - 1000),
  endAt: Timestamp.fromMillis(now + 10000),
  capacity: 2,
};
describe('manual payment workflow boundaries', () => {
  afterEach(() => jest.restoreAllMocks());
  it('closes exactly at the deadline, including existing open screens', () => {
    expect(actionOpen(event, undefined, now - 1)).toBe(true);
    expect(actionOpen(event, undefined, now)).toBe(false);
  });
  it('exceptions reopen only the supplied signup until the exception expires', () => {
    const reg = { correctionExpiresAt: Timestamp.fromMillis(now + 1000) };
    expect(actionOpen(event, reg, now)).toBe(true);
    expect(actionOpen(event, undefined, now)).toBe(false);
    expect(actionOpen(event, reg, now + 1000)).toBe(false);
  });
  it('does not reopen unpublished events', () => {
    expect(
      actionOpen(
        { ...event, status: 'ended' },
        { correctionExpiresAt: Timestamp.fromMillis(now + 1000) },
        now,
      ),
    ).toBe(false);
  });
  it('expires unfinished signups but retains submitted issues', () => {
    expect(effectiveSignup(event, { signupStatus: 'started' }, now)).toBe('expired');
    expect(
      effectiveSignup(event, { signupStatus: 'submitted', reviewStatus: 'rejected' }, now),
    ).toBe('submitted');
  });
  it('reserves places for started signups while registration is open', () => {
    jest.spyOn(Date, 'now').mockReturnValue(now - 1);
    expect(() =>
      assertCapacity(event, [{ signupStatus: 'started', attendees: [{}, {}] }], 1),
    ).toThrow(/capacity/);
  });
  it('releases expired places but keeps completed registrations in capacity', () => {
    jest.spyOn(Date, 'now').mockReturnValue(now);
    expect(() =>
      assertCapacity(event, [{ signupStatus: 'started', attendees: [{}, {}] }], 2),
    ).not.toThrow();
    expect(() =>
      assertCapacity(event, [{ signupStatus: 'submitted', attendees: [{}, {}] }], 1),
    ).toThrow(/capacity/);
  });
  it('preserves all historical ticket eligibility explicitly', () => {
    expect(workflowEligible({ paymentStatus: 'free', totalAmount: 40 })).toBe(true);
  });
  it.each(['started', 'expired'])('never releases %s signup tickets', (signupStatus) => {
    expect(
      workflowEligible({
        workflowVersion: 1,
        signupStatus,
        reviewStatus: 'approved',
        totalAmount: 20,
      }),
    ).toBe(false);
  });
  it('holds and restores tickets on Yes → No → Yes without changing ticket documents', () => {
    const reg = { workflowVersion: 1, signupStatus: 'submitted', totalAmount: 30 };
    expect(
      ['approved', 'rejected', 'approved'].map((reviewStatus) =>
        workflowEligible({ ...reg, reviewStatus }),
      ),
    ).toEqual([true, false, true]);
  });
  it('allows submitted zero-total signups without payment review', () => {
    expect(
      workflowEligible({ workflowVersion: 1, signupStatus: 'submitted', totalAmount: 0 }),
    ).toBe(true);
  });
  it('requires payment setup for publication, but not free events or drafts', () => {
    expect(() => validateEventPublication({ ...event, pricing: { member: 5, guest: 10 } })).toThrow(
      /payment link/,
    );
    expect(() =>
      validateEventPublication({ ...event, pricing: { member: 0, guest: 0 } }),
    ).not.toThrow();
    expect(() =>
      validateEventPublication({ ...event, status: 'draft', pricing: { member: 5, guest: 10 } }),
    ).not.toThrow();
  });
  it('requires payer name, bounds confirmation batches and rejects path traversal', () => {
    expect(
      registrationFinishSchema.safeParse({
        eventId: 'e',
        registrationId: 'r',
        requestId: 'x',
        payerName: ' ',
      }).success,
    ).toBe(false);
    expect(
      paymentDecisionsSchema.safeParse({ eventId: 'e/other', requestId: 'x', decisions: [] })
        .success,
    ).toBe(false);
    expect(
      paymentDecisionsSchema.safeParse({
        eventId: 'e',
        requestId: 'x',
        decisions: Array.from({ length: 26 }, () => ({
          registrationId: 'r',
          approved: true,
          expectedRevision: 0,
        })),
      }).success,
    ).toBe(false);
  });
  it('only accepts HTTPS payment links', () => {
    const schema = eventCreateSchema.shape.paymentUrl;
    expect(schema.safeParse('https://example.com/pay').success).toBe(true);
    expect(schema.safeParse('javascript:alert(1)').success).toBe(false);
    expect(schema.safeParse('http://example.com').success).toBe(false);
  });
});
