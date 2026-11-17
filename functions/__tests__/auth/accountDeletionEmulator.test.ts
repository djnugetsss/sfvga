import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { auth_deleteAccount, auth_purgeRegistrationNames } from '../../src/auth/deleteAccount';

const enabled = Boolean(
  process.env.FIRESTORE_EMULATOR_HOST &&
  process.env.FIREBASE_AUTH_EMULATOR_HOST &&
  process.env.FIREBASE_STORAGE_EMULATOR_HOST,
);
const projectId = process.env.GCLOUD_PROJECT || 'demo-sfvga-account-deletion';
if (enabled && !projectId.startsWith('demo-'))
  throw new Error('Deletion tests require a demo-* project.');
if (enabled && !getApps().length) initializeApp({ projectId });

(enabled ? describe : describe.skip)('account deletion with isolated Firebase emulators', () => {
  jest.setTimeout(120000);

  it('removes the account, messages and photo; holds a past event record without usable tickets', async () => {
    const db = getFirestore();
    const uid = (await getAuth().createUser({ phoneNumber: '+15555550123' })).uid;
    const eventId = `deletion-${crypto.randomUUID()}`;
    const event = db.doc(`events/${eventId}`);
    const reg = event.collection('registrations').doc(uid);
    const upcoming = db.doc(`events/${eventId}-future`);
    const futureReg = upcoming.collection('registrations').doc(uid);
    const bucket = getStorage().bucket('sfvga-cabe6.firebasestorage.app');
    const photo = bucket.file(`users/${uid}/profile/test.jpg`);

    await Promise.all([
      db.doc(`users/${uid}`).set({ uid, displayName: 'Test Member', phone: '+15555550123' }),
      db.doc(`users/${uid}/familyMembers/f1`).set({ name: 'Family Member' }),
      db.doc(`users/${uid}/notifications/n1`).set({ title: 'Notice' }),
      event.set({
        title: 'Past event',
        endAt: Timestamp.fromDate(new Date('2025-01-01T00:00:00Z')),
      }),
      upcoming.set({
        title: 'Future event',
        endAt: Timestamp.fromDate(new Date('2027-01-01T00:00:00Z')),
      }),
      reg.set({
        userId: uid,
        attendees: [{ name: 'Test Member', ageGroup: 'adult' }],
        payerName: 'Test Member',
        paymentNote: 'Private note',
        accountPhone: '+15555550123',
        workflowVersion: 1,
        signupStatus: 'submitted',
        reviewStatus: 'approved',
        totalAmount: 10,
      }),
      reg.collection('messages').doc('m1').set({ senderId: uid, body: 'Private message' }),
      futureReg.set({
        userId: uid,
        attendees: [{ name: 'Test Member', ageGroup: 'adult' }],
        payerName: 'Test Member',
        workflowVersion: 1,
        signupStatus: 'submitted',
        reviewStatus: 'approved',
        totalAmount: 10,
      }),
      reg
        .collection('tickets')
        .doc('t1')
        .set({ attendeeName: 'Test Member', qrPayloadEncrypted: 'fake-qr', status: 'valid' }),
      photo.save(Buffer.from('test'), { contentType: 'image/jpeg' }),
    ]);

    await expect(
      auth_deleteAccount.run({
        data: { confirm: 'DELETE' },
        auth: { uid, token: { role: 'member', auth_time: Math.floor(Date.now() / 1000) - 3600 } },
      } as any),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect((await db.doc(`users/${uid}`).get()).exists).toBe(true);

    const result = await auth_deleteAccount.run({
      data: { confirm: 'DELETE' },
      auth: { uid, token: { role: 'member', auth_time: Math.floor(Date.now() / 1000) } },
    } as any);
    expect(result).toEqual({ status: 'completed' });
    await expect(getAuth().getUser(uid)).rejects.toMatchObject({ code: 'auth/user-not-found' });
    expect((await db.doc(`users/${uid}`).get()).exists).toBe(false);
    expect((await db.doc(`users/${uid}/familyMembers/f1`).get()).exists).toBe(false);
    expect((await db.doc(`users/${uid}/notifications/n1`).get()).exists).toBe(false);
    expect((await reg.collection('messages').doc('m1').get()).exists).toBe(false);
    expect((await photo.exists())[0]).toBe(false);
    expect((await db.doc(`accountDeletionJobs/${uid}`).get()).get('status')).toBe('completed');
    const historical = (await reg.get()).data()!;
    expect(historical).toMatchObject({
      accountDeleted: true,
      userId: 'deleted-account',
      attendees: [{ name: 'Former member', ageGroup: 'adult' }],
      totalAmount: 10,
    });
    expect(historical.accountPhone).toBeUndefined();
    expect(historical.paymentNote).toBeUndefined();
    expect(historical.payerName).toBeUndefined();
    expect((await reg.collection('tickets').doc('t1').get()).data()).toMatchObject({
      status: 'revoked',
      attendeeName: 'Former member',
      qrPayloadEncrypted: '',
    });
    const future = (await futureReg.get()).data()!;
    expect(future.attendees[0].name).toBe('Test Member');
    expect(future.payerName).toBe('Test Member');
    expect(future.registrationNamesPurgeAt.toDate().toISOString()).toBe('2027-07-01T00:00:00.000Z');
    await futureReg.update({ registrationNamesPurgeAt: Timestamp.fromMillis(Date.now() - 1) });
    await auth_purgeRegistrationNames.run({ scheduleTime: new Date().toISOString() } as any);
    const purged = (await futureReg.get()).data()!;
    expect(purged.attendees[0].name).toBe('Former member');
    expect(purged.payerName).toBeUndefined();
    expect(purged.registrationNamesPurgeAt).toBeUndefined();
  });

  it('does not orphan the organization by deleting its only super admin', async () => {
    const uid = (await getAuth().createUser({})).uid;
    await getAuth().setCustomUserClaims(uid, { superAdmin: true });
    await getFirestore().doc(`users/${uid}`).set({ uid, displayName: 'Admin' });
    await expect(
      auth_deleteAccount.run({
        data: { confirm: 'DELETE' },
        auth: { uid, token: { superAdmin: true, auth_time: Math.floor(Date.now() / 1000) } },
      } as any),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect((await getFirestore().doc(`users/${uid}`).get()).exists).toBe(true);
    expect((await getAuth().getUser(uid)).disabled).toBe(false);
  });
});
