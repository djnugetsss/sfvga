import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { collectTokensForUsers, truncateBody } from './audience';
import { sendPushToTokens } from '../shared/pushNotifications';

interface AnnouncementDoc {
  title: string;
  body: string;
  eventId?: string;
}

async function fanOutAnnouncement(
  announcement: AnnouncementDoc,
  announcementId: string,
  eventId?: string,
): Promise<void> {
  const db = getFirestore();
  let userIds: string[];

  if (eventId) {
    const registrations = await db.collection(`events/${eventId}/registrations`).get();
    userIds = [...new Set(registrations.docs.map((doc) => doc.data().userId as string).filter(Boolean))];
  } else {
    const usersSnap = await db.collection('users').get();
    userIds = usersSnap.docs.map((doc) => doc.id);
  }

  if (userIds.length === 0) return;

  const users = await Promise.all(
    userIds.map(async (uid) => {
      const snap = await db.doc(`users/${uid}`).get();
      if (!snap.exists) return null;
      return {
        uid,
        expoPushTokens: snap.data()?.expoPushTokens as string[] | undefined,
        fcmTokens: snap.data()?.fcmTokens as string[] | undefined,
        notificationPrefs: snap.data()?.notificationPrefs as
          | { announcements?: boolean; eventReminders?: boolean }
          | undefined,
      };
    }),
  );

  const tokens = collectTokensForUsers(
    users.filter((user): user is NonNullable<typeof user> => user !== null),
    'announcements',
  );

  await sendPushToTokens(tokens, {
    title: announcement.title,
    body: truncateBody(announcement.body),
    data: {
      type: 'announcement',
      announcementId,
      ...(eventId ? { eventId } : {}),
    },
  });
}

/**
 * Top-level announcement created → FCM fan-out (tech design §11).
 * When `eventId` is set on the doc, only registered attendees are targeted;
 * otherwise every member is notified.
 */
export const notifications_onOrgAnnouncementCreated = onDocumentCreated(
  'announcements/{announcementId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data() as AnnouncementDoc;
    await fanOutAnnouncement(data, event.params.announcementId, data.eventId);
  },
);

/** Event-scoped announcement created → FCM to registered attendees only (tech design §9). */
export const notifications_onEventAnnouncementCreated = onDocumentCreated(
  'events/{eventId}/announcements/{announcementId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data() as AnnouncementDoc;
    await fanOutAnnouncement(data, event.params.announcementId, event.params.eventId);
  },
);
