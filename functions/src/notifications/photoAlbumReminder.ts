import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { notifyEventEditors } from '../shared/adminRegistrationNotices';

/** Remind current event editors after the event, without notifying members or scan-only staff. */
export const notifications_photoAlbumReminder = onSchedule(
  { schedule: '0 10 * * *', timeZone: 'America/Los_Angeles' },
  async () => {
    const now = Date.now();
    const events = await getFirestore()
      .collection('events')
      .where('endAt', '>=', Timestamp.fromMillis(now - 72 * 60 * 60 * 1000))
      .where('endAt', '<=', Timestamp.fromMillis(now - 24 * 60 * 60 * 1000))
      .get();

    for (const event of events.docs) {
      if (
        !['published', 'ended'].includes(String(event.get('status'))) ||
        String(event.get('photoAlbumUrl') ?? '').trim()
      )
        continue;
      try {
        await notifyEventEditors({
          id: `photo-album-${event.id}`,
          eventId: event.id,
          title: 'Add event photos',
          body: `The event has ended. Add a photo album link for ${String(event.get('title') || 'this event')} when the photos are ready.`,
        });
      } catch (error) {
        console.error('Could not create photo album reminder', event.id, error);
      }
    }
  },
);
