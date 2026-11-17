import { onCall } from 'firebase-functions/v2/https';
import { requireAdmin } from '../shared/requireAdmin';

/**
 * documents_delete — admin removes a document from the library (metadata + Storage file).
 */
export const documents_delete = onCall(async (request) => {
  requireAdmin(request);

  // TODO: Phase 7 — delete documentLibrary/{id} and its backing Storage object.
  throw new Error('documents_delete not implemented — Phase 7 (Community Features)');
});
