import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { effectiveSignup } from '../shared/paymentWorkflow';

/** UI and capacity checks expire immediately; this job materializes the retained status. */
export const registrations_expirePending = onSchedule('every 5 minutes', async () => {
  const db = getFirestore();
  const pending = await db
    .collectionGroup('registrations')
    .where('signupStatus', '==', 'started')
    .get();
  for (const doc of pending.docs) {
    await db.runTransaction(async (tx) => {
      const [reg, event] = await Promise.all([tx.get(doc.ref), tx.get(doc.ref.parent.parent!)]);
      if (
        reg.exists &&
        event.exists &&
        reg.get('signupStatus') === 'started' &&
        effectiveSignup(event.data()!, reg.data()!) === 'expired'
      ) {
        tx.update(doc.ref, { signupStatus: 'expired', expiredAt: Timestamp.now() });
        tx.update(event.ref, { registrationVersion: (event.get('registrationVersion') ?? 0) + 1 });
      }
    });
  }
});
