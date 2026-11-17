import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import type { Timestamp } from 'firebase-admin/firestore';
import { collectTokensForUsers, isTomorrowInTimeZone } from './audience';
import { sendPushToTokens } from '../shared/pushNotifications';
import { workflowEligible } from '../shared/paymentWorkflow';

/**
 * notifications_eventReminder — scheduled daily. Sends a single "1 day before" push to
 * members registered for events starting tomorrow (tech design §11). One simple job.
 */
export const notifications_eventReminder = onSchedule(
  {
    schedule: '0 9 * * *',
    timeZone: 'America/Los_Angeles',
  },
  async () => {
    const db = getFirestore();
    const now = new Date();

    const eventsSnap = await db.collection('events').where('status', '==', 'published').get();
    const tomorrowEvents = eventsSnap.docs.filter((doc) => {
      const startAt = doc.get('startAt') as Timestamp | undefined;
      if (!startAt) return false;
      return isTomorrowInTimeZone(startAt.toDate(), 'America/Los_Angeles', now);
    });

    for (const eventDoc of tomorrowEvents) {
      const eventId = eventDoc.id;
      const title = (eventDoc.get('title') as string | undefined) ?? 'Your event';
      const startAt = (eventDoc.get('startAt') as Timestamp).toDate();
      const locationName = (eventDoc.get('location') as { name?: string } | undefined)?.name;

      const registrationsSnap = await db.collection(`events/${eventId}/registrations`).get();

      for (const regDoc of registrationsSnap.docs) {
        const reg = regDoc.data();
        if (!workflowEligible(reg)) continue;
        if (reg.eventReminderSent === true) continue;

        const userId = reg.userId as string | undefined;
        if (!userId) continue;

        const userSnap = await db.doc(`users/${userId}`).get();
        if (!userSnap.exists) continue;

        const user = {
          uid: userId,
          expoPushTokens: userSnap.data()?.expoPushTokens as string[] | undefined,
          fcmTokens: userSnap.data()?.fcmTokens as string[] | undefined,
          notificationPrefs: userSnap.data()?.notificationPrefs as
            | { announcements?: boolean; eventReminders?: boolean }
            | undefined,
        };

        const tokens = collectTokensForUsers([user], 'eventReminders');
        if (tokens.length > 0) {
          const dateLabel = startAt.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
          await sendPushToTokens(tokens, {
            title: `Reminder: ${title} is tomorrow`,
            body: locationName ? `${dateLabel} · ${locationName}` : dateLabel,
            data: { type: 'event_reminder', eventId },
          });
        }

        await regDoc.ref.update({ eventReminderSent: true });
      }
    }
  },
);
