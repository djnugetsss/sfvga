import { functionsClient } from '@/services/functionsClient';

let lastPreparedAt = 0;
let inFlight: Promise<void> | null = null;

/** Warm the create callable once while an authorized admin is browsing. */
export function prepareEventCreation(): Promise<void> {
  if (Date.now() - lastPreparedAt < 5 * 60_000) return Promise.resolve();
  if (inFlight) return inFlight;
  inFlight = Promise.resolve()
    .then(() => functionsClient.call('events_create', { prepare: true }))
    .then(() => {
      lastPreparedAt = Date.now();
    })
    .catch(() => {
      // Creation still performs normal validation and authorization on submit.
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
