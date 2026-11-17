import { onSchedule } from 'firebase-functions/v2/scheduler';

/**
 * backups_dailyExport — scheduled daily. Calls the standard Firestore managed-export API
 * to a Storage bucket (tech design §15). Built-in export is enough — no custom tooling.
 */
export const backups_dailyExport = onSchedule('every day 02:00', async () => {
  // TODO: Phase 8 — trigger a Firestore export to the backups bucket via the
  // Firestore Admin export API.
  throw new Error('backups_dailyExport not implemented — Phase 8 (Hardening & Launch)');
});
