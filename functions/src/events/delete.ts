import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { requireOrganizationPermission } from '../shared/adminAccess';
import { safeEventId } from './eventFields';

/** Remove one event and its nested registrations, messages, tickets, and roles. */
export const events_delete = onCall(async (request) => {
  const eventId = safeEventId(request.data?.eventId);
  await requireOrganizationPermission(request, 'events.delete');

  const db = getFirestore();
  await db.recursiveDelete(db.doc(`events/${eventId}`));

  // Organization announcements live outside the event tree. Keep this repeatable so
  // a retry can finish cleanup if an earlier attempt stopped after the event was removed.
  let hasMoreAnnouncements = true;
  while (hasMoreAnnouncements) {
    const announcements = await db
      .collection('announcements')
      .where('eventId', '==', eventId)
      .limit(400)
      .get();
    hasMoreAnnouncements = !announcements.empty;
    if (!hasMoreAnnouncements) break;
    const batch = db.batch();
    announcements.docs.forEach((announcement) => batch.delete(announcement.ref));
    await batch.commit();
  }

  return { success: true };
});
