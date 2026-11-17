import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { events_delete } from '../../src/events/delete';

const enabled = Boolean(
  process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST,
);
const projectId = process.env.GCLOUD_PROJECT || 'demo-sfvga-event-delete';
if (enabled && !projectId.startsWith('demo-')) {
  throw new Error('Event deletion tests require an isolated demo-* project.');
}
if (enabled && !getApps().length) initializeApp({ projectId });

(enabled ? describe : describe.skip)('events_delete with Auth and Firestore emulators', () => {
  jest.setTimeout(60000);

  it('requires organization delete permission and removes only the selected event tree', async () => {
    const db = getFirestore();
    const adminUid = (await getAuth().createUser({})).uid;
    const memberUid = (await getAuth().createUser({})).uid;
    await getAuth().setCustomUserClaims(adminUid, { superAdmin: true });

    const eventId = `delete-${crypto.randomUUID()}`;
    const otherId = `keep-${crypto.randomUUID()}`;
    const event = db.doc(`events/${eventId}`);
    const other = db.doc(`events/${otherId}`);
    const registration = event.collection('registrations').doc(memberUid);
    const announcement = db.collection('announcements').doc(`event-${eventId}`);
    const unrelatedAnnouncement = db.collection('announcements').doc(`event-${otherId}`);
    await Promise.all([
      event.set({ title: 'Delete me' }),
      other.set({ title: 'Keep me' }),
      registration.set({ userId: memberUid }),
      registration.collection('messages').doc('one').set({ body: 'Private message' }),
      registration.collection('tickets').doc('one').set({ qrPayload: 'test' }),
      event.collection('roles').doc('one').set({ userId: adminUid }),
      event.collection('roleDefinitions').doc('one').set({ name: 'Role' }),
      event.collection('announcements').doc('one').set({ title: 'Event notice' }),
      announcement.set({ eventId, title: 'Organization notice' }),
      unrelatedAnnouncement.set({ eventId: otherId, title: 'Keep this notice' }),
    ]);

    const request = (uid: string, superAdmin: boolean) =>
      ({
        data: { eventId },
        auth: {
          uid,
          token: superAdmin ? { superAdmin: true, role: 'admin' } : { role: 'member' },
        },
      }) as any;

    await expect(events_delete.run(request(memberUid, false))).rejects.toMatchObject({
      code: 'permission-denied',
    });
    expect((await event.get()).exists).toBe(true);

    await expect(events_delete.run(request(adminUid, true))).resolves.toEqual({ success: true });
    expect((await event.get()).exists).toBe(false);
    expect((await registration.get()).exists).toBe(false);
    expect((await registration.collection('messages').doc('one').get()).exists).toBe(false);
    expect((await registration.collection('tickets').doc('one').get()).exists).toBe(false);
    expect((await event.collection('roles').doc('one').get()).exists).toBe(false);
    expect((await event.collection('roleDefinitions').doc('one').get()).exists).toBe(false);
    expect((await event.collection('announcements').doc('one').get()).exists).toBe(false);
    expect((await announcement.get()).exists).toBe(false);
    expect((await other.get()).exists).toBe(true);
    expect((await unrelatedAnnouncement.get()).exists).toBe(true);

    await expect(events_delete.run(request(adminUid, true))).resolves.toEqual({ success: true });
  });
});
