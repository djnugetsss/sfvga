import { createRequire } from 'node:module';
import { setTimeout } from 'node:timers/promises';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const projectId = 'demo-sfvga-payment-ui';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8180' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9198') {
  throw new Error('Seed script only operates against the dedicated local payment emulators.');
}
initializeApp({ projectId });
const auth = getAuth();
const db = getFirestore();
const now = Timestamp.now();
for (const [index, role] of ['member', 'organizer'].entries()) {
  const uid = `payment-test-${role}`;
  try { await auth.getUser(uid); }
  catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    await auth.createUser({ uid, email: `${role}@sfvga.test`, password: 'sfvga-local-test-only',
      phoneNumber: `+1818555010${index + 1}`, displayName: `Test ${role}` });
    // Let the normal onCreate profile trigger finish before applying test fixtures.
    for (let attempt = 0; attempt < 40; attempt++) {
      if ((await db.doc(`users/${uid}`).get()).exists) break;
      await setTimeout(500);
    }
    if (!(await db.doc(`users/${uid}`).get()).exists) throw new Error('Auth profile trigger did not finish. Check the Functions emulator.');
  }
  if (role === 'organizer') await auth.setCustomUserClaims(uid, { role: 'admin', adminLevel: 'super', superAdmin: true });
  await db.doc(`users/${uid}`).set({ uid, displayName: `Test ${role}`, phone: `+1818555010${index + 1}`,
    role: role === 'organizer' ? 'admin' : 'member', membership: { id: uid, status: 'active', expiresAt: Timestamp.fromMillis(Date.now() + 365 * 86400000) },
    notificationPrefs: { announcements: true, eventReminders: true, pushEnabled: false }, createdAt: now, updatedAt: now }, { merge: true });
}
for (const [id, title, price] of [['payment-test-priced', 'TEST — payment verification', 10], ['payment-test-free', 'TEST — free registration', 0]]) {
  const ref = db.doc(`events/${id}`);
  if ((await ref.get()).exists) continue;
  await ref.set({ title, description: 'This is isolated test data. No money is collected. The example.com link stands in for a payment service; return to SFVGA to finish registration.',
    status: 'published', paymentUrl: 'https://example.com/?sfvga-payment-test',
    pricing: { member: price, guest: price }, faqs: [], capacity: 50,
    location: { name: 'Test venue', address: 'Local test environment', lat: 34.2, lng: -118.5 },
    startAt: Timestamp.fromMillis(Date.now() + 2 * 86400000), endAt: Timestamp.fromMillis(Date.now() + 3 * 86400000),
    registrationDeadline: Timestamp.fromMillis(Date.now() + 86400000), createdAt: now, updatedAt: now, createdBy: 'payment-test-organizer' });
}
console.log('Test member and organizer accounts, priced event, and free event are ready.');
