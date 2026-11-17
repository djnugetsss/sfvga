import { onCall } from 'firebase-functions/v2/https';
import { requireAdmin } from '../shared/requireAdmin';

/**
 * documents_upload — admin adds a document to the member-facing document library
 * (tech design §9). The file lives in Storage; this records the metadata.
 */
export const documents_upload = onCall(async (request) => {
  requireAdmin(request);

  // TODO: Phase 7 — create documentLibrary/{id} with title, fileUrl, uploadedBy.
  throw new Error('documents_upload not implemented — Phase 7 (Community Features)');
});
