import { registrationAttentionNotice } from '../../src/notifications/registrationAttention';
const started = {
  workflowVersion: 1,
  signupStatus: 'started',
  reviewStatus: 'pending',
  totalAmount: 10,
};
const submitted = { ...started, signupStatus: 'submitted' };
describe('registration notification transitions', () => {
  it('waits for member completion before notifying about a paid signup', () => {
    expect(registrationAttentionNotice(undefined, started)).toBeNull();
    expect(registrationAttentionNotice(started, submitted)?.key).toBe('submitted');
    expect(
      registrationAttentionNotice(undefined, {
        ...submitted,
        totalAmount: 0,
        reviewStatus: 'approved',
      }),
    ).toBeNull();
  });
  it('notifies once per payment update or rejection, not unrelated writes', () => {
    const rejected = { ...submitted, reviewStatus: 'rejected', reviewRevision: 1 };
    const updated = { ...submitted, lastResubmissionRequest: 'retry-1' };
    expect(registrationAttentionNotice(submitted, rejected)?.key).toBe('issue-1');
    expect(registrationAttentionNotice(rejected, updated)?.key).toBe('resubmitted-retry-1');
    expect(registrationAttentionNotice(updated, updated)).toBeNull();
    expect(registrationAttentionNotice(submitted, { ...submitted, adminUnread: true })).toBeNull();
  });
  it('never notifies for approval updates, expiration, or historical records', () => {
    for (const after of [
      undefined,
      { ...started, workflowVersion: undefined },
      { ...submitted, totalAmount: 0 },
      { ...started, signupStatus: 'expired' },
      { ...submitted, reviewStatus: 'approved' },
    ]) {
      expect(registrationAttentionNotice(started, after)).toBeNull();
    }
  });
});
