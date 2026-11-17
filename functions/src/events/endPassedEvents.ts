import { onSchedule } from 'firebase-functions/v2/scheduler';

/**
 * events_endPassedEvents — scheduled daily. Flips status "published" → "ended"
 * for events whose endAt has passed (tech design doc §5). One small job, not a fleet.
 */
export const events_endPassedEvents = onSchedule('every day 03:00', async () => {
  // TODO: Phase 2 — query published events where endAt < now, batch-update status to "ended".
  throw new Error('events_endPassedEvents not implemented — Phase 2 (Events & Registration)');
});
