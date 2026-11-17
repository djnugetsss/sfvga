import { onCall } from 'firebase-functions/v2/https';
import { requireAdminPermission, requireOrganizationPermission } from '../shared/adminAccess';

/**
 * gallery_moderatePhoto — admin approves or rejects a pending photo (tech design §9).
 * Approved photos go live and trigger the "Photos are up!" notification.
 */
export const gallery_moderatePhoto = onCall(async (request) => {
  const eventId = typeof request.data?.eventId === 'string' ? request.data.eventId : undefined;
  if (eventId) await requireAdminPermission(request, 'gallery.manage', eventId);
  else await requireOrganizationPermission(request, 'gallery.manage');

  // TODO: Phase 7 — set the photo status to "approved" or "rejected" for the given path.
  throw new Error('gallery_moderatePhoto not implemented — Phase 7 (Community Features)');
});
