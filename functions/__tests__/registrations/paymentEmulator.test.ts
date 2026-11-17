import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { registrations_create } from '../../src/registrations/create';
import { events_create } from '../../src/events/create';
import { registrations_finish } from '../../src/registrations/finish';
import { registrations_confirmPayments } from '../../src/registrations/confirmPayments';
import { registrations_requestReview } from '../../src/registrations/requestReview';
import { registrations_grantCorrection } from '../../src/registrations/grantCorrection';
import { registrations_sendMessage } from '../../src/registrations/sendMessage';
import { notifications_registrationMessage } from '../../src/notifications/registrationMessage';
import { registrations_markMessagesRead } from '../../src/registrations/markMessagesRead';
import { tickets_onRegistrationConfirmed } from '../../src/tickets/onRegistrationConfirmed';
import { tickets_validate } from '../../src/tickets/validate';
import {
  notifyEventEditors,
  notifyRegistrationManagers,
} from '../../src/shared/adminRegistrationNotices';

const enabled = Boolean(
  process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST,
);
const projectId = process.env.GCLOUD_PROJECT || 'demo-sfvga-payment';
if (enabled && !projectId.startsWith('demo-'))
  throw new Error('Payment integration tests require an isolated demo-* project.');
if (enabled && !getApps().length) initializeApp({ projectId });
const integration = enabled ? describe : describe.skip;
// Run with Firestore rules loaded by firebase emulators:exec; never connect to production.
integration('manual payment integration with real Auth / Firestore emulators', () => {
  jest.setTimeout(60000);
  let member: { uid: string; token: string };
  let other: { uid: string; token: string };
  let adminUid: string;
  let eventId: string;
  const attendee = { familyMemberId: 'self', name: 'Test member', ageGroup: 'adult', ageYears: 40 };
  const request = (uid: string, data: unknown, admin = false): any => ({
    data,
    auth: {
      uid,
      token: {
        sub: uid,
        ...(admin ? { superAdmin: true, role: 'admin', adminLevel: 'super' } : {}),
      },
    },
  });
  async function signup() {
    const response = await fetch(
      `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnSecureToken: true }),
      },
    );
    const data = (await response.json()) as { localId: string; idToken: string };
    return { uid: data.localId, token: data.idToken };
  }
  async function rest(path: string, token: string, method = 'GET', fields?: object) {
    return fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/${path}`,
      {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(fields ? { body: JSON.stringify({ fields }) } : {}),
      },
    );
  }
  const regRef = () => getFirestore().doc(`events/${eventId}/registrations/${member.uid}`);
  const action = (extra = {}) => ({
    eventId,
    registrationId: member.uid,
    requestId: crypto.randomUUID(),
    ...extra,
  });
  async function start(uid = member.uid) {
    return registrations_create.run(request(uid, { eventId, attendees: [attendee] }));
  }
  async function finish() {
    return registrations_finish.run(
      request(member.uid, action({ payerName: 'Test payer', paymentNote: 'Reference 123' })),
    );
  }
  async function decide(approved: boolean, revision: number, requestId = crypto.randomUUID()) {
    return registrations_confirmPayments.run(
      request(
        adminUid,
        {
          eventId,
          requestId,
          decisions: [{ registrationId: member.uid, approved, expectedRevision: revision }],
        },
        true,
      ),
    );
  }
  async function mint() {
    const after = await regRef().get();
    await tickets_onRegistrationConfirmed.run({
      data: { after },
      params: { eventId, registrationId: member.uid },
    } as any);
  }
  beforeEach(async () => {
    member = await signup();
    other = await signup();
    adminUid = (await getAuth().createUser({})).uid;
    await getAuth().setCustomUserClaims(adminUid, { superAdmin: true });
    eventId = `test-${crypto.randomUUID()}`;
    await getFirestore()
      .doc(`events/${eventId}`)
      .set({
        title: 'Emulator event',
        status: 'published',
        capacity: 1,
        pricing: { member: 10, guest: 20 },
        paymentUrl: 'https://example.com/pay',
        startAt: Timestamp.fromMillis(Date.now() + 3600000),
        endAt: Timestamp.fromMillis(Date.now() + 7200000),
        registrationDeadline: Timestamp.fromMillis(Date.now() + 1800000),
      });
    await getFirestore().doc(`users/${member.uid}`).set({ phone: '+15555550123' });
    process.env.QR_SIGNING_KEY = 'emulator-only-secret';
  });
  it('prepares event creation for a current super admin without creating an event', async () => {
    const db = getFirestore();
    const before = await db.collection('events').get();
    await expect(events_create.run(request(adminUid, { prepare: true }, true))).resolves.toEqual({
      ready: true,
    });
    await expect(events_create.run(request(member.uid, { prepare: true }))).rejects.toMatchObject({
      code: 'permission-denied',
    });
    const after = await db.collection('events').get();
    expect(after.size).toBe(before.size);
  });
  it('allows event staff to load role lists directly while denying unrelated members the grant list', async () => {
    const db = getFirestore();
    await db.doc(`events/${eventId}/roleDefinitions/staff-viewer`).set({
      name: 'Staff viewer',
      active: true,
      permissions: ['staff.view'],
    });
    await db.doc(`events/${eventId}/roles/${other.uid}`).set({
      userId: other.uid,
      roleDefinitionId: 'staff-viewer',
      activatesAt: Timestamp.fromMillis(Date.now() - 1000),
      expiresAt: Timestamp.fromMillis(Date.now() + 60000),
    });
    expect((await rest(`events/${eventId}/roleDefinitions`, other.token)).status).toBe(200);
    expect((await rest(`events/${eventId}/roles`, other.token)).status).toBe(200);
    expect((await rest(`events/${eventId}/roles`, member.token)).status).toBe(403);
  });
  it('delivers separate durable admin notices only to current registration managers', async () => {
    const db = getFirestore();
    const role = db.doc(`events/${eventId}/roleDefinitions/reviewer`);
    const grant = db.doc(`events/${eventId}/roles/${other.uid}`);
    await role.set({ active: true, permissions: ['registrations.view'] });
    await grant.set({
      userId: other.uid,
      roleDefinitionId: 'reviewer',
      activatesAt: Timestamp.fromMillis(Date.now() - 1000),
      expiresAt: Timestamp.fromMillis(Date.now() + 60000),
    });
    const input = {
      id: `test-${eventId}`,
      eventId,
      registrationId: member.uid,
      title: 'New message',
      body: 'A member sent a private registration message.',
      type: 'admin_registration_message' as const,
      actorId: member.uid,
    };
    await notifyRegistrationManagers(input);
    const target = `users/${other.uid}/adminNotifications/${input.id}`;
    expect((await db.doc(target).get()).exists).toBe(false);
    expect((await db.doc(`users/${adminUid}/adminNotifications/${input.id}`).get()).exists).toBe(
      true,
    );
    expect((await db.doc(`users/${member.uid}/adminNotifications/${input.id}`).get()).exists).toBe(
      false,
    );
    await role.update({ permissions: ['registrations.view', 'registrations.manage'] });
    await notifyRegistrationManagers(input);
    const first = (await db.doc(target).get()).get('createdAt');
    await notifyRegistrationManagers(input);
    expect((await db.doc(target).get()).get('createdAt').isEqual(first)).toBe(true);
    expect((await rest(target, other.token)).status).toBe(200);
    expect((await rest(target, member.token)).status).toBe(403);
    expect(
      (await rest(target, other.token, 'PATCH', { body: { stringValue: 'Forged' } })).status,
    ).toBe(403);
    expect(
      (
        await rest(`users/${other.uid}/adminNotifications/forged`, other.token, 'PATCH', {
          eventId: { stringValue: eventId },
        })
      ).status,
    ).toBe(403);
    // A server timestamp transform is the only allowed client write.
    const response = await fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents:commit`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${other.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          writes: [
            {
              transform: {
                document: `projects/${projectId}/databases/(default)/documents/${target}`,
                fieldTransforms: [{ fieldPath: 'readAt', setToServerValue: 'REQUEST_TIME' }],
              },
            },
          ],
        }),
      },
    );
    expect(response.status).toBe(200);
    expect((await db.doc(target).get()).get('readAt')).toBeDefined();
    await grant.update({ expiresAt: Timestamp.fromMillis(Date.now() - 1) });
    expect((await rest(target, other.token)).status).toBe(403);
    await notifyRegistrationManagers({ ...input, id: `${input.id}-expired` });
    expect(
      (await db.doc(`users/${other.uid}/adminNotifications/${input.id}-expired`).get()).exists,
    ).toBe(false);
    expect((await db.doc(`users/${other.uid}/notifications/${input.id}`).get()).exists).toBe(false);
  });
  it('scopes photo reminders to current event editors, not registration viewers', async () => {
    const db = getFirestore();
    const role = db.doc(`events/${eventId}/roleDefinitions/photo-editor`);
    const grant = db.doc(`events/${eventId}/roles/${other.uid}`);
    await role.set({ active: true, permissions: ['events.view', 'events.edit'] });
    await grant.set({
      userId: other.uid,
      roleDefinitionId: 'photo-editor',
      activatesAt: Timestamp.fromMillis(Date.now() - 1000),
      expiresAt: Timestamp.fromMillis(Date.now() + 60000),
    });
    const photoId = `photo-album-${eventId}`;
    await notifyEventEditors({
      id: photoId,
      eventId,
      title: 'Add event photos',
      body: 'Add an album link.',
    });
    const photoPath = `users/${other.uid}/adminNotifications/${photoId}`;
    expect((await db.doc(photoPath).get()).exists).toBe(true);
    expect((await rest(photoPath, other.token)).status).toBe(200);
    expect((await rest(photoPath, member.token)).status).toBe(403);
    const queryNotices = (type: string) =>
      fetch(
        `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/users/${other.uid}:runQuery`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${other.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId: 'adminNotifications' }],
              where: {
                compositeFilter: {
                  op: 'AND',
                  filters: [
                    {
                      fieldFilter: {
                        field: { fieldPath: 'eventId' },
                        op: 'EQUAL',
                        value: { stringValue: eventId },
                      },
                    },
                    {
                      fieldFilter: {
                        field: { fieldPath: 'type' },
                        op: 'EQUAL',
                        value: { stringValue: type },
                      },
                    },
                  ],
                },
              },
            },
          }),
        },
      );
    expect((await queryNotices('admin_photo_album_reminder')).status).toBe(200);
    const registrationPath = `users/${other.uid}/adminNotifications/registration-${eventId}`;
    await db.doc(registrationPath).set({
      eventId,
      type: 'admin_registration_attention',
      title: 'Registration issue',
      body: 'Review.',
    });
    expect((await rest(registrationPath, other.token)).status).toBe(403);
    expect((await queryNotices('admin_registration_attention')).status).toBe(403);
    await grant.update({ expiresAt: Timestamp.fromMillis(Date.now() - 1000) });
    expect((await rest(photoPath, other.token)).status).toBe(403);
  });
  it('enforces event-scoped manager permissions, including private-message access', async () => {
    await start();
    await finish();
    const db = getFirestore();
    const role = db.doc(`events/${eventId}/roleDefinitions/reviewer`);
    await role.set({ active: true, name: 'View only', permissions: ['registrations.view'] });
    await db.doc(`events/${eventId}/roles/${other.uid}`).set({
      userId: other.uid,
      roleDefinitionId: 'reviewer',
      activatesAt: Timestamp.fromMillis(Date.now() - 1000),
      expiresAt: Timestamp.fromMillis(Date.now() + 60000),
    });
    const input = {
      eventId,
      requestId: crypto.randomUUID(),
      decisions: [{ registrationId: member.uid, approved: true, expectedRevision: 0 }],
    };
    await expect(registrations_confirmPayments.run(request(other.uid, input))).rejects.toThrow(
      /permission/,
    );
    await expect(
      registrations_sendMessage.run(request(other.uid, action({ body: 'Not allowed' }))),
    ).rejects.toThrow(/permission/);
    expect((await rest(`events/${eventId}/registrations/${member.uid}`, other.token)).status).toBe(
      200,
    );
    await role.update({ permissions: ['registrations.view', 'registrations.manage'] });
    expect((await registrations_confirmPayments.run(request(other.uid, input))).results[0].ok).toBe(
      true,
    );
    await registrations_sendMessage.run(request(other.uid, action({ body: 'Organizer reply' })));
    const messageId = (await regRef().collection('messages').get()).docs[0].id;
    expect(
      (
        await rest(
          `events/${eventId}/registrations/${member.uid}/messages/${messageId}`,
          other.token,
        )
      ).status,
    ).toBe(200);
    await expect(
      registrations_confirmPayments.run(
        request(other.uid, { ...input, eventId: 'different-event' }),
      ),
    ).rejects.toThrow(/permission/);
  });
  it('issues free tickets without review and never publishes ready before ticket generation succeeds', async () => {
    await getFirestore()
      .doc(`events/${eventId}`)
      .update({ pricing: { member: 0, guest: 0 } });
    await start();
    expect((await regRef().get()).get('signupStatus')).toBe('submitted');
    process.env.QR_SIGNING_KEY = '';
    await expect(mint()).rejects.toThrow(/secret/);
    expect((await regRef().collection('tickets').get()).size).toBe(0);
    expect((await getFirestore().collection(`users/${member.uid}/notifications`).get()).size).toBe(
      0,
    );
    process.env.QR_SIGNING_KEY = 'emulator-only-secret';
    await mint();
    expect((await regRef().collection('tickets').get()).size).toBe(1);
    expect((await getFirestore().collection(`users/${member.uid}/notifications`).get()).size).toBe(
      1,
    );
  });
  it('permanently rejects saved QR screenshots after a dispute and issues a fresh QR', async () => {
    await start();
    await finish();
    await decide(true, 0);
    await mint();
    const payload = (await regRef().collection('tickets').doc('attendee-0').get()).get(
      'qrPayloadEncrypted',
    );
    await decide(false, 1);
    expect(
      (await tickets_validate.run(request(adminUid, { eventId, scannedString: payload }, true)))
        .outcome,
    ).toBe('invalid');
    await decide(true, 2);
    process.env.QR_SIGNING_KEY = '';
    await expect(mint()).rejects.toThrow(/secret/);
    expect((await regRef().collection('tickets').doc('attendee-0-g1').get()).exists).toBe(false);
    expect((await regRef().get()).get('ticketsReadyRevision')).toBe(1);
    process.env.QR_SIGNING_KEY = 'emulator-only-secret';
    await mint();
    expect(
      (await tickets_validate.run(request(adminUid, { eventId, scannedString: payload }, true)))
        .outcome,
    ).toBe('invalid');
    const replacement = await regRef().collection('tickets').doc('attendee-0-g1').get();
    expect(replacement.get('qrPayloadEncrypted')).not.toBe(payload);
    expect(replacement.get('generation')).toBe(1);
    const newPayload = replacement.get('qrPayloadEncrypted');
    expect(
      (await tickets_validate.run(request(adminUid, { eventId, scannedString: newPayload }, true)))
        .outcome,
    ).toBe('checked_in');
    expect(
      (await tickets_validate.run(request(adminUid, { eventId, scannedString: newPayload }, true)))
        .outcome,
    ).toBe('already_redeemed');
  });
  it('does not reopen an expired reservation when another signup has taken its capacity', async () => {
    await start();
    await regRef().update({ signupStatus: 'expired' });
    await start(other.uid);
    await expect(
      registrations_grantCorrection.run(
        request(
          adminUid,
          action({
            expiresAt: new Date(Date.now() + 60000).toISOString(),
            explanation: 'Please complete your payment.',
          }),
          true,
        ),
      ),
    ).rejects.toThrow(/capacity/);
  });
  it('serializes competing capacity reservations and resumes the same locked signup', async () => {
    const results = await Promise.allSettled([start(), start(other.uid)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const docs = await getFirestore().collection(`events/${eventId}/registrations`).get();
    expect(docs.size).toBe(1);
    const winner = docs.docs[0].get('userId');
    await start(winner);
    expect((await docs.docs[0].ref.get()).get('totalAmount')).toBe(10);
  });
  it('resolves simultaneous admin decisions without losing a revision', async () => {
    await start();
    await finish();
    const outcomes = await Promise.all([decide(true, 0), decide(false, 0)]);
    expect(outcomes.filter((result) => result.results[0].ok)).toHaveLength(1);
    expect((await regRef().get()).get('reviewRevision')).toBe(1);
  });
  it('preserves historical QR identifiers and rejects forged legacy payloads', async () => {
    const db = getFirestore();
    const ref = regRef();
    await ref.set({
      userId: member.uid,
      attendees: [attendee],
      totalAmount: 10,
      paymentStatus: 'free',
      createdAt: Timestamp.now(),
      confirmationPushSent: true,
      confirmationEmailSent: true,
    });
    const payload =
      'SFVGADEV1.' +
      Buffer.from(
        JSON.stringify({
          eventId,
          registrationId: member.uid,
          ticketId: 'old-ticket',
          attendeeName: attendee.name,
        }),
      ).toString('base64');
    await ref
      .collection('tickets')
      .doc('old-ticket')
      .set({ attendeeName: attendee.name, qrPayloadEncrypted: payload, status: 'valid' });
    await mint();
    expect((await ref.collection('tickets').get()).docs.map((doc) => doc.id)).toEqual([
      'old-ticket',
    ]);
    expect(
      (await tickets_validate.run(request(adminUid, { eventId, scannedString: payload }, true)))
        .outcome,
    ).toBe('checked_in');
    const forged =
      'SFVGADEV1.' +
      Buffer.from(
        JSON.stringify({
          eventId,
          registrationId: member.uid,
          ticketId: 'old-ticket',
          attendeeName: 'Forged',
        }),
      ).toString('base64');
    expect(
      (await tickets_validate.run(request(adminUid, { eventId, scannedString: forged }, true)))
        .outcome,
    ).toBe('invalid');
    expect((await db.doc(`events/${eventId}`).get()).exists).toBe(true);
  });
  it('submits, detects stale decisions, and preserves revoked/redeemed state on Yes → No → Yes', async () => {
    await start();
    await finish();
    const id = crypto.randomUUID();
    expect((await decide(true, 0, id)).results[0].ok).toBe(true);
    await mint();
    await mint();
    const ticketRef = regRef().collection('tickets').doc('attendee-0');
    expect((await regRef().collection('tickets').get()).size).toBe(1);
    expect((await decide(true, 0, id)).results[0].ok).toBe(true);
    expect((await decide(false, 0)).results[0].ok).toBe(false);
    await ticketRef.update({ status: 'revoked' });
    await decide(false, 1);
    const payload = (await ticketRef.get()).get('qrPayloadEncrypted');
    expect(
      (await tickets_validate.run(request(adminUid, { eventId, scannedString: payload }, true)))
        .outcome,
    ).toBe('invalid');
    await decide(true, 2);
    await mint();
    expect((await ticketRef.get()).get('status')).toBe('revoked');
    expect((await ticketRef.get()).get('qrPayloadEncrypted')).toBe(payload);
    expect((await regRef().collection('tickets').doc('attendee-0-g1').get()).exists).toBe(false);
    await ticketRef.update({ status: 'redeemed', redeemedAt: Timestamp.now() });
    await decide(false, 3);
    await decide(true, 4);
    await mint();
    expect((await ticketRef.get()).get('status')).toBe('redeemed');
    expect((await regRef().collection('tickets').doc('attendee-0-g2').get()).exists).toBe(false);
  });
  it('blocks incomplete approvals, closes completion, and requires a capacity-checked exception', async () => {
    await start();
    expect((await decide(true, 0)).results[0].ok).toBe(false);
    await getFirestore()
      .doc(`events/${eventId}`)
      .update({ registrationDeadline: Timestamp.fromMillis(Date.now() - 1) });
    await expect(finish()).rejects.toThrow(/closed/);
    await registrations_grantCorrection.run(
      request(
        adminUid,
        action({
          expiresAt: new Date(Date.now() + 60000).toISOString(),
          explanation: 'Payment correction approved.',
        }),
        true,
      ),
    );
    await finish();
    expect((await regRef().get()).get('signupStatus')).toBe('submitted');
  });
  it('keeps a submitted signup after closing and reopens only its payment review', async () => {
    await start();
    await finish();
    await decide(false, 0);
    await getFirestore()
      .doc(`events/${eventId}`)
      .update({
        registrationDeadline: Timestamp.fromMillis(Date.now() - 1000),
      });
    await expect(start(other.uid)).rejects.toThrow(/closed/);
    await expect(
      registrations_requestReview.run(
        request(member.uid, action({ payerName: 'Corrected payer' })),
      ),
    ).rejects.toThrow(/organizer/);
    await registrations_grantCorrection.run(
      request(
        adminUid,
        action({
          expiresAt: new Date(Date.now() + 60000).toISOString(),
          explanation: 'Please use the saved payment link.',
        }),
        true,
      ),
    );
    expect((await regRef().get()).get('signupStatus')).toBe('submitted');
    await registrations_requestReview.run(
      request(member.uid, action({ payerName: 'Corrected payer' })),
    );
    expect((await regRef().get()).get('reviewStatus')).toBe('pending');
    expect((await regRef().get()).get('resubmittedAt')).toBeTruthy();
  });
  it('does not grant a correction window after the event ends', async () => {
    await start();
    await finish();
    await decide(false, 0);
    await getFirestore()
      .doc(`events/${eventId}`)
      .update({
        endAt: Timestamp.fromMillis(Date.now() - 1000),
        registrationDeadline: Timestamp.fromMillis(Date.now() - 2000),
      });
    await expect(
      registrations_grantCorrection.run(
        request(
          adminUid,
          action({
            expiresAt: new Date(Date.now() + 60000).toISOString(),
            explanation: 'Too late for another payment.',
          }),
          true,
        ),
      ),
    ).rejects.toThrow(/before the event ends/);
  });
  it('persists private notices without push tokens and accepts a resubmission only once', async () => {
    await start();
    await finish();
    await decide(false, 0);
    expect((await getFirestore().collection(`users/${member.uid}/notifications`).get()).size).toBe(
      1,
    );
    const input = action({ payerName: 'Corrected payer' });
    await registrations_requestReview.run(request(member.uid, input));
    await registrations_requestReview.run(request(member.uid, input));
    expect((await regRef().get()).get('reviewRevision')).toBe(2);
    await registrations_sendMessage.run(
      request(member.uid, action({ body: 'Please review my corrected payment.' })),
    );
    expect((await regRef().get()).get('adminUnread')).toBe(true);
  });
  it('prepares messaging without writing and honors event-scoped registration access', async () => {
    await start();
    const db = getFirestore();
    const prepare = (senderRole: 'member' | 'organizer') => ({
      eventId,
      registrationId: member.uid,
      senderRole,
      prepare: true,
    });
    await expect(
      registrations_sendMessage.run(request(member.uid, prepare('member'))),
    ).resolves.toEqual({ ready: true });
    await expect(
      registrations_sendMessage.run(request(other.uid, prepare('member'))),
    ).rejects.toThrow();
    await expect(
      registrations_sendMessage.run(request(other.uid, prepare('organizer'))),
    ).rejects.toThrow();
    await db.doc(`events/${eventId}/roleDefinitions/message-manager`).set({
      name: 'Message manager',
      active: true,
      permissions: ['registrations.manage'],
    });
    await db.doc(`events/${eventId}/roles/${other.uid}`).set({
      userId: other.uid,
      roleDefinitionId: 'message-manager',
      activatesAt: Timestamp.fromMillis(Date.now() - 1000),
      expiresAt: Timestamp.fromMillis(Date.now() + 60000),
    });
    await expect(
      registrations_sendMessage.run(request(other.uid, prepare('organizer'))),
    ).resolves.toEqual({ ready: true });
    expect((await regRef().collection('messages').get()).empty).toBe(true);
    expect((await regRef().get()).get('adminUnread')).toBeFalsy();
    await registrations_sendMessage.run(
      request(other.uid, action({ body: 'Staff reply', senderRole: 'organizer' })),
    );
    await db.doc(`events/${eventId}/roles/${other.uid}`).update({ revokedAt: Timestamp.now() });
    await expect(
      registrations_sendMessage.run(request(other.uid, prepare('organizer'))),
    ).rejects.toThrow();
  });
  it('clears unread from the actual viewed message, but never clears newer unseen replies', async () => {
    await start();
    const first = action({ body: 'First message' });
    await registrations_sendMessage.run(request(member.uid, first));
    await regRef().update({ lastMessageId: 'stale-pointer' });
    await registrations_markMessagesRead.run(
      request(adminUid, action({ lastMessageId: first.requestId }), true),
    );
    expect((await regRef().get()).get('adminUnread')).toBe(false);
    const second = action({ body: 'New message' });
    await registrations_sendMessage.run(request(member.uid, second));
    await registrations_markMessagesRead.run(
      request(adminUid, action({ lastMessageId: first.requestId }), true),
    );
    expect((await regRef().get()).get('adminUnread')).toBe(true);
    await expect(
      registrations_markMessagesRead.run(
        request(other.uid, action({ lastMessageId: second.requestId })),
      ),
    ).rejects.toThrow();
    await registrations_markMessagesRead.run(
      request(adminUid, action({ lastMessageId: second.requestId }), true),
    );
    expect((await regRef().get()).get('adminUnread')).toBe(false);
    await regRef().update({ adminUnread: true, memberUnread: true });
    await expect(
      registrations_markMessagesRead.run(
        request(member.uid, action({ lastMessageId: second.requestId, audience: 'admin' })),
      ),
    ).rejects.toThrow();
    expect((await regRef().get()).get('adminUnread')).toBe(true);
    await getAuth().setCustomUserClaims(member.uid, {
      superAdmin: true,
      role: 'admin',
      adminLevel: 'super',
    });
    await registrations_markMessagesRead.run(
      request(member.uid, action({ lastMessageId: second.requestId, audience: 'admin' }), true),
    );
    expect((await regRef().get()).get('adminUnread')).toBe(false);
    expect((await regRef().get()).get('memberUnread')).toBe(true);
  });
  it('routes messages to both inboxes when an organizer also owns the registration', async () => {
    await start();
    const denied = action({ body: 'Impersonation', senderRole: 'organizer' });
    await expect(registrations_sendMessage.run(request(member.uid, denied))).rejects.toThrow();
    await expect(
      registrations_sendMessage.run(
        request(adminUid, action({ body: 'Not the owner', senderRole: 'member' }), true),
      ),
    ).rejects.toThrow();
    await expect(
      registrations_sendMessage.run(
        request(member.uid, action({ body: 'Invalid role', senderRole: 'system' })),
      ),
    ).rejects.toThrow();
    await getAuth().setCustomUserClaims(member.uid, { superAdmin: true });
    const reply = action({ body: 'Organizer reply', senderRole: 'organizer' });
    await registrations_sendMessage.run(request(member.uid, reply, true));
    await registrations_sendMessage.run(request(member.uid, reply, true));
    expect(
      (await regRef().collection('messages').doc(reply.requestId).get()).get('senderRole'),
    ).toBe('organizer');
    expect((await regRef().get()).get('memberUnread')).toBe(true);
    const memberNotices = await getFirestore()
      .collection(`users/${member.uid}/notifications`)
      .get();
    expect(memberNotices.size).toBe(1);
    expect(memberNotices.docs[0].get('type')).toBe('registration_message');
    expect(memberNotices.docs[0].get('body')).not.toContain(reply.body);

    const message = action({ body: 'Member reply', senderRole: 'member' });
    await registrations_sendMessage.run(request(member.uid, message, true));
    const snapshot = await regRef().collection('messages').doc(message.requestId).get();
    const event: any = {
      data: snapshot,
      params: { eventId, registrationId: member.uid, messageId: message.requestId },
    };
    await notifications_registrationMessage.run(event);
    await notifications_registrationMessage.run(event);
    const adminNotices = await getFirestore()
      .collection(`users/${member.uid}/adminNotifications`)
      .get();
    expect(adminNotices.size).toBe(1);
    expect(adminNotices.docs[0].get('type')).toBe('admin_registration_message');
    expect(adminNotices.docs[0].get('body')).not.toContain(message.body);
    expect((await regRef().get()).get('adminUnread')).toBe(true);
    expect(
      (await getFirestore().collection(`users/${other.uid}/adminNotifications`).get()).empty,
    ).toBe(true);
    expect(
      (await getFirestore().collection(`users/${adminUid}/adminNotifications`).get()).size,
    ).toBe(1);
    await notifications_registrationMessage.run({
      ...event,
      data: await regRef().collection('messages').doc(reply.requestId).get(),
    });
    expect(
      (await getFirestore().collection(`users/${member.uid}/adminNotifications`).get()).size,
    ).toBe(1);
  });
  it('enforces ownership, private-message isolation, and server-only payment/ticket writes in rules', async () => {
    await start();
    await finish();
    await decide(true, 0);
    await mint();
    await registrations_sendMessage.run(
      request(member.uid, action({ body: 'Private test message' })),
    );
    const path = `events/${eventId}/registrations/${member.uid}`;
    expect((await rest(path, member.token)).status).toBe(200);
    expect((await rest(path, other.token)).status).toBe(403);
    expect((await rest(`${path}/tickets/attendee-0`, other.token)).status).toBe(403);
    const msg = (await regRef().collection('messages').get()).docs[0].id;
    expect((await rest(`${path}/messages/${msg}`, other.token)).status).toBe(403);
    expect(
      (await rest(path, member.token, 'PATCH', { paymentStatus: { stringValue: 'paid' } })).status,
    ).toBe(403);
    expect(
      (
        await rest(`${path}/tickets/forged`, member.token, 'PATCH', {
          status: { stringValue: 'valid' },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await rest(`${path}/tickets/attendee-0`, member.token, 'PATCH', {
          status: { stringValue: 'redeemed' },
        })
      ).status,
    ).toBe(403);
  });
});
