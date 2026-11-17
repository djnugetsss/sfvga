import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { DocumentReference } from 'firebase-admin/firestore';
import { sendPushToTokens } from '../shared/pushNotifications';
import { getAuth } from 'firebase-admin/auth';
import { resolveAdminAccess, hasPermission } from '../shared/adminAccess';

/** FCM rejects a data payload containing undefined or other non-string values. */
export function notificationPushData(notice: Record<string, unknown>): Record<string, string> {
  const data: Record<string, string> = {};
  for (const key of ['type', 'eventId', 'registrationId']) {
    if (typeof notice[key] === 'string') data[key] = notice[key];
  }
  return data;
}

async function deliver(ref: DocumentReference) {
  const db = getFirestore();
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    if (
      !data ||
      data.deliveryStatus !== 'pending' ||
      (data.leaseUntil?.toMillis() ?? 0) > Date.now() ||
      (data.nextAttemptAt?.toMillis() ?? 0) > Date.now()
    )
      return null;
    if (data.reviewRevision !== undefined) {
      const reg = await tx.get(
        db.doc(`events/${data.eventId}/registrations/${data.registrationId}`),
      );
      if (!reg.exists || reg.get('reviewRevision') !== data.reviewRevision) {
        tx.update(ref, { deliveryStatus: 'superseded' });
        return null;
      }
    }
    tx.update(ref, {
      leaseUntil: Timestamp.fromMillis(Date.now() + 120000),
      attempts: (data.attempts ?? 0) + 1,
    });
    return data;
  });
  if (!claimed) return;
  const user = await ref.parent.parent!.get();
  if (
    claimed.type === 'event_published' &&
    user.get('notificationPrefs')?.announcements === false
  ) {
    await ref.update({ deliveryStatus: 'suppressed', leaseUntil: Timestamp.fromMillis(0) });
    return;
  }
  if (typeof claimed.type === 'string' && claimed.type.startsWith('admin_')) {
    const auth = await getAuth().getUser(user.id);
    const access = await resolveAdminAccess(user.id, auth.customClaims);
    const permitted =
      claimed.type === 'admin_photo_album_reminder'
        ? hasPermission(access, 'events.view', claimed.eventId) &&
          hasPermission(access, 'events.edit', claimed.eventId)
        : hasPermission(access, 'registrations.view', claimed.eventId) &&
          hasPermission(access, 'registrations.manage', claimed.eventId);
    if (auth.disabled || !permitted) {
      await ref.update({ deliveryStatus: 'superseded', leaseUntil: Timestamp.fromMillis(0) });
      return;
    }
  }
  const tokens = [...(user.get('expoPushTokens') ?? []), ...(user.get('fcmTokens') ?? [])];
  const sent = tokens.length
    ? await sendPushToTokens(tokens, {
        title: claimed.title,
        body: claimed.body,
        data: notificationPushData(claimed),
      })
    : 0;
  await ref.update({
    deliveryStatus: !tokens.length ? 'no_tokens' : sent ? 'sent' : 'pending',
    leaseUntil: Timestamp.fromMillis(0),
    lastAttemptAt: Timestamp.now(),
    nextAttemptAt: Timestamp.fromMillis(
      Date.now() + Math.min(86400000, 600000 * 2 ** Math.min(claimed.attempts ?? 0, 7)),
    ),
  });
}
export const notifications_deliverMemberNotice = onDocumentCreated(
  { document: 'users/{uid}/notifications/{noticeId}', retry: true },
  async (event) => {
    if (event.data) await deliver(event.data.ref);
  },
);
export const notifications_retryMemberNotices = onSchedule('every 10 minutes', async () => {
  for (const collection of ['notifications', 'adminNotifications']) {
    const pending = await getFirestore()
      .collectionGroup(collection)
      .where('deliveryStatus', '==', 'pending')
      .where('nextAttemptAt', '<=', Timestamp.now())
      .orderBy('nextAttemptAt')
      .limit(100)
      .get();
    for (const doc of pending.docs) {
      try {
        await deliver(doc.ref);
      } catch (error) {
        console.error('Notification retry failed', doc.ref.path, error);
      }
    }
  }
});

export const notifications_deliverAdminNotice = onDocumentCreated(
  { document: 'users/{uid}/adminNotifications/{noticeId}', retry: true },
  async (event) => {
    if (event.data) await deliver(event.data.ref);
  },
);
