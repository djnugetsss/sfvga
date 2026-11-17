import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore, Timestamp, type DocumentData } from 'firebase-admin/firestore';

/** A publish transition merits an alert only while members can still register. */
export function publishedEventNotice(
  before: DocumentData | undefined,
  after: DocumentData | undefined,
  now = Date.now(),
) {
  if (!after || after.status !== 'published' || before?.status === 'published') return null;
  if ((after.endAt?.toMillis?.() ?? 0) <= now) return null;
  if (after.registrationDeadline && after.registrationDeadline.toMillis() <= now) return null;
  return {
    title: `New event: ${after.title}`,
    body: 'Registration is open. View the event details and sign up in SFVGA.',
  };
}

/** A durable per-member notice makes publication visible even without a push token. */
export const notifications_eventPublished = onDocumentWritten(
  { document: 'events/{eventId}', retry: true },
  async (event) => {
    const after = event.data?.after.data();
    const notice = publishedEventNotice(event.data?.before.data(), after);
    if (!notice) return;

    const db = getFirestore();
    const users = await db.collection('users').get();
    const noticeId = `event-published-${event.params.eventId}`;
    // Create-only writes keep retries and unpublish/republish from sending duplicate alerts.
    for (let index = 0; index < users.docs.length; index += 50) {
      await Promise.all(
        users.docs.slice(index, index + 50).map(async (user) => {
          try {
            await user.ref
              .collection('notifications')
              .doc(noticeId)
              .create({
                ...notice,
                type: 'event_published',
                eventId: event.params.eventId,
                eventTitle: after?.title,
                createdAt: Timestamp.now(),
                deliveryStatus: 'pending',
                nextAttemptAt: Timestamp.now(),
                attempts: 0,
              });
          } catch (error) {
            if ((error as { code?: number }).code !== 6) throw error;
          }
        }),
      );
    }
  },
);
