import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import type { DocumentData } from 'firebase-admin/firestore';
import { notifyRegistrationManagers } from '../shared/adminRegistrationNotices';

export function registrationAttentionNotice(
  before: DocumentData | undefined,
  after: DocumentData | undefined,
) {
  if (
    !after ||
    after.accountDeleted ||
    after.workflowVersion !== 1 ||
    after.signupStatus === 'expired'
  )
    return null;
  if (after.totalAmount === 0) return null;
  if (after.reviewStatus === 'approved') return null;
  if (after.signupStatus === 'submitted') {
    if (before?.signupStatus !== 'submitted')
      return {
        key: 'submitted',
        title: 'Registration ready for review',
        body: 'A member finished registration. Review their payment when you’re ready.',
      };
    if (
      after.lastResubmissionRequest &&
      after.lastResubmissionRequest !== before.lastResubmissionRequest
    )
      return {
        key: `resubmitted-${after.lastResubmissionRequest}`,
        title: 'Payment updated',
        body: 'A member updated their payment and requested another review.',
      };
    if (after.reviewStatus === 'rejected' && before.reviewStatus !== 'rejected')
      return {
        key: `issue-${after.reviewRevision}`,
        title: 'Payment needs follow-up',
        body: 'A registration has a payment issue. Open it to review the status or contact the member.',
      };
  }
  return null;
}

export const notifications_registrationAttention = onDocumentWritten(
  { document: 'events/{eventId}/registrations/{registrationId}', retry: true },
  async (event) => {
    const after = event.data?.after.data();
    const notice = registrationAttentionNotice(event.data?.before.data(), after);
    if (!notice) return;
    await notifyRegistrationManagers({
      ...notice,
      id: `attention-${event.params.eventId}-${event.params.registrationId}-${notice.key}`,
      eventId: event.params.eventId,
      registrationId: event.params.registrationId,
      type: 'admin_registration_attention',
      // Member actions should reach managers even when the member is also an admin.
      actorId: notice.key.startsWith('issue-') ? after?.reviewedBy : undefined,
    });
  },
);
