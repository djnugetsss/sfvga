import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as functionsV1 from 'firebase-functions/v1';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { requireAuth } from '../shared/requireAuth';
import { registrationNamesExpireAt, scrubRegistrationNames } from './accountDeletionPolicy';

const TOMBSTONE = 'deleted-account';
// Retry photo cleanup while previously issued ID tokens could still be in circulation.
const COMPLETED_JOB_GRACE_MS = 24 * 60 * 60 * 1000;

/** Firebase Console deletions also need the same cleanup as in-app deletions. */
export const auth_onUserDeleted = functionsV1.auth.user().onDelete(async (user) => {
  const db = getFirestore();
  const jobRef = db.doc(`accountDeletionJobs/${user.uid}`);
  await db.runTransaction(async (tx) => {
    const job = await tx.get(jobRef);
    if (!job.exists) {
      tx.create(jobRef, {
        status: 'pending',
        requestedAt: Timestamp.now(),
        attempts: 0,
        source: 'auth-deletion',
      });
    }
  });
});

async function processAccountDeletion(uid: string): Promise<void> {
  const db = getFirestore();
  const jobRef = db.doc(`accountDeletionJobs/${uid}`);
  const userRef = db.doc(`users/${uid}`);
  const job = await jobRef.get();
  if (!job.exists) return;
  if (job.get('status') === 'completed') return;

  try {
    // A disabled Auth account cannot sign in again while cleanup is retried.
    try {
      await getAuth().updateUser(uid, { disabled: true });
      await getAuth().revokeRefreshTokens(uid);
    } catch (error: unknown) {
      if ((error as { code?: string }).code !== 'auth/user-not-found') throw error;
    }

    // Keep the original userId until each record is fully cleaned so a retry finds it.
    const registrations = await db
      .collectionGroup('registrations')
      .where('userId', '==', uid)
      .get();
    for (const reg of registrations.docs) {
      await reg.ref.update({ accountDeleted: true, accountDeletedAt: Timestamp.now() });
      const event = await reg.ref.parent.parent!.get();
      const eventEnd = event.exists
        ? (event.get('endAt')?.toDate?.() as Date | undefined)
        : undefined;
      const purgeAt = registrationNamesExpireAt(eventEnd ?? new Date(), new Date());
      // QR eligibility is already off. Revoke stored tickets, including previously redeemed ones.
      const tickets = await reg.ref.collection('tickets').get();
      for (const ticket of tickets.docs) {
        await ticket.ref.update({
          status: 'revoked',
          qrPayloadEncrypted: '',
          ...(purgeAt.getTime() <= Date.now() ? { attendeeName: 'Former member' } : {}),
        });
      }
      await db.recursiveDelete(reg.ref.collection('messages'));
      const current = await reg.ref.get();
      const purgeNow = purgeAt.getTime() <= Date.now();
      await reg.ref.update({
        userId: TOMBSTONE,
        accountPhone: FieldValue.delete(),
        paymentNote: FieldValue.delete(),
        memberUnread: FieldValue.delete(),
        adminUnread: FieldValue.delete(),
        lastMessageId: FieldValue.delete(),
        lastMessageAt: FieldValue.delete(),
        correctionExpiresAt: FieldValue.delete(),
        ...(purgeNow
          ? {
              ...scrubRegistrationNames(current.data()!),
              payerName: FieldValue.delete(),
              personalDataPurgedAt: Timestamp.now(),
            }
          : { registrationNamesPurgeAt: Timestamp.fromDate(purgeAt) }),
      });
    }

    // An account can have event-scoped staff roles even without organization-wide access.
    const roles = await db.collectionGroup('roles').where('userId', '==', uid).get();
    for (const role of roles.docs) await role.ref.delete();
    await db.doc(`organizationAdminGrants/${uid}`).delete();
    await db.recursiveDelete(userRef);
    // Storage profile images are scoped under the user's own prefix.
    const bucket = getStorage().bucket('sfvga-cabe6.firebasestorage.app');
    await bucket.deleteFiles({ prefix: `users/${uid}/profile/`, force: true });
    try {
      await getAuth().deleteUser(uid);
    } catch (error: unknown) {
      if ((error as { code?: string }).code !== 'auth/user-not-found') throw error;
    }
    await jobRef.set({ status: 'completed', completedAt: Timestamp.now() }, { merge: true });
  } catch (error) {
    await jobRef.set(
      { status: 'retry', lastAttemptAt: Timestamp.now(), attempts: FieldValue.increment(1) },
      { merge: true },
    );
    console.error('Account deletion requires retry', { uid, error });
    throw error;
  }
}

