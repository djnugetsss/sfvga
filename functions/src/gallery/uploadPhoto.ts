import { onCall } from 'firebase-functions/v2/https';
import { requireAuth } from '../shared/requireAuth';

/**
 * gallery_uploadPhoto — records a member-uploaded photo with status "pending" so it can
 * enter the admin moderation queue (tech design §9). The file itself lives in Storage.
 */
export const gallery_uploadPhoto = onCall(async (request) => {
  requireAuth(request);

  // TODO: Phase 7 — create gallery/{albumId}/photos/{id} with status "pending",
  // uploadedBy = caller uid, and the Storage URL.
  throw new Error('gallery_uploadPhoto not implemented — Phase 7 (Community Features)');
});
