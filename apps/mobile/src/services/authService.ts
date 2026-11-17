import {
  signInWithPhoneNumber,
  signOut,
  updateProfile,
  type ApplicationVerifier,
  type ConfirmationResult,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirestoreDb } from './firebase';
import { isValidUsPhone, toE164UsPhone } from '@/utils/phone';

export { isValidUsPhone, toE164UsPhone };

/**
 * Phone OTP auth for members/volunteers (architecture §5, tech design §3).
 *
 * The confirmation result from signInWithPhoneNumber can't be serialized through
 * navigation params, so it's held module-side between the Phone and OTP screens.
 */
let pendingConfirmation: ConfirmationResult | null = null;

/** Send an SMS OTP. `verifier` is the reCAPTCHA app verifier (RecaptchaVerifierModal). */
export async function sendPhoneOtp(
  e164PhoneNumber: string,
  verifier: ApplicationVerifier,
): Promise<void> {
  const auth = getFirebaseAuth();
  pendingConfirmation = await signInWithPhoneNumber(auth, e164PhoneNumber, verifier);
}

/** Confirm the 6-digit code. On success, onAuthStateChanged flips the app to signed-in. */
export async function confirmPhoneOtp(code: string): Promise<void> {
  if (!pendingConfirmation) {
    throw new Error('No verification in progress — please request a new code.');
  }
  await pendingConfirmation.confirm(code);
  pendingConfirmation = null;
}

export function hasPendingOtp(): boolean {
  return pendingConfirmation !== null;
}

export function clearPendingOtp(): void {
  pendingConfirmation = null;
}

/**
 * Ensure users/{uid} exists after first phone sign-in (tech design §3 step 4).
 *
 * Primary path is the auth_onUserCreated Cloud Function. This client write is an
 * idempotent fallback for when the trigger is delayed or not yet deployed — Firestore
 * rules only allow this create for a constrained member profile owned by the caller.
 */
export async function ensureMemberProfile(user: FirebaseUser): Promise<void> {
  const ref = doc(getFirestoreDb(), 'users', user.uid);
  const existing = await getDoc(ref);
  if (existing.exists()) return;

  const now = Timestamp.now();
  const profile: Record<string, unknown> = {
    uid: user.uid,
    displayName: '',
    phone: user.phoneNumber ?? '',
    role: 'member',
    membership: {
      id: user.uid,
      status: 'expired',
      expiresAt: now,
    },
    notificationPrefs: {
      announcements: true,
      eventReminders: true,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (user.email) profile.email = user.email;
  if (user.photoURL) profile.photoUrl = user.photoURL;

  try {
    // Create-only (no merge) so a race with auth_onUserCreated cannot attempt a
    // forbidden owner update of role/membership fields.
    await setDoc(ref, profile);
  } catch (error) {
    const again = await getDoc(ref);
    if (again.exists()) return;
    throw error;
  }
}

/** Complete the required first-login member name after phone verification. */
export async function completeMemberProfile(
  user: FirebaseUser,
  firstName: string,
  lastName: string,
  agreedToPolicies: boolean,
): Promise<void> {
  const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
  if (!displayName) throw new Error('Please enter your first and last name.');
  if (!agreedToPolicies) throw new Error('Please agree to the Terms of Use and Privacy Notice.');

  await ensureMemberProfile(user);
  await updateDoc(doc(getFirestoreDb(), 'users', user.uid), {
    displayName,
    legalAcceptance: {
      termsVersion: '2026-11-13',
      privacyVersion: '2026-11-13',
      acceptedAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });
  try {
    await updateProfile(user, { displayName });
  } catch {
    // Firestore is the account profile source of truth. A Firebase Auth display-name
    // sync failure must not make a successfully completed setup appear to fail.
  }
}

/** Sign the current user out and clear any in-flight verification. */
export async function signOutUser(): Promise<void> {
  pendingConfirmation = null;
  await signOut(getFirebaseAuth());
}
