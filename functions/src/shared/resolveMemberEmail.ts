import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Prefer the Firestore profile email, then fall back to Firebase Auth (e.g. linked Google).
 */
export function pickMemberEmail(
  profileEmail: unknown,
  authEmail: string | null | undefined,
): string | null {
  const fromProfile = typeof profileEmail === 'string' ? profileEmail.trim() : '';
  if (fromProfile.length > 0) return fromProfile;

  const fromAuth = typeof authEmail === 'string' ? authEmail.trim() : '';
  return fromAuth.length > 0 ? fromAuth : null;
}

/** Load the best email address on file for a member, if any. */
export async function resolveMemberEmail(userId: string): Promise<string | null> {
  const db = getFirestore();
  const userSnap = await db.doc(`users/${userId}`).get();
  const profileEmail = userSnap.data()?.email;

  try {
    const authUser = await getAuth().getUser(userId);
    return pickMemberEmail(profileEmail, authUser.email);
  } catch {
    return pickMemberEmail(profileEmail, null);
  }
}