export const auth_deleteAccount = onCall(async (request) => {
  const uid = requireAuth(request);
  if (request.data?.confirm !== 'DELETE') {
    throw new HttpsError('invalid-argument', 'Confirm account deletion before continuing.');
  }
  const authTime = Number(request.auth?.token.auth_time);
  if (!Number.isFinite(authTime) || Date.now() / 1000 - authTime > 15 * 60) {
    throw new HttpsError(
      'failed-precondition',
      'For security, sign out and sign back in to verify your identity, then delete your account.',
    );
  }
  const db = getFirestore();
  const userRef = db.doc(`users/${uid}`);
  const user = await userRef.get();
  if (!user.exists) throw new HttpsError('not-found', 'Account not found.');
  // Never orphan the organization, but other admins may delete their own account.
  const authUser = await getAuth().getUser(uid);
  if (
    authUser.customClaims?.superAdmin === true ||
    (authUser.customClaims?.role === 'admin' && authUser.customClaims?.adminLevel === 'super')
  ) {
    const users = await getAuth().listUsers(1000);
    const otherSuperAdmin = users.users.some(
      (candidate) =>
        candidate.uid !== uid &&
        !candidate.disabled &&
        (candidate.customClaims?.superAdmin === true ||
          (candidate.customClaims?.role === 'admin' &&
            candidate.customClaims?.adminLevel === 'super')),
    );
    if (!otherSuperAdmin) {
      throw new HttpsError(
        'failed-precondition',
        'Please grant another person Super Admin access before deleting this account.',
      );
    }
  }
  const jobRef = db.doc(`accountDeletionJobs/${uid}`);
  await db.runTransaction(async (tx) => {
    const job = await tx.get(jobRef);
    if (!job.exists)
      tx.create(jobRef, { status: 'pending', requestedAt: Timestamp.now(), attempts: 0 });
    tx.update(userRef, { deletionRequestedAt: Timestamp.now() });
  });
  try {
    await processAccountDeletion(uid);
    return { status: 'completed' };
  } catch {
    // The durable scheduled worker continues the request; do not ask the member to retry.
    return { status: 'processing' };
  }
});

export const auth_processAccountDeletions = onSchedule('every 5 minutes', async () => {
  const collection = getFirestore().collection('accountDeletionJobs');
  const [pending, completed] = await Promise.all([
    collection.where('status', 'in', ['pending', 'retry']).limit(100).get(),
    collection.where('status', '==', 'completed').limit(100).get(),
  ]);
  const jobs = [...pending.docs, ...completed.docs];
  for (const job of jobs) {
    try {
      if (job.get('status') === 'completed') {
        await getStorage()
          .bucket('sfvga-cabe6.firebasestorage.app')
          .deleteFiles({ prefix: `users/${job.id}/profile/`, force: true });
        if (
          (job.get('completedAt')?.toMillis() ?? Date.now()) + COMPLETED_JOB_GRACE_MS <
          Date.now()
        )
          await job.ref.delete();
      } else {
        await processAccountDeletion(job.id);
      }
    } catch {
      /* next run retries */
    }
  }
});

export const auth_purgeRegistrationNames = onSchedule('every 24 hours', async () => {
  const db = getFirestore();
  const due = await db
    .collectionGroup('registrations')
    .where('registrationNamesPurgeAt', '<=', Timestamp.now())
    .limit(200)
    .get();
  for (const reg of due.docs) {
    if (reg.get('accountDeleted') !== true) continue;
    const tickets = await reg.ref.collection('tickets').get();
    for (const ticket of tickets.docs) {
      await ticket.ref.update({ attendeeName: 'Former member', qrPayloadEncrypted: '' });
    }
    await reg.ref.update({
      ...scrubRegistrationNames(reg.data()),
      payerName: FieldValue.delete(),
      registrationNamesPurgeAt: FieldValue.delete(),
      personalDataPurgedAt: Timestamp.now(),
    });
  }
});
