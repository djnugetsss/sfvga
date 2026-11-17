import { onDocumentUpdated } from 'firebase-functions/v2/firestore';

/**
 * notifications_galleryApprovedNotify — Firestore trigger. When photos in an album become
 * approved, sends a single "Photos are up!" push to that event's attendees (tech §9).
 */
export const notifications_galleryApprovedNotify = onDocumentUpdated(
  'gallery/{albumId}/photos/{photoId}',
  async () => {
    // TODO: Phase 7 — detect status transition to "approved"; debounce so only one
    // notification is sent per album, not one per photo.
    throw new Error(
      'notifications_galleryApprovedNotify not implemented — Phase 7 (Community Features)',
    );
  },
);
