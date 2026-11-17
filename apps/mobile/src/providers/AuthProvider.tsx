import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { User } from '@sfvga/shared-types';
import { getFirebaseAuth, getFirestoreDb, paymentTestMode } from '@/services/firebase';
import { notificationService } from '@/services/notificationService';
import { ensureMemberProfile, signOutUser } from '@/services/authService';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const ensureAttemptedForUid = useRef<string | null>(null);
  const profileSeenForUid = useRef<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    let profileUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      // Tear down any previous profile listener before wiring a new one.
      profileUnsub?.();
      profileUnsub = null;

      setFirebaseUser(user);
      // Auth state is now resolved — protected navigation can proceed even while the
      // profile document is still streaming in (it may be created by the onCreate trigger
      // a moment after first sign-in, per tech design §3).
      setIsLoading(false);

      if (!user) {
        ensureAttemptedForUid.current = null;
        profileSeenForUid.current = null;
        setUserProfile(null);
        setIsProfileLoading(false);
        return;
      }

      setIsProfileLoading(true);
      const ref = doc(getFirestoreDb(), 'users', user.uid);
      profileUnsub = onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) {
            profileSeenForUid.current = user.uid;
            setUserProfile(snap.data() as User);
            setIsProfileLoading(false);
            return;
          }

          setUserProfile(null);
          setIsProfileLoading(false);

          // Primary path: auth_onUserCreated. Client ensure is an idempotent fallback
          // when the trigger is delayed or Functions are not yet deployed.
          if (
            ensureAttemptedForUid.current !== user.uid &&
            profileSeenForUid.current !== user.uid
          ) {
            ensureAttemptedForUid.current = user.uid;
            void ensureMemberProfile(user).catch(() => {
              // Allow a later snapshot / retry after a brief delay if create raced.
              ensureAttemptedForUid.current = null;
            });
          }
        },
        () => {
          setUserProfile(null);
          setIsProfileLoading(false);
        },
      );
    });

    return () => {
      profileUnsub?.();
      authUnsub();
    };
  }, []);

  const signOut = useCallback(async () => {
    const uid = firebaseUser?.uid;
    // The isolated demo never registers push tokens; browser token lookup can hang
    // without a service worker and must not block switching fictional accounts.
    if (uid && !paymentTestMode) {
      try {
        await notificationService.unregister(uid);
      } catch {
        // Push-token cleanup must never prevent the member from signing out.
      }
    }
    await signOutUser();
  }, [firebaseUser?.uid]);

  const value = useMemo(
    () => ({
      firebaseUser,
      userProfile,
      isLoading,
      isProfileLoading,
      isAuthenticated: !!firebaseUser,
      signOut,
    }),
    [firebaseUser, userProfile, isLoading, isProfileLoading, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
