import { onCall } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { requireAdminPermission, requireOrganizationPermission } from '../shared/adminAccess';

const announcementSendSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(5000),
  eventId: z.string().min(1).max(128).optional(),
});

/**
 * announcements_send — admin composes an announcement, chooses the audience (everyone or
 * people registered for an event), and sends. Writes the doc; FCM fan-out is handled by
 * the onCreate triggers (tech design §9, §11).
 */
export const announcements_send = onCall(async (request) => {
  const { title, body, eventId } = announcementSendSchema.parse(request.data);
  const { uid } = eventId
    ? await requireAdminPermission(request, 'announcements.create', eventId)
    : await requireOrganizationPermission(request, 'announcements.create');

  const db = getFirestore();
  const payload = {
    title,
    body,
    createdBy: uid,
    createdAt: Timestamp.now(),
    ...(eventId ? { eventId } : {}),
  };

  // Always write the top-level feed so the mobile app can show the announcement.
  // `eventId` on the doc scopes push to registrants via onOrgAnnouncementCreated.
  const ref = await db.collection('announcements').add(payload);

  return { announcementId: ref.id };
});
