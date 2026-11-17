import * as functionsV1 from 'firebase-functions/v1';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

/**
 * auth_onUserCreated — Firebase Auth onCreate trigger (tech design doc §3, step 4).
 *
 * Fires automatically the first time any account is created (phone OTP for members,
 * email/password for admins). Provisions the users/{uid} Firestore document with the
 * default role "member". Admin elevation happens separately via auth_setAdminRole.
 *
 * Uses the v1 auth trigger because firebase-functions v2 has no background Auth onCreate
 * event; the rest of the codebase remains on v2.
 */
export const auth_onUserCreated = functionsV1.auth.user().onCreate(async (user) => {
  const db = getFirestore();
  if ((await db.doc(`accountDeletionJobs/${user.uid}`).get()).exists) return;
  const now = Timestamp.now();

  const profile: Record<string, unknown> = {
    uid: user.uid,
    displayName: user.displayName ?? '',
    phone: user.phoneNumber ?? '',
    role: 'member',
    // TODO: no membership/renewal flow is defined in the docs yet. This is a minimal
    // placeholder (no active membership) that keeps the required shape valid; revisit
    // once a documented membership decision exists.
    membership: {
      id: user.uid,
      status: 'expired',
      expiresAt: now,
    },
    notificationPrefs: {
      announcements: true,
      eventReminders: true,
    },
    createdAt: now,
    updatedAt: now,
  };

  if (user.email) {
    profile.email = user.email;
  }
  if (user.photoURL) {
    profile.photoUrl = user.photoURL;
  }

  // merge: true so a rare double-fire never clobbers an existing profile.
  await db.doc(`users/${user.uid}`).set(profile, { merge: true });
});
